// src/app/api/patient-chat/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const ChatSchema = z.object({
    session_id: z.string().uuid(),
    text: z.string().min(1),
    input_method: z.enum(['speech', 'typed']).default('typed'),
    language_code: z.string().default('en-US'),
});

// Language display names for the system prompt
const LANGUAGE_NAMES: Record<string, string> = {
    'en-US': 'English', 'en-IN': 'English', 'hi-IN': 'Hindi',
    'bn-IN': 'Bengali', 'ta-IN': 'Tamil', 'te-IN': 'Telugu',
    'mr-IN': 'Marathi', 'gu-IN': 'Gujarati', 'kn-IN': 'Kannada',
    'ml-IN': 'Malayalam', 'pa-IN': 'Punjabi', 'ur-IN': 'Urdu',
};

function getSystemPrompt(languageCode: string, currentForm: Record<string, unknown>) {
    const langName = LANGUAGE_NAMES[languageCode] || 'English';
    const filledFields = Object.entries(currentForm)
        .filter(([, v]) => v !== null && v !== '' && v !== undefined)
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join('\n');

    return `You are a friendly, empathetic hospital intake assistant at ATLAS Hospital.
You are speaking with a patient in ${langName}. ALWAYS respond in ${langName}.

Your job is to collect the following patient information through natural conversation:
1. full_name - Patient's full name
2. age - Patient's age (number)
3. gender - male/female/other/prefer_not_to_say
4. symptoms - What symptoms they're experiencing (detailed)
5. allergies - Any known allergies
6. medications - Current medications they're taking
7. medical_history - Any past medical conditions or surgeries
8. pain_level - Pain level from 0-10
9. emergency_contact_name - Emergency contact person's name
10. emergency_contact_phone - Emergency contact phone number

ALREADY COLLECTED:
${filledFields || '  (none yet)'}

RULES:
- Ask about ONE field at a time in a warm, conversational way
- If the patient mentions information related to any field, extract it
- After the patient provides info, confirm it back to them
- When all fields are collected, say you'll now show a summary for them to verify
- Be patient and understanding — the patient may be in pain or distressed
- Use simple, clear language appropriate for a hospital setting
- NEVER ask for information that's already been collected unless the patient wants to correct it

IMPORTANT: After your response, include a JSON block wrapped in <extracted> tags containing any new fields extracted from the patient's latest message. Only include fields that were mentioned. Use English for the field values.

Example:
<extracted>{"symptoms": "severe headache and nausea", "pain_level": "7"}</extracted>

If no new fields were extracted, output:
<extracted>{}</extracted>`;
}

function initGemini() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_BACKUP;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
    return new GoogleGenerativeAI(apiKey);
}

