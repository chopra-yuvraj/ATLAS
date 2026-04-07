require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_BACKUP);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const systemPrompt = "Hello system";
        const text = "Hi model";
        
        const chat = model.startChat({
            history: [],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        });

        console.log("Sending message...");
        const result = await chat.sendMessage([
            { text: systemPrompt },
            { text: `Patient says: ${text}` },
        ]);

        console.log("Response:", result.response.text());
    } catch(err) {
        console.error("SDK Error:", err);
    }
}
testGemini();
