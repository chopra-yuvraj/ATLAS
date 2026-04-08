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

// ─── Deep System Prompt — The Brain of the Chatbot ──────────
function getSystemPrompt(languageCode: string, patientContext: string) {
    const langName = LANGUAGE_NAMES[languageCode] || 'English';
    const isEnglish = languageCode === 'en-US' || languageCode === 'en-IN';

    return `You are ATLAS, a deeply caring and knowledgeable hospital companion. You are NOT a robot, NOT a help menu, NOT a signboard. You are the equivalent of a warm, experienced nurse who sits beside a patient, knows their full medical file, and speaks to them like a human being.

LANGUAGE: Reply ONLY in ${langName}${isEnglish ? '' : ` (${langName} script only)`}. Never switch languages.

THIS IS THE PATIENT YOU ARE TALKING TO RIGHT NOW:
${patientContext}

YOUR JOB — Be genuinely useful, not generic:

1. PERSONALIZE EVERYTHING: You have this patient's full file above. USE IT. If Priya came in with chest pain and has been waiting 45 minutes, don't say "wait times vary" — say "Priya, I know you've been here about 45 minutes with that chest pain. With your priority level, the team is working to get you in as soon as they can."

2. HELP THEM UNDERSTAND THEIR CONDITION: You are allowed to explain what their condition generally involves. If someone came in with "acute appendicitis", explain what that means in simple terms — "It means your appendix is inflamed and likely needs attention quickly, which is exactly why you've been given a high priority." You are NOT diagnosing — you are explaining what the nurse already documented. Always add "your doctor will confirm everything and explain the specific treatment plan for you."

3. EXPLAIN THEIR TRIAGE: If they ask why they're waiting or what their priority means, use the actual triage data. If their pain index is 7/10, say "I can see you're in quite a bit of pain — the team has noted that and it's factored into your priority." If their severity is "moderate", help them understand: "Your case is marked as moderate priority, which means you'll be seen after the critical and urgent patients, but you're definitely in the queue."

4. CONTEXTUAL AWARENESS: 
   - If they have allergies, proactively mention it when relevant: "By the way, I see you have a noted allergy to penicillin — the team is already aware of that."
   - If a doctor is assigned, tell them: "Dr. [name] has been assigned to your case."
   - If a bed is assigned, tell them: "You've been assigned to bed [label]."
   - If they're in_treatment, be encouraging: "Great news — you're being seen right now!"
   - If they've been waiting long, be empathetic, not dismissive.

5. ANSWER PRACTICAL QUESTIONS:
   - Hospital layout: Pharmacy and cafeteria are on the ground floor. Restrooms are down the hallway (follow blue signs). Parking at the main entrance. Children's play area near the main waiting room.
   - Visiting hours: 10 AM to 8 PM, one family member can stay with the patient.
   - Insurance/billing: Handled at Front Desk after consultation.
   - Children: There's a children's area near the waiting room. Family members can watch them there.
   - What to expect next: Explain the flow based on their status (waiting → getting called → examination → treatment → discharge).

6. HANDLE EMOTIONS:
   - If they seem scared, anxious, frustrated, or in pain — ALWAYS acknowledge the feeling FIRST, then give information.
   - Never be dismissive. Never say "please be patient." Instead: "I completely understand your frustration. 45 minutes feels like forever when you're not feeling well."

7. MEDICAL GUARDRAILS:
   - You can explain their documented condition in simple terms, explain what triage means, explain their priority level, and discuss what typically happens with their type of case.
   - You CANNOT diagnose, prescribe, change treatment plans, or give specific medical advice.
   - For specific treatment questions: "That's exactly the kind of question your doctor will answer — and they'll have your full test results too. I'll make a note that you're wondering about this."

8. NEVER reveal their exact queue rank number or position. You can use vague terms like "you should be seen soon" or "there are a few patients being seen before you."

FORMATTING RULES:
- NEVER use emojis — your responses are read aloud by text-to-speech
- NEVER use bullet points, numbered lists, or markdown formatting
- Write in plain, flowing conversational sentences only
- Keep responses to 2-4 sentences. Be concise but warm.
- Use contractions and casual language. "Don't worry" not "Do not worry."
- Use the patient's first name naturally (not in every response, but regularly).

TONE: You are the one friendly face in a stressful hospital visit. Be the person they remember kindly.`;
}

