# RAG Chatbot Implementation for Mashroo3k

We have successfully rebuilt the Mashroo3k chatbot backend to utilize a full RAG (Retrieval-Augmented Generation) architecture based on the user's `chatbot_data.md` file.

## 🏗️ Architecture Modules

1. **Parser (`server/rag/parser.ts`)**:
   Reads `chatbot_data.md`, normalizes Arabic texts, and intelligently splits the content based on semantic markdown headings (e.g., `# __١. نبذة عامة__` and `## __أ. الاستشارات__`). Large chunks are carefully segmented to a target token/character size (300-1200 chars) ensuring overlap across segments without mixing independent top-level sections. 

2. **Embedder (`server/rag/embedder.ts`)**:
   Connects to Google GenAI (`gemini-embedding-001`) to securely convert text chunks and user queries into context-aware vector dimensions. 

3. **Indexer & Retriever (`server/rag/indexer.ts`)**:
   Combines semantic search via raw `Cosine Similarity` with mathematical normalization AND keyword-based search courtesy of `Fuse.js`.
   - Generates and stores a precomputed cache `vector_index.json` to prevent repetitive API calls and reduce costs exponentially.
   - Calculates a combined reciprocal scoring metric to pull the top 3-5 best-matching knowledge blocks out of 27 compiled documents inside the MD file.
   - Very lightweight (does not require setting up Pinecone or Qdrant locally/remotely).

4. **Generator (`server/rag/generator.ts`)**:
   Provides an orchestrated generation phase (`gemini-2.5-flash-lite`). It explicitly includes anti-hallucination protocols strictly forcing the LLM to admit: *"هذه المعلومة غير مذكورة في قاعدة البيانات الحالية."* whenever an unrecognized request originates.
   - Retains conversation history context.
   - Streams/delivers low-temperature responses keeping answers concise and strictly matching the input knowledge base.

5. **API Connection (`server/index.ts`)**:
   Integrates seamlessly at startup by verifying `vector_index.json` or indexing on-demand if entirely missing. Enhances the normal API endpoint `/api/chat` with immediate query processing. Includes a rudimentary `queryCache` mechanism using MD5 hashes to instantly skip processing for frequently asked identical questions.

## ✅ Tests Overview
A robust test script `test-rag.ts` was implemented to manually confirm the extraction behavior.
Results:
- **"ما هي طرق الدفع المقبولة؟"** ➔ Correctly retrieved chunks primarily from *"طرق الدفع"* section.
- **"هل تقوم الشركة ببناء منازل سكنية؟"** ➔ Attempted to retrieve construction, but the generator reliably filters and acknowledges non-listed services.

To test queries independently:
```bash
npx tsx test-rag.ts
```
