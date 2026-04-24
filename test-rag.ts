import { initRAG, testRetrieval } from './server/rag/index.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const testQuestions = [
    "من هم شركاء التمويل؟",
    "كم عدد دراسات الجدوى في القطاع الصحي؟",
    "ما هي الفروع الدولية لشركة مشروعك؟",
    "ما هي طرق الدفع المقبولة؟",
    "هل تقوم الشركة ببناء منازل سكنية؟", // Expected: not in DB
    "ما هي أنواع الاستشارات التي تقدمونها؟",
];

const runTests = async () => {
    await initRAG();
    
    console.log('\n--- Running RAG Quality Checks ---\n');
    
    for (const question of testQuestions) {
        console.log(`\nQuestion: ${question}`);
        const chunks = await testRetrieval(question);
        
        console.log(`Retrieved ${chunks.length} chunks.`);
        chunks.forEach((c, idx) => {
            console.log(`  [${idx+1}] Section: ${c.section_title} | Score: (hidden by test script, check internal logs if needed)`);
        });
        
        if (chunks.length === 0) {
            console.warn(`  ⚠️ Failed to retrieve any chunks for: "${question}"`);
        }
    }
    
    console.log('\n--- Tests Completed ---');
};

runTests().catch(console.error);
