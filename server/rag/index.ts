import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

import { parseMarkdownDocument } from './parser.js';
import { VectorIndex } from './indexer.js';
import { generateEmbedding } from './embedder.js';
import { generateAnswer, generateAnswerStream } from './generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', '..', 'chatbot_data.md');
const INDEX_FILE = path.join(__dirname, '..', '..', 'vector_index.json');
const AUTO_REBUILD_ON_START = process.env.RAG_AUTO_REBUILD_ON_START === 'true';
// Increased from 2 to 5 for much richer context
const MAX_RETRIEVED_CHUNKS = Math.max(1, Number.parseInt(process.env.RAG_RETRIEVAL_CHUNKS || '5', 10) || 5);

const vectorIndex = new VectorIndex();

// LRU-style bounded cache
const queryCache = new Map<string, string>();
const MAX_CACHE_SIZE = 500;

/**
 * Generates MD5 hash for cache keys
 */
const hashString = (str: string) => {
    return crypto.createHash('md5').update(str).digest('hex');
};

const buildCacheKey = (query: string, history: any[], mode: 'chat' | 'voice') => {
    const recent = history.slice(-4).map((h: any) => h?.parts?.[0]?.text || '').join('|');
    return hashString(`${mode}|${query.trim().toLowerCase()}|${recent}`);
};

/**
 * Arabic text normalization for query pre-processing.
 * Handles common variations in Arabic spelling, diacritics, and colloquial forms.
 */
const normalizeArabicQuery = (query: string): string => {
    let q = query.trim();

    // Normalize Alef variants
    q = q.replace(/[أإآا]/g, 'ا');
    // Normalize Ya variants (final ya)
    q = q.replace(/ى/g, 'ي');
    // Normalize Ta Marbuta
    q = q.replace(/ة/g, 'ه');
    // Remove diacritics (harakat)
    q = q.replace(/[\u064B-\u065F\u0670]/g, '');
    // Remove tatweel
    q = q.replace(/ـ/g, '');
    // Normalize multiple spaces
    q = q.replace(/\s+/g, ' ');

    return q.trim();
};

/**
 * Expand query with Arabic synonyms and common colloquial→formal mappings.
 * This dramatically improves recall for Egyptian colloquial questions.
 */
const expandArabicQuery = (query: string): string => {
    const synonymMap: Record<string, string[]> = {
        // Feasibility study synonyms
        'دراسة جدوى': ['جدوى اقتصادية', 'دراسة مشروع', 'تقييم مشروع'],
        'جدوى': ['دراسة جدوى', 'تقييم مشروع', 'جدوى اقتصادية'],
        'مشروع': ['مشروع استثماري', 'فكرة مشروع', 'استثمار'],
        // Services
        'استشارة': ['استشارات', 'مستشار', 'خدمة'],
        'تمويل': ['قرض', 'تمويل مشروع', 'برنامج تمويلي'],
        'تسويق': ['خطة تسويقية', 'بحث سوق', 'استشارات تسويقية'],
        // Contact
        'تواصل': ['اتصال', 'تواصل', 'تليفون', 'ايميل', 'رابط'],
        'سعر': ['تكلفة', 'سعر', 'أسعار', 'رسوم', 'فلوس', 'قديش', 'بكام'],
        'بكام': ['سعر', 'تكلفة', 'أسعار', 'رسوم'],
        'قديش': ['سعر', 'تكلفة', 'أسعار'],
        // Colloquial
        'عايز': ['أريد', 'أرغب', 'أحتاج'],
        'محتاج': ['أحتاج', 'أريد', 'أبحث عن'],
        'ازيكم': ['مرحبا', 'أهلا', 'تحية'],
        'ايه': ['ما', 'ماهو', 'ماهي'],
        'فين': ['أين', 'موقع', 'مكان'],
    };

    let expandedTerms: string[] = [query];
    const lowerQuery = query.toLowerCase();

    for (const [key, synonyms] of Object.entries(synonymMap)) {
        if (lowerQuery.includes(key.toLowerCase())) {
            expandedTerms = expandedTerms.concat(synonyms);
        }
    }

    // Return original + expansions joined (helps embedding capture broader semantics)
    return expandedTerms.slice(0, 4).join(' ');
};

/**
 * Initializes the RAG system by parsing document and generating/loading embeddings
 */
