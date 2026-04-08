// src/app/api/patient-chat/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';
import { z } from 'zod';

const ChatSchema = z.object({
    session_id: z.string().uuid(),
    text: z.string().min(1),
    input_method: z.enum(['speech', 'typed']).default('typed'),
    language_code: z.string().default('en-US'),
});

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
You are speaking with a patient or their family member in ${langName}. ALWAYS respond in ${langName}.

Your TWO jobs:
JOB 1: Collect the following patient information through natural conversation:
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

JOB 2: Answer general hospital questions helpfully. You can answer questions about:
- Wait times (say "Wait times depend on urgency. Critical cases are seen first. Our triage system will prioritize you accordingly.")
- Where to go (say "Please stay in the waiting area. A nurse will call you when a doctor is ready.")
- What to expect (explain the triage process briefly)
- Food/water (say "There's a cafeteria on the ground floor. Please avoid eating if you might need surgery.")
- Parking, restrooms, visiting hours — give helpful general answers
- If a question is too medical/complex, say "That's a great question for your doctor or nurse. I'll make sure they know you'd like to discuss this."

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
- If a patient asks a question instead of answering, ANSWER THEIR QUESTION first, then gently redirect back to data collection

IMPORTANT: After your response, include a JSON block wrapped in <extracted> tags containing any new fields extracted from the patient's latest message. Only include fields that were mentioned. Use English for the field values.

Example:
<extracted>{"symptoms": "severe headache and nausea", "pain_level": "7"}</extracted>

If no new fields were extracted, output:
<extracted>{}</extracted>`;
}

// ─── AI Provider Abstraction ─────────────────────────────────
interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

async function callGroq(messages: ChatMessage[]): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not set');

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7,
            max_tokens: 1024,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
}

async function callGemini(messages: ChatMessage[]): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_BACKUP;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));

    const systemInstruction = messages.find(m => m.role === 'system')?.content ?? '';

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemInstruction }] },
                contents,
                generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
            }),
        }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─── Smart Fallback Engine (zero API dependency) ─────────────
// This is a conversational engine that:
// 1. Tracks what question was last asked
// 2. Accepts the patient's reply as the answer to that question
// 3. Handles general questions (wait times, directions, etc.)
// 4. Falls back to "ask the nurse" for complex medical questions

function callFallback(messages: ChatMessage[]): string {
    const systemMsg = messages.find(m => m.role === 'system')?.content ?? '';
    const userMsg = messages.filter(m => m.role === 'user').pop()?.content ?? '';
    const patientText = userMsg.replace('Patient says: ', '');
    const lower = patientText.toLowerCase().trim();

    // Find last assistant message to determine context
    const lastAssistant = messages.filter(m => m.role === 'assistant').pop()?.content ?? '';
    const lastAssistantLower = lastAssistant.toLowerCase();

    // Parse which fields are already collected from the system prompt
    const collectedFields = new Set<string>();
    const alreadySection = systemMsg.split('ALREADY COLLECTED:')[1]?.split('RULES:')[0] ?? '';
    for (const line of alreadySection.split('\n')) {
        const match = line.trim().match(/^- (\w+):/);
        if (match) collectedFields.add(match[1]);
    }

    // ── Step 1: Check if the patient is asking a QUESTION ──
    const questionResponse = handleGeneralQuestion(lower);
    if (questionResponse) {
        // Answer their question, then redirect back to data collection
        const nextQ = getNextQuestion(collectedFields);
        const redirect = nextQ ? `\n\nNow, back to your check-in — ${nextQ.question.toLowerCase()}` : '';
        return `${questionResponse}${redirect}\n\n<extracted>{}</extracted>`;
    }

    // ── Step 2: Context-aware extraction ──
    // Figure out what the bot JUST asked, and treat the patient's reply as that answer
    const extracted: Record<string, string> = {};
    const currentField = detectCurrentField(lastAssistantLower);

    // Context-aware: if the bot just asked about X, the patient's reply IS X
    if (currentField && !collectedFields.has(currentField)) {
        const value = extractContextual(currentField, patientText, lower);
        if (value) {
            const fieldKey = FIELD_TO_EXTRACT_KEY[currentField] ?? currentField;
            extracted[fieldKey] = value;
        }
    }

    // ── Step 3: Also do keyword extraction for bonus fields ──
    extractByKeywords(extracted, collectedFields, patientText, lower);

    // ── Step 4: Build response ──
    let response = '';

    if (Object.keys(extracted).length > 0) {
        const confirmParts = Object.entries(extracted)
            .map(([k, v]) => {
                const label = FIELD_LABELS[k] ?? k;
                return `**${label}**: ${v}`;
            })
            .join(', ');
        response += `Got it! I've noted ${confirmParts}. `;
    }

    // Merge all collected fields
    const allCollected = new Set([...collectedFields]);
    for (const key of Object.keys(extracted)) {
        const mapping: Record<string, string> = {
            full_name: 'full_name_english', symptoms: 'symptoms_english',
            allergies: 'allergies_english', medications: 'medications_english',
            medical_history: 'medical_history_english',
        };
        allCollected.add(mapping[key] ?? key);
    }

    const nextField = getNextQuestion(allCollected);

    if (nextField) {
        response += nextField.question;
    } else {
        response += "Great news — I've collected all the information I need! I'll now prepare a summary for you to verify. Thank you for your patience! 🙏";
    }

    const extractedJson = JSON.stringify(extracted);
    return `${response}\n\n<extracted>${extractedJson}</extracted>`;
}

