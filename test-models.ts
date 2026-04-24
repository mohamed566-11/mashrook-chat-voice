import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BACKUP_KEY = "AIzaSyASxhDvAfZgGz6XPdD3iUDEzaznKAlaTO0";
const MODELS_TO_TEST = [
    'gemini-2.5-flash',
    'gemini-3.1-flash-lite-preview',
    'gemini-3-flash-preview'
];

async function runTest() {
    console.log('\n🧪 ═══════════════════════════════════════');
    console.log('      Gemini Model Connectivity Test');
    console.log('═══════════════════════════════════════\n');

    const ai = new GoogleGenAI({ apiKey: BACKUP_KEY });

    for (const modelName of MODELS_TO_TEST) {
        console.log(`📡 Testing Model: [${modelName}] ...`);
        
        try {
            const result = await ai.models.generateContent({
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: "أهلاً بك، رد بكلمة واحدة فقط لتأكيد الاتصال." }] }]
            });
            
            const text = result.text;
            console.log(`✅ Success! Response: "${text.trim()}"`);
        } catch (error: any) {
            console.error(`❌ Failed: ${error.message || 'Unknown error'}`);
        }
        console.log('------------------------------------------');
    }
}

runTest();