export const initRAG = async () => {
    console.log('🚀 Initializing RAG Pipeline...');

    const isLoaded = vectorIndex.loadFromFile(INDEX_FILE);
    if (isLoaded) {
        console.log(`✅ Loaded ${vectorIndex.getChunkCount()} chunks from vector_index.json`);
        return;
    }

    if (!AUTO_REBUILD_ON_START) {
        console.warn(
            '⚠️ vector_index.json is missing or invalid. Auto rebuild is disabled. ' +
            'Set RAG_AUTO_REBUILD_ON_START=true to rebuild once when needed.'
        );
        return;
    }

    console.log('🔨 vector_index.json not found. Parsing and embedding from scratch...');

    if (!fs.existsSync(DATA_FILE)) {
        console.warn(`⚠️ Target document not found at ${DATA_FILE}`);
        return;
    }

    const chunks = parseMarkdownDocument(DATA_FILE);
    console.log(`📄 Document parsed. Generated ${chunks.length} chunks.`);

    await vectorIndex.addChunks(chunks);
    vectorIndex.saveToFile(INDEX_FILE);

    console.log(`✅ Precomputed embeddings saved to vector_index.json. Loaded ${vectorIndex.getChunkCount()} chunks.`);
};

/**
 * Main function to answer user query using RAG.
 */
export const answerQueryWithRAG = async (query: string, history: any[] = [], mode: 'chat' | 'voice' = 'chat') => {
    // 1. Check cache
    const cacheKey = buildCacheKey(query, history, mode);
    if (queryCache.has(cacheKey)) {
        console.log('🔥 Cache hit for query:', query.slice(0, 50));
        return queryCache.get(cacheKey)!;
    }

    // 2. Normalize & Expand Query for better retrieval
    const normalizedQuery = normalizeArabicQuery(query);
    const expandedQuery = expandArabicQuery(normalizedQuery);

    console.log(`🔍 Embedding query: "${query.slice(0, 60)}"`);
    const queryEmbedding = await generateEmbedding(expandedQuery);

    // 3. Retrieve with expanded topK
    const retrievedChunks = vectorIndex.hybridSearch(normalizedQuery, queryEmbedding, MAX_RETRIEVED_CHUNKS);
    console.log(`📦 Retrieved ${retrievedChunks.length} chunks for generation.`);

    // 4. Generate Answer
    const answer = await generateAnswer(query, retrievedChunks, history, mode);

    // 5. Save to Cache (bounded)
    queryCache.set(cacheKey, answer);
    if (queryCache.size > MAX_CACHE_SIZE) {
        const firstKey = queryCache.keys().next().value;
        if (firstKey) queryCache.delete(firstKey);
    }

    return answer;
};

export const answerQueryWithRAGStream = async function* (
    query: string,
    history: any[] = [],
    mode: 'chat' | 'voice' = 'chat'
) {
    const cacheKey = buildCacheKey(query, history, mode);
    if (queryCache.has(cacheKey)) {
        const cached = queryCache.get(cacheKey)!;
        console.log('🔥 Cache hit for query:', query.slice(0, 50));
        yield cached;
        return;
    }

    const normalizedQuery = normalizeArabicQuery(query);
    const expandedQuery = expandArabicQuery(normalizedQuery);

    console.log(`🔍 Embedding query: "${query.slice(0, 60)}"`);
    const queryEmbedding = await generateEmbedding(expandedQuery);
    const retrievedChunks = vectorIndex.hybridSearch(normalizedQuery, queryEmbedding, MAX_RETRIEVED_CHUNKS);
    console.log(`📦 Retrieved ${retrievedChunks.length} chunks for streaming.`);

    let fullAnswer = '';
    for await (const piece of generateAnswerStream(query, retrievedChunks, history, mode)) {
        fullAnswer += piece;
        yield piece;
    }

    queryCache.set(cacheKey, fullAnswer);
    if (queryCache.size > MAX_CACHE_SIZE) {
        const firstKey = queryCache.keys().next().value;
        if (firstKey) queryCache.delete(firstKey);
    }
};

// Export to enable tests to inspect retrieval
export const testRetrieval = async (query: string) => {
    const normalized = normalizeArabicQuery(query);
    const expanded = expandArabicQuery(normalized);
    const queryEmbedding = await generateEmbedding(expanded);
    return vectorIndex.hybridSearch(normalized, queryEmbedding, 5);
};
