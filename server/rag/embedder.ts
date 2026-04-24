import { GoogleGenAI } from '@google/genai';

const getClient = () => {
  const GEMINI_API_KEY = process.env.CHATBOT_API_KEY || process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

export const generateEmbedding = async (text: string): Promise<number[]> => {
  const ai = getClient();
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text
    });
    return response.embeddings?.[0]?.values || [];
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
};

export const generateEmbeddingsBatch = async (texts: string[]): Promise<number[][]> => {
  // Simple serial fallback or if rate limits allow parallel
  const results: number[][] = [];
  for (const text of texts) {
     results.push(await generateEmbedding(text));
  }
  return results;
};