// ─── Build DEEP patient context from ALL available data ──────
async function buildPatientContext(supabase: any, patientId: string): Promise<string> {
    // 1. Patient record
    const { data: patient } = await supabase
        .from('patients')
        .select('full_name, date_of_birth, gender, chief_complaint, allergies, status, arrived_at, notes, assigned_bed_id, assigned_doctor_id, treatment_started_at, phone, emergency_contact')
        .eq('id', patientId)
        .single();

    if (!patient) return 'No patient data available.';

    // 2. Triage scores — the full picture
    const { data: triageScore } = await supabase
        .from('triage_scores')
        .select('acuity, vulnerability, pain_index, resource_consumption, contagion_risk, behavioral_risk, deterioration_rate, s_final, scored_at')
        .eq('patient_id', patientId)
        .order('scored_at', { ascending: false })
        .limit(1)
        .single();

    // 3. Queue data — wait time + severity tier
    const { data: queueEntry } = await supabase
        .from('active_queue')
        .select('wait_minutes, severity_tier, queue_rank')
        .eq('patient_id', patientId)
        .single();

    // 4. Intake form — symptoms, meds, medical history, allergies in detail
    const { data: intakeForm } = await supabase
        .from('patient_intake_forms')
        .select('symptoms_english, symptoms_regional, allergies_english, medications_english, medical_history_english, pain_level, emergency_contact_name, emergency_contact_phone')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    // 5. Bed info
    let bedLabel = null;
    if (patient.assigned_bed_id) {
        const { data: bed } = await supabase
            .from('beds')
            .select('label, ward, bed_type')
            .eq('id', patient.assigned_bed_id)
            .single();
        if (bed) bedLabel = `${bed.label} (${bed.ward}, ${bed.bed_type})`;
    }

    // 6. Assigned doctor
    let doctorInfo = null;
    if (patient.assigned_doctor_id) {
        const { data: assignment } = await supabase
            .from('patient_assignments')
            .select('assignment_reason, doctor_profiles(specialization, consultation_room, staff(full_name))')
            .eq('patient_id', patientId)
            .eq('is_active', true)
            .limit(1)
            .single();
        if (assignment?.doctor_profiles) {
            const dp = assignment.doctor_profiles as any;
            doctorInfo = {
                name: dp.staff?.full_name || 'Unknown',
                specialization: dp.specialization,
                room: dp.consultation_room,
                reason: assignment.assignment_reason,
            };
        }
    }

    // 7. Referral status if any
    const { data: referral } = await supabase
        .from('patient_referrals')
        .select('reason, urgency, status, to_hospital:hospital_network!patient_referrals_to_hospital_id_fkey(name, city)')
        .eq('patient_id', patientId)
        .in('status', ['pending', 'accepted', 'in_transit'])
        .limit(1)
        .single();

    // Calculate age
    const age = patient.date_of_birth
        ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

    // Calculate wait time in human terms
    const waitMins = queueEntry?.wait_minutes || 0;

    // Build the context
    const sections: string[] = [];

    // Identity
    sections.push(`PATIENT: ${patient.full_name}, ${age ? `${age} years old` : 'age unknown'}, ${patient.gender || 'gender not specified'}`);

    // Arrival & status
    const arrivedTime = patient.arrived_at ? new Date(patient.arrived_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'unknown';
    sections.push(`ARRIVED: ${arrivedTime} | STATUS: ${patient.status} | WAITING: ${waitMins} minutes`);

    // Chief complaint & symptoms
    sections.push(`CHIEF COMPLAINT: ${patient.chief_complaint || 'Not recorded'}`);
    if (intakeForm?.symptoms_english) sections.push(`DETAILED SYMPTOMS: ${intakeForm.symptoms_english}`);

    // Medical context
    if (patient.allergies?.length) sections.push(`ALLERGIES: ${patient.allergies.join(', ')}`);
    else if (intakeForm?.allergies_english) sections.push(`ALLERGIES: ${intakeForm.allergies_english}`);
    if (intakeForm?.medications_english) sections.push(`CURRENT MEDICATIONS: ${intakeForm.medications_english}`);
    if (intakeForm?.medical_history_english) sections.push(`MEDICAL HISTORY: ${intakeForm.medical_history_english}`);

    // Triage assessment
    if (queueEntry?.severity_tier) sections.push(`SEVERITY TIER: ${queueEntry.severity_tier}`);
    if (triageScore) {
        sections.push(`TRIAGE SCORES: Acuity=${triageScore.acuity}/5, Pain=${triageScore.pain_index}/10, Vulnerability=${triageScore.vulnerability}/10, Deterioration Risk=${triageScore.deterioration_rate}/10, Contagion Risk=${triageScore.contagion_risk}/10`);
    }
    if (intakeForm?.pain_level) sections.push(`SELF-REPORTED PAIN: ${intakeForm.pain_level}`);

    // Assignments
    if (doctorInfo) {
        sections.push(`ASSIGNED DOCTOR: Dr. ${doctorInfo.name} (${doctorInfo.specialization})${doctorInfo.room ? `, Room: ${doctorInfo.room}` : ''}`);
    }
    if (bedLabel) sections.push(`ASSIGNED BED: ${bedLabel}`);

    // Referral
    if (referral) {
        const toHosp = (referral.to_hospital as any);
        sections.push(`REFERRAL: ${referral.status} — ${referral.reason}${toHosp ? ` to ${toHosp.name} (${toHosp.city})` : ''}`);
    }

    // Nurse notes
    if (patient.notes) sections.push(`NURSE NOTES: ${patient.notes}`);

    // Treatment timeline
    if (patient.treatment_started_at) {
        const treatmentTime = new Date(patient.treatment_started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        sections.push(`TREATMENT STARTED: ${treatmentTime}`);
    }

    return sections.join('\n');
}

// ─── AI Provider Abstraction ─────────────────────────────────
interface ChatMsg {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

async function callGemini(messages: ChatMsg[]): Promise<string> {
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
                generationConfig: { temperature: 0.8, maxOutputTokens: 300 },
            }),
        }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callGroq(messages: ChatMsg[]): Promise<string> {
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
            temperature: 0.8,
            max_tokens: 300,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
}

// Every message goes through AI — no more signboard fallback
async function callAI(messages: ChatMsg[]): Promise<string> {
    const errors: string[] = [];

    if (process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_BACKUP) {
        try { return await callGemini(messages); }
        catch (e: any) { errors.push(e.message); }
    }

    if (process.env.GROQ_API_KEY) {
        try { return await callGroq(messages); }
        catch (e: any) { errors.push(e.message); }
    }

    console.error('[patient-chat] All AI providers failed:', errors);
    // Graceful degradation — still human, not a canned response
    return "I'm having a little trouble connecting right now, but don't worry — I'm still here. Can you try asking me again in a moment? If it's urgent, please speak to the nurse at the front station.";
}

// ─── Main Route ──────────────────────────────────────────────
export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient();
        const body = await request.json();

        const parsed = ChatSchema.safeParse(body);
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(', '), 400);
        }

        const { session_id, text, input_method, language_code } = parsed.data;

        // Verify session
        const { data: session } = await supabase
            .from('patient_sessions')
            .select('id, patient_id, session_status')
            .eq('id', session_id)
            .eq('session_status', 'active')
            .single();

        if (!session) {
            return apiError('Session not found or expired.', 404);
        }

        // Build DEEP patient context — every data point we have
        const patientContext = await buildPatientContext(supabase, session.patient_id);

        // Get last 8 messages for conversational continuity
        const { data: prevMessages } = await supabase
            .from('chat_messages')
            .select('sender, original_text')
            .eq('session_id', session_id)
            .order('sequence_number', { ascending: false })
            .limit(8);

        // Sequence counting
        const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session_id);

        const patientSeq = (count || 0) + 1;
        const aiSeq = patientSeq + 1;

        // Save patient message
        await supabase.from('chat_messages').insert({
            session_id,
            sender: 'patient',
            original_text: text,
            original_language: language_code,
            target_language: language_code,
            input_method,
            sequence_number: patientSeq,
        });

        // Build AI conversation
        const messages: ChatMsg[] = [
            { role: 'system', content: getSystemPrompt(language_code, patientContext) },
        ];

        // History in chronological order
        const history = (prevMessages || []).reverse();
        for (const m of history) {
            if (m.original_text) {
                messages.push({
                    role: m.sender === 'patient' ? 'user' : 'assistant',
                    content: m.original_text,
                });
            }
        }

        messages.push({ role: 'user', content: text });

        // Call AI — always
        const aiResponse = await callAI(messages);
        const cleanResponse = aiResponse.replace(/<[^>]*>/g, '').trim();

        // Save AI response
        await supabase.from('chat_messages').insert({
            session_id,
            sender: 'ai',
            original_text: cleanResponse,
            original_language: language_code,
            target_language: language_code,
            input_method: 'system',
            sequence_number: aiSeq,
        });

        return apiSuccess({
            ai_response: cleanResponse,
            sequence_number: aiSeq,
        });

    } catch (err: any) {
        console.error('[POST /api/patient-chat] Error:', err);
        return apiError(`Failed to process: ${err.message || 'Unknown error'}`);
    }
}