// ── General question handler ──
function handleGeneralQuestion(lower: string): string | null {
    const patterns: [RegExp, string][] = [
        [/how long.*(wait|take|see|doctor)/i,
            "Wait times depend on the urgency of each case. Our triage system prioritizes critical patients first. I'll make sure you're seen as quickly as possible! 🏥"],
        [/where.*(go|sit|wait|stand)/i,
            "Please have a seat in the waiting area. A nurse will call your name when a doctor is ready to see you."],
        [/what.*(happen|expect|next|process)/i,
            "Here's what to expect: First, we'll collect your details (that's what I'm helping with now!). Then a triage nurse will assess your condition and assign a priority score. You'll be seen by a doctor based on that priority."],
        [/food|eat|drink|water|cafeteria|hungry|thirsty/i,
            "There's a cafeteria on the ground floor for food and drinks. However, if there's a chance you might need surgery, it's best to avoid eating or drinking until your doctor advises you. Water in small sips is usually okay."],
        [/bathroom|restroom|toilet|washroom/i,
            "Restrooms are located just down the hallway — look for the blue signs. If you need assistance, please let a nurse know."],
        [/parking|car|vehicle/i,
            "Hospital parking is available at the main entrance. If you need to move your vehicle, someone from your family can handle that while you complete the check-in."],
        [/visit.*hour|can.*family.*come|visitor/i,
            "Visiting hours are typically from 10 AM to 8 PM, but exceptions are made for emergencies. One family member can usually stay with the patient."],
        [/insurance|payment|cost|bill|charge/i,
            "Billing and insurance queries can be handled at the Front Desk after your consultation. Don't worry about that right now — let's focus on getting you the care you need."],
        [/medicine|prescription|pharmacy/i,
            "The hospital pharmacy is on the ground floor. Any prescribed medications will be available there after your consultation."],
        [/when.*doctor|see.*doctor|doctor.*come/i,
            "Your doctor will see you as soon as possible based on your priority level. Let's finish your check-in so the triage system can prioritize you! 🩺"],
        [/thank|thanks/i,
            "You're very welcome! I'm here to help. 😊"],
        [/help|what can you do/i,
            "I'm your hospital intake assistant! I can help you with: ✅ Checking in (filling in your medical details), ✅ Answering general questions about the hospital, and ✅ Letting you know what to expect. For specific medical advice, I'll connect you with a nurse or doctor."],
    ];

    for (const [pattern, answer] of patterns) {
        if (pattern.test(lower)) return answer;
    }

    // Complex medical questions → defer to nurse
    if (/\b(diagnos|treatment|prognos|surgery|operat|condition|disease|cure|medicine.*for)\b/i.test(lower) &&
        lower.includes('?')) {
        return "That's a really important question, and I want to make sure you get the best answer. I'd recommend asking your doctor or nurse directly — they'll be able to give you proper medical guidance. 👩‍⚕️";
    }

    return null;
}

// ── Detect which field the bot was just asking about ──
function detectCurrentField(lastBotMsg: string): string | null {
    if (!lastBotMsg) return 'full_name_english'; // First message → asking for name

    if (/name|who.*patient|full name/i.test(lastBotMsg)) return 'full_name_english';
    if (/how old|age|years old/i.test(lastBotMsg)) return 'age';
    if (/gender|male.*female/i.test(lastBotMsg)) return 'gender';
    if (/symptom|feeling|experiencing|what.*wrong|complaint|problem/i.test(lastBotMsg)) return 'symptoms_english';
    if (/pain.*level|scale.*0.*10|rate.*pain/i.test(lastBotMsg)) return 'pain_level';
    if (/allerg/i.test(lastBotMsg)) return 'allergies_english';
    if (/medication|medicine.*taking|taking.*med/i.test(lastBotMsg)) return 'medications_english';
    if (/medical history|past.*condition|surger/i.test(lastBotMsg)) return 'medical_history_english';
    if (/emergency.*contact.*name|contact.*person/i.test(lastBotMsg)) return 'emergency_contact_name';
    if (/phone|number.*contact|contact.*number/i.test(lastBotMsg)) return 'emergency_contact_phone';
    return null;
}

