/**
 * rebuild-index.ts
 * ─────────────────────────────────────────────────────
 * Run this script MANUALLY whenever chatbot_data.md is updated.
 * This rebuilds vector_index.json from scratch.
 *
 * Usage:
 *   npx tsx rebuild-index.ts
 *
 * DO NOT run this on every server start (use RAG_AUTO_REBUILD_ON_START=false).
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

import { parseMarkdownDocument } from './server/rag/parser.js';
import { VectorIndex } from './server/rag/indexer.js';

const DATA_FILE = path.join(__dirname, 'chatbot_data.md');
const INDEX_FILE = path.join(__dirname, 'vector_index.json');

async function rebuild() {
    console.log('\n🔨 ═══════════════════════════════════════');
    console.log('   Mashroo3k RAG Index Rebuilder');
    console.log('═══════════════════════════════════════\n');

    if (!fs.existsSync(DATA_FILE)) {
        console.error(`❌ chatbot_data.md not found at: ${DATA_FILE}`);
        process.exit(1);
    }

    if (!process.env.CHATBOT_API_KEY && !process.env.GEMINI_API_KEY) {
        console.error('❌ No API key found. Set CHATBOT_API_KEY or GEMINI_API_KEY in .env');
        process.exit(1);
    }

    // Backup existing index before overwriting
    if (fs.existsSync(INDEX_FILE)) {
        const backupPath = INDEX_FILE + '.bak';
        fs.copyFileSync(INDEX_FILE, backupPath);
        console.log(`📦 Backed up existing index → vector_index.json.bak`);
    }

    console.log(`📄 Parsing: ${path.basename(DATA_FILE)}`);
    const chunks = parseMarkdownDocument(DATA_FILE);
    console.log(`✅ Generated ${chunks.length} chunks from document.\n`);

    const vectorIndex = new VectorIndex();
    console.log('🔗 Generating embeddings (this may take 1-2 minutes)...\n');

    const startTime = Date.now();
    await vectorIndex.addChunks(chunks);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    vectorIndex.saveToFile(INDEX_FILE);

    console.log(`\n✅ Done in ${elapsed}s — ${vectorIndex.getChunkCount()} chunks saved to vector_index.json`);
    console.log('🚀 Restart your server to use the new index.\n');
}

rebuild().catch((err) => {
    console.error('❌ Rebuild failed:', err);
    process.exit(1);
});