export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient();
        const body = await request.json();

        const parsed = ChatSchema.safeParse(body);
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(', '), 400);
        }

        const { session_id, text, input_method, language_code } = parsed.data;

        // Verify session is active
        const { data: session, error: sessionErr } = await supabase
            .from('patient_sessions')
            .select('*, patient_intake_forms(*)')
            .eq('id', session_id)
            .eq('session_status', 'active')
            .single();

        if (sessionErr || !session) {
            return apiError('Session not found or expired.', 404);
        }

        // Get existing form data
        const form = session.patient_intake_forms?.[0] || {};

        // Get previous messages for context
        const { data: prevMessages } = await supabase
            .from('chat_messages')
            .select('sender, original_text, translated_text')
            .eq('session_id', session_id)
            .order('sequence_number', { ascending: true })
            .limit(20);

        // Get next sequence number
        const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session_id);

        const patientSeq = (count || 0) + 1;
        const aiSeq = patientSeq + 1;

        // Store patient message
        await supabase.from('chat_messages').insert({
            session_id,
            sender: 'patient',
            original_text: text,
            original_language: language_code,
            target_language: 'en-US',
            input_method,
            sequence_number: patientSeq,
        });

        // Build strictly alternating conversation history for Gemini
        const chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
        
        for (const m of prevMessages || []) {
            const role = m.sender === 'patient' ? 'user' : 'model';
            const text = m.original_text || m.translated_text || '';
            
            // Skip model messages if history is empty (must start with user)
            if (chatHistory.length === 0 && role === 'model') continue;
            
            // Collapse consecutive roles
            if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === role) {
                chatHistory[chatHistory.length - 1].parts[0].text += '\n' + text;
            } else {
                chatHistory.push({ role, parts: [{ text }] });
            }
        }
        
        // If history ends with 'user', we must remove it because chat.sendMessage() 
        // will automatically append another 'user' turn, which throws a 400 Alternation error.
        if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
            chatHistory.pop();
        }

        // Call Gemini
        const genAI = initGemini();
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const systemPrompt = getSystemPrompt(language_code, {
            full_name_english: form.full_name_english,
            full_name_regional: form.full_name_regional,
            age: form.age,
            gender: form.gender,
            symptoms_english: form.symptoms_english,
            allergies_english: form.allergies_english,
            medications_english: form.medications_english,
            medical_history_english: form.medical_history_english,
            pain_level: form.pain_level,
            emergency_contact_name: form.emergency_contact_name,
            emergency_contact_phone: form.emergency_contact_phone,
        });

        const chat = model.startChat({
            history: chatHistory,
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        });

        const result = await chat.sendMessage([
            { text: systemPrompt },
            { text: `Patient says: ${text}` },
        ]);

        const aiFullResponse = result.response.text();

        // Parse extracted fields
        let extractedFields: Record<string, string> = {};
        const extractedMatch = aiFullResponse.match(/<extracted>([\s\S]*?)<\/extracted>/);
        if (extractedMatch) {
            try {
                extractedFields = JSON.parse(extractedMatch[1]);
            } catch { /* ignore parse errors */ }
        }

        // Clean AI response (remove the extracted JSON block)
        const aiResponseText = aiFullResponse
            .replace(/<extracted>[\s\S]*?<\/extracted>/, '')
            .trim();

        // Store AI response
        await supabase.from('chat_messages').insert({
            session_id,
            sender: 'ai',
            original_text: aiResponseText,
            original_language: language_code,
            target_language: 'en-US',
            input_method: 'system',
            extracted_fields: Object.keys(extractedFields).length > 0 ? extractedFields : null,
            sequence_number: aiSeq,
        });

        // Update intake form with extracted fields
        if (Object.keys(extractedFields).length > 0) {
            const formUpdate: Record<string, unknown> = {};

            const fieldMapping: Record<string, { regional: string; english: string } | string> = {
                full_name: { regional: 'full_name_regional', english: 'full_name_english' },
                symptoms: { regional: 'symptoms_regional', english: 'symptoms_english' },
                allergies: { regional: 'allergies_regional', english: 'allergies_english' },
                medications: { regional: 'medications_regional', english: 'medications_english' },
                medical_history: { regional: 'medical_history_regional', english: 'medical_history_english' },
                age: 'age',
                gender: 'gender',
                pain_level: 'pain_level',
                emergency_contact_name: 'emergency_contact_name',
                emergency_contact_phone: 'emergency_contact_phone',
            };

            for (const [key, value] of Object.entries(extractedFields)) {
                const mapping = fieldMapping[key];
                if (!mapping) continue;

                if (typeof mapping === 'string') {
                    formUpdate[mapping] = key === 'age' ? parseInt(value) || null : value;
                } else {
                    // For text fields, store in both regional and English
                    formUpdate[mapping.english] = value;
                    // The original text from the patient serves as the regional version
                    if (language_code !== 'en-US' && language_code !== 'en-IN') {
                        formUpdate[mapping.regional] = text; // Use the patient's original message
                    }
                }
            }

            if (Object.keys(formUpdate).length > 0 && form.id) {
                await supabase
                    .from('patient_intake_forms')
                    .update(formUpdate)
                    .eq('id', form.id);
            }
        }

        // Get updated form
        const { data: updatedForm } = await supabase
            .from('patient_intake_forms')
            .select('*')
            .eq('session_id', session_id)
            .single();

        return apiSuccess({
            ai_response: aiResponseText,
            extracted_fields: extractedFields,
            form: updatedForm,
            sequence_number: aiSeq,
        });

    } catch (err: any) {
        console.error('[POST /api/patient-chat] Error:', err);
        return apiError(`Failed to process message: ${err.message || 'Unknown error'}`);
    }
}