// Map internal field names to extraction keys
const FIELD_TO_EXTRACT_KEY: Record<string, string> = {
    full_name_english: 'full_name',
    symptoms_english: 'symptoms',
    allergies_english: 'allergies',
    medications_english: 'medications',
    medical_history_english: 'medical_history',
};

const FIELD_LABELS: Record<string, string> = {
    full_name: 'Name', age: 'Age', gender: 'Gender', symptoms: 'Symptoms',
    pain_level: 'Pain Level', allergies: 'Allergies', medications: 'Medications',
    medical_history: 'Medical History', emergency_contact_name: 'Emergency Contact',
    emergency_contact_phone: 'Contact Phone',
};

// Extract a value given context of what was asked
function extractContextual(field: string, raw: string, lower: string): string | null {
    const cleaned = raw.trim();
    if (!cleaned || cleaned.length < 1) return null;

    switch (field) {
        case 'full_name_english':
            // Remove common prefixes
            return cleaned.replace(/^(my name is |i am |i'm |it's |name:?\s*)/i, '').replace(/[.,!?]+$/, '').trim() || null;

        case 'age': {
            const m = cleaned.match(/(\d{1,3})/);
            return m ? m[1] : null;
        }

        case 'gender':
            if (/\b(male|man|boy|m)\b/i.test(lower)) return 'male';
            if (/\b(female|woman|girl|f)\b/i.test(lower)) return 'female';
            if (/\b(other|non.?binary|nb)\b/i.test(lower)) return 'other';
            if (/\b(prefer not|rather not|don't want)\b/i.test(lower)) return 'prefer_not_to_say';
            return null;

        case 'symptoms_english':
            // Accept ANY response as symptoms when the bot just asked about symptoms
            return cleaned.replace(/^(i have |i feel |i am |i'm |feeling |experiencing |it's |my )/i, '').trim() || cleaned;

        case 'pain_level': {
            const m = cleaned.match(/(\d{1,2})/);
            if (m && parseInt(m[1]) <= 10) return m[1];
            // Handle word-based pain levels
            if (/\bno\b|none|zero/i.test(lower)) return '0';
            if (/\bmild|slight|little/i.test(lower)) return '3';
            if (/\bmoderate|medium/i.test(lower)) return '5';
            if (/\bsevere|bad|lot|very/i.test(lower)) return '7';
            if (/\bextreme|worst|unbearable|excruciating/i.test(lower)) return '9';
            return null;
        }

        case 'allergies_english':
            if (/^(no|none|nope|nah|nothing|n\/a|na|nil)/i.test(lower)) return 'None';
            return cleaned.replace(/^(i am |i'm |allergic to |i have )/i, '').trim() || null;

        case 'medications_english':
            if (/^(no|none|nope|nah|nothing|n\/a|na|nil|not taking)/i.test(lower)) return 'None';
            return cleaned.replace(/^(i take |i am taking |i'm taking |currently |taking )/i, '').trim() || null;

        case 'medical_history_english':
            if (/^(no|none|nope|nah|nothing|n\/a|na|nil|no history)/i.test(lower)) return 'None';
            return cleaned.replace(/^(i had |i have |i've had |previously )/i, '').trim() || null;

        case 'emergency_contact_name':
            return cleaned.replace(/^(it's |it is |name is |my |their name is )/i, '').replace(/[.,!?]+$/, '').trim() || null;

        case 'emergency_contact_phone':
            const phone = cleaned.replace(/[^0-9+\-\s()]/g, '').trim();
            return phone.length >= 7 ? phone : null;

        default:
            return cleaned;
    }
}

// Keyword-based extraction as a bonus (catches info mentioned out of order)
function extractByKeywords(extracted: Record<string, string>, collected: Set<string>, raw: string, lower: string) {
    // Age
    if (!collected.has('age') && !extracted.age) {
        const m = raw.match(/(\d{1,3})\s*(?:years?\s*old|yrs?|y\.?o\.?)/i)
            || raw.match(/(?:age|i am|i'm)\s*:?\s*(\d{1,3})/i);
        if (m) extracted.age = m[1];
    }

    // Gender
    if (!collected.has('gender') && !extracted.gender) {
        if (/\b(male|man|boy)\b/i.test(lower)) extracted.gender = 'male';
        else if (/\b(female|woman|girl)\b/i.test(lower)) extracted.gender = 'female';
    }

    // Pain level (when mentioned alongside other info)
    if (!collected.has('pain_level') && !extracted.pain_level) {
        const m = raw.match(/(?:pain|level|scale|rate)\s*(?:is|:)?\s*(\d{1,2})(?:\/10)?/i);
        if (m && parseInt(m[1]) <= 10) extracted.pain_level = m[1];
    }
}

// Get the next question to ask
interface FieldQuestion { key: string; question: string; }

function getNextQuestion(collected: Set<string>): FieldQuestion | null {
    const fieldsToCollect: FieldQuestion[] = [
        { key: 'full_name_english', question: "Welcome to ATLAS Hospital! 👋 I'm your check-in assistant. I'll help you fill in the patient's details while you wait. Could you please tell me the patient's full name?" },
        { key: 'age', question: "Thank you! And how old is the patient?" },
        { key: 'gender', question: "Could you tell me the patient's gender? (Male / Female / Other / Prefer not to say)" },
        { key: 'symptoms_english', question: "What symptoms is the patient experiencing today? Please describe how they're feeling — anything you share helps the doctors prepare. 🩺" },
        { key: 'pain_level', question: "On a scale of 0 to 10, how would you rate the pain level? (0 = no pain, 10 = worst imaginable pain)" },
        { key: 'allergies_english', question: "Does the patient have any known allergies? (medications, food, or anything else — or say 'None')" },
        { key: 'medications_english', question: "Is the patient currently taking any medications? (or say 'None')" },
        { key: 'medical_history_english', question: "Any past medical conditions, surgeries, or hospitalizations we should know about? (or say 'None')" },
        { key: 'emergency_contact_name', question: "Almost done! Could you give me the name of an emergency contact person?" },
        { key: 'emergency_contact_phone', question: "And what's the phone number for the emergency contact?" },
    ];
    return fieldsToCollect.find(f => !collected.has(f.key)) ?? null;
}

// Try providers in order until one works
async function callAI(messages: ChatMessage[]): Promise<string> {
    const errors: string[] = [];

    if (process.env.GROQ_API_KEY) {
        try { return await callGroq(messages); }
        catch (e: any) { errors.push(`Groq: ${e.message}`); }
    }

    if (process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_BACKUP) {
        try { return await callGemini(messages); }
        catch (e: any) { errors.push(`Gemini: ${e.message}`); }
    }

    console.log('[patient-chat] Using built-in fallback. Previous errors:', errors.join('; '));
    return callFallback(messages);
}

// ─── Main Route ─────────────────────────────────────

export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient();
        const body = await request.json();

        const parsed = ChatSchema.safeParse(body);
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(', '), 400);
        }

        const { session_id, text, input_method, language_code } = parsed.data;

        const { data: session, error: sessionErr } = await supabase
            .from('patient_sessions')
            .select('*, patient_intake_forms(*)')
            .eq('id', session_id)
            .eq('session_status', 'active')
            .single();

        if (sessionErr || !session) {
            return apiError('Session not found or expired.', 404);
        }

        const form = session.patient_intake_forms?.[0] || {};

        const { data: prevMessages } = await supabase
            .from('chat_messages')
            .select('sender, original_text, translated_text')
            .eq('session_id', session_id)
            .order('sequence_number', { ascending: true })
            .limit(20);

        const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session_id);

        const patientSeq = (count || 0) + 1;
        const aiSeq = patientSeq + 1;

        await supabase.from('chat_messages').insert({
            session_id,
            sender: 'patient',
            original_text: text,
            original_language: language_code,
            target_language: 'en-US',
            input_method,
            sequence_number: patientSeq,
        });

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

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
        ];

        for (const m of prevMessages || []) {
            const role = m.sender === 'patient' ? 'user' : 'assistant';
            const msgText = m.original_text || m.translated_text || '';
            if (msgText) {
                messages.push({ role: role as 'user' | 'assistant', content: msgText });
            }
        }

        messages.push({ role: 'user', content: `Patient says: ${text}` });

        const aiFullResponse = await callAI(messages);

        let extractedFields: Record<string, string> = {};
        const extractedMatch = aiFullResponse.match(/<extracted>([\s\S]*?)<\/extracted>/);
        if (extractedMatch) {
            try { extractedFields = JSON.parse(extractedMatch[1]); }
            catch { /* ignore */ }
        }

        const aiResponseText = aiFullResponse.replace(/<extracted>[\s\S]*?<\/extracted>/, '').trim();

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
                    formUpdate[mapping.english] = value;
                    if (language_code !== 'en-US' && language_code !== 'en-IN') {
                        formUpdate[mapping.regional] = text;
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
