// src/app/api/patient-chat/submit/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';
import { z } from 'zod';

const SubmitSchema = z.object({
    session_id: z.string().uuid(),
    form_id: z.string().uuid(),
    verification_method: z.enum(['verbal', 'on_screen', 'staff_assisted']).default('on_screen'),
});

export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient();
        const body = await request.json();

        const parsed = SubmitSchema.safeParse(body);
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(', '), 400);
        }

        const { session_id, form_id, verification_method } = parsed.data;

        // Verify session
        const { data: session } = await supabase
            .from('patient_sessions')
            .select('*')
            .eq('id', session_id)
            .single();

        if (!session) {
            return apiError('Session not found.', 404);
        }

        // Get the form
        const { data: form, error: formErr } = await supabase
            .from('patient_intake_forms')
            .select('*')
            .eq('id', form_id)
            .single();

        if (formErr || !form) {
            return apiError('Intake form not found.', 404);
        }

        // Update form status to submitted
        const { error: updateErr } = await supabase
            .from('patient_intake_forms')
            .update({
                form_status: 'submitted',
                patient_verified: true,
                verification_method,
                verified_at: new Date().toISOString(),
            })
            .eq('id', form_id);

        if (updateErr) {
            return apiError('Failed to submit form.', 500);
        }

        // Update patient record with intake form reference and language preference
        await supabase
            .from('patients')
            .update({
                intake_form_id: form_id,
                language_preference: session.language_code,
                // Also update clinical fields from the intake form
                ...(form.symptoms_english ? { chief_complaint: form.symptoms_english } : {}),
                ...(form.allergies_english ? { allergies: [form.allergies_english] } : {}),
                ...(form.emergency_contact_name ? {
                    emergency_contact: `${form.emergency_contact_name}${form.emergency_contact_phone ? ` - ${form.emergency_contact_phone}` : ''}`
                } : {}),
            })
            .eq('id', session.patient_id);

        // End the session
        await supabase
            .from('patient_sessions')
            .update({
                session_status: 'completed',
                ended_at: new Date().toISOString(),
            })
            .eq('id', session_id);

        // Store a system message recording the submission
        const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session_id);

        await supabase.from('chat_messages').insert({
            session_id,
            sender: 'system',
            original_text: 'Patient verified and submitted the intake form.',
            input_method: 'system',
            sequence_number: (count || 0) + 1,
        });

        return apiSuccess({ message: 'Form submitted successfully.', form_id });

    } catch (err) {
        console.error('[POST /api/patient-chat/submit]', err);
        return apiError('Internal server error');
    }
}
