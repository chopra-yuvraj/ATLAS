// src/app/api/patient-auth/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';
import { z } from 'zod';

const LoginSchema = z.object({
    token_code: z.string().min(1, 'Token code is required'),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    language_code: z.string().default('en-US'),
});

export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient();
        const body = await request.json();

        const parsed = LoginSchema.safeParse(body);
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(', '), 400);
        }

        const { token_code, date_of_birth, language_code } = parsed.data;

        // Step 1: Find the token
        const { data: token, error: tokenErr } = await supabase
            .from('patient_login_tokens')
            .select('*')
            .eq('token_code', token_code.toUpperCase().trim())
            .eq('is_used', false)
            .single();

        if (tokenErr || !token) {
            console.error('[patient-auth] Token error:', tokenErr);
            return apiError('Invalid or expired token code. Please check with the nurse.', 401);
        }

        // Step 2: Check expiry
        if (new Date(token.expires_at) < new Date()) {
            return apiError('This token has expired. Please request a new one from the nurse.', 401);
        }

        // Step 3: Verify DOB
        if (token.dob_verification !== date_of_birth) {
            return apiError('Date of birth does not match our records.', 401);
        }

        // Step 4: Get patient info
        const { data: patient, error: patientErr } = await supabase
            .from('patients')
            .select('id, mrn, full_name, date_of_birth, gender, language_preference, chief_complaint, allergies, status, arrived_at, notes')
            .eq('id', token.patient_id)
            .single();

        if (patientErr || !patient) {
            console.error('[patient-auth] Patient fetch error:', patientErr);
            return apiError('Patient record not found.', 404);
        }

        // Step 5: Mark token as used
        const { error: updateTokenErr } = await supabase
            .from('patient_login_tokens')
            .update({ is_used: true })
            .eq('id', token.id);
        if (updateTokenErr) {
             console.error('[patient-auth] Update token error:', updateTokenErr);
             return apiError('Database error marking token.', 500);
        }

        // Step 6: Update patient language preference
        const { error: updateLangErr } = await supabase
            .from('patients')
            .update({ language_preference: language_code })
            .eq('id', patient.id);
        if (updateLangErr) {
             console.error('[patient-auth] Update lang error:', updateLangErr);
             // Non-fatal, just log it. (This commonly fails if language code is not in supported_languages table!)
        }

        // Step 7: Create session
        const { data: session, error: sessionErr } = await supabase
            .from('patient_sessions')
            .insert({
                patient_id: patient.id,
                language_code,
                session_status: 'active',
                device_info: {
                    user_agent: request.headers.get('user-agent') || 'unknown',
                    timestamp: new Date().toISOString(),
                },
            })
            .select()
            .single();

        if (sessionErr || !session) {
            console.error('[patient-auth] Create session error:', sessionErr);
            return apiError(`Failed to create session: ${sessionErr?.message || 'Unknown error'}`, 500);
        }

        // Calculate Age from DOB
        const calcAge = (dob: string) => {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        };
        const patientAge = calcAge(date_of_birth);

        // Step 8: Create draft intake form
        const { data: form, error: formErr } = await supabase
            .from('patient_intake_forms')
            .insert({
                patient_id: patient.id,
                session_id: session.id,
                form_language: language_code,
                form_status: 'draft',
                full_name_english: patient.full_name,
                age: patientAge,
                gender: patient.gender,
            })
            .select()
            .single();

        if (formErr) {
             console.error('[patient-auth] Create form error:', formErr);
             return apiError(`Failed to create intake form: ${formErr.message}`, 500);
        }

        return apiSuccess({
            session_id: session.id,
            patient_id: patient.id,
            patient_name: patient.full_name,
            language_code,
            form_id: form?.id || null,
            form: form || null,
            patient_context: {
                chief_complaint: patient.chief_complaint,
                allergies: patient.allergies,
                gender: patient.gender,
                date_of_birth: patient.date_of_birth,
                status: patient.status,
                arrived_at: patient.arrived_at,
                notes: patient.notes,
            },
        }, 200);

    } catch (err: any) {
        console.error('[POST /api/patient-auth] Exception:', err);
        return apiError(`Internal server error: ${err.message}`);
    }
}
