import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.CHATBOT_API_KEY });

const list = async () => {
  const rs = await ai.models.list();
  for await (const m of rs) {
     if (m.name.includes('embed')) console.log(m.name, m.supportedActions);
  }
}
list().catch(console.error);
