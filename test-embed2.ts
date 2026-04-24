import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'AIzaSyAGsNrUqDHhNV02fmdFHd8Wj3BOjCuMynY' });

async function test() {
  const model = 'gemini-embedding-001';

  const formats = [
    { name: 'contents: text', payload: { model, contents: 'hello' } },
    { name: 'contents: [text]', payload: { model, contents: ['hello'] } },
    { name: 'content: text', payload: { model, content: 'hello' } },
    { name: 'content: { parts: [{text}] }', payload: { model, content: { parts: [{text: 'hello'}]} } },
    { name: 'contents: [{ parts: [{text}] }]', payload: { model, contents: [{ parts: [{text: 'hello'}]}] } }
  ];

  for (const fmt of formats) {
    try {
      const r = await ai.models.embedContent(fmt.payload as any);
      console.log(`✅ ${fmt.name} - OK (Dims: ${r.embeddings?.[0]?.values?.length})`);
    } catch(e: any) {
      console.log(`❌ ${fmt.name} - ERR: ${e.message.slice(0, 100)}`);
    }
  }
}

test();
