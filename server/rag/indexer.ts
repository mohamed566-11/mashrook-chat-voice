import fs from 'fs';
import path from 'path';
import { ChunkMetadata } from './parser.js';
import { generateEmbedding } from './embedder.js';
import Fuse, { type IFuseOptions } from 'fuse.js';
import * as mathjs from 'mathjs';

export interface IndexedChunk extends ChunkMetadata {
  embedding: number[];
}

export class VectorIndex {
  private chunks: IndexedChunk[] = [];
  private fuseIndex: Fuse<IndexedChunk>;

  constructor() {
    this.fuseIndex = new Fuse(this.chunks, this.getFuseOptions());
  }

  private getFuseOptions(): IFuseOptions<IndexedChunk> {
    return {
      // Search across text content AND metadata
      keys: [
        { name: 'chunk_text', weight: 0.6 },
        { name: 'section_title', weight: 0.25 },
        { name: 'parent_section', weight: 0.15 },
      ],
      includeScore: true,
      // More permissive threshold for Arabic fuzzy matching
      threshold: 0.5,
      // Consider character-level distance for Arabic
      distance: 150,
      minMatchCharLength: 2,
      // Use extended search for better Arabic handling
      useExtendedSearch: false,
      ignoreLocation: true,
      findAllMatches: true,
    };
  }

  public async addChunks(chunks: ChunkMetadata[]) {
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.chunk_text.trim().length === 0) continue;
        
        console.log(`Generating embedding for chunk ${i+1}/${chunks.length}...`);
        const embedding = await generateEmbedding(chunk.chunk_text);
        
        if (embedding.length > 0) {
            this.chunks.push({
                ...chunk,
                embedding
            });
        }
    }
    
    this.refreshKeywordIndex();
  }

  private refreshKeywordIndex() {
    this.fuseIndex = new Fuse(this.chunks, this.getFuseOptions());
  }

  public loadFromFile(filePath: string): boolean {
    try {
        if (!fs.existsSync(filePath)) return false;

        const stat = fs.statSync(filePath);
        // Reject obviously empty/corrupt files (< 1 KB)
        if (stat.size < 1024) {
            console.warn('⚠️ vector_index.json is too small — likely corrupt. Skipping load.');
            return false;
        }

        const data = fs.readFileSync(filePath, 'utf-8');
        const loadedChunks = JSON.parse(data) as IndexedChunk[];

        if (
            loadedChunks &&
            Array.isArray(loadedChunks) &&
            loadedChunks.length > 0 &&
            // Validate that at least the first chunk has a real embedding
            Array.isArray(loadedChunks[0]?.embedding) &&
            loadedChunks[0].embedding.length > 0
        ) {
            this.chunks = loadedChunks;
            this.refreshKeywordIndex();
            return true;
        }

        console.warn('⚠️ vector_index.json failed validation (empty or malformed). Skipping load.');
    } catch (error) {
        console.error('❌ Error loading index:', error);
    }
    return false;
  }

  public saveToFile(filePath: string) {
    // Atomic write: write to temp file first, then rename
    // This prevents corrupt reads if the process is killed mid-write
    const tmpPath = filePath + '.tmp';
    try {
        fs.writeFileSync(tmpPath, JSON.stringify(this.chunks, null, 2), 'utf-8');
        fs.renameSync(tmpPath, filePath);
        console.log(`💾 vector_index.json saved atomically (${this.chunks.length} chunks).`);
    } catch (err) {
        console.error('❌ Failed to save vector_index.json:', err);
        // Cleanup temp file if rename failed
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
  }

  /**
   * Enhanced hybrid search combining semantic (cosine) + keyword (Fuse.js) + section boost.
   * Alpha/Beta weights tuned for Arabic RAG use case.
   */
  public hybridSearch(query: string, queryEmbedding: number[], topK: number = 5): IndexedChunk[] {
      if (this.chunks.length === 0) return [];

      // 1. Semantic Search via cosine similarity
      const semanticResults = this.chunks.map(chunk => {
          let score = 0;
          if (queryEmbedding.length > 0 && chunk.embedding.length > 0) {
              const dotProduct = mathjs.dot(queryEmbedding, chunk.embedding) as number;
              const normQuery = mathjs.norm(queryEmbedding) as number;
              const normChunk = mathjs.norm(chunk.embedding) as number;
              if (normQuery > 0 && normChunk > 0) {
                  score = dotProduct / (normQuery * normChunk);
              }
          }
          return { chunk, score };
      });

      // 2. Keyword Search via Fuse.js (fuzzy)
      const keywordResults = this.fuseIndex.search(query);
      const keywordScoreMap = new Map<string, number>();
      
      keywordResults.forEach(res => {
          // Fuse.js: closer to 0 = better match. Normalize to [0,1] where 1 = best.
          const normScore = res.score !== undefined ? Math.max(0, 1 - res.score) : 0;
          keywordScoreMap.set(res.item.chunk_id, normScore);
      });

      // 3. Combine with weighted hybrid scoring
      // Semantic carries 65%, keyword 35% — balanced for Arabic content
      const alpha = 0.65; // semantic weight
      const beta = 0.35;  // keyword weight

      const scored = semanticResults.map(res => {
          const keyScore = keywordScoreMap.get(res.chunk.chunk_id) || 0;
          const hybridScore = (res.score * alpha) + (keyScore * beta);
          return { chunk: res.chunk, score: hybridScore };
      });

      // 4. Sort by hybrid score descending
      scored.sort((a, b) => b.score - a.score);

      // 5. Apply diversity filter — avoid returning chunks from same section repeatedly
      const selected: typeof scored = [];
      const sectionCount: Record<string, number> = {};
      const MAX_PER_SECTION = 2;

      for (const item of scored) {
          const section = item.chunk.parent_section;
          const count = sectionCount[section] || 0;
          if (count < MAX_PER_SECTION) {
              selected.push(item);
              sectionCount[section] = count + 1;
          }
          if (selected.length >= topK) break;
      }

      // If diversity filter leaves us short, fill from remaining
      if (selected.length < topK) {
          for (const item of scored) {
              if (!selected.includes(item)) {
                  selected.push(item);
              }
              if (selected.length >= topK) break;
          }
      }

      // Filter out very low-scoring chunks (noise reduction)
      const MIN_SCORE_THRESHOLD = 0.1;
      return selected
          .filter(r => r.score >= MIN_SCORE_THRESHOLD)
          .slice(0, topK)
          .map(res => res.chunk);
  }

  public getChunkCount(): number {
      return this.chunks.length;
  }
}
