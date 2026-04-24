import { GoogleGenAI } from '@google/genai';

const APIKEY = 'AIzaSyAGsNrUqDHhNV02fmdFHd8Wj3BOjCuMynY';

async function test() {
  const ai = new GoogleGenAI({ apiKey: APIKEY });
  
  const models = [
    'text-embedding-004',
    'embedding-001',
    'gemini-embedding-001',
    'models/text-embedding-004',
    'models/embedding-001',
  ];

  for (const model of models) {
    try {
      const r = await ai.models.embedContent({ 
        model, 
        contents: [{ role: 'user', parts: [{ text: 'hello' }] }]
      });
      console.log(`✅ Model [${model}] OK - dims: ${r.embeddings?.[0]?.values?.length}`);
    } catch(e: any) { 
      console.log(`❌ Model [${model}]: ${e.message?.slice(0,60)}`);
    }
  }
}

test();
