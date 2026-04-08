// src/app/api/patient-tokens/route.ts
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';
import { z } from 'zod';

function generateTokenCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `ATLAS-${code}`;
}

const CreateTokenSchema = z.object({
    patient_id: z.string().uuid(),
});

// POST: Staff creates a login token for a patient
export async function POST(request: Request) {
    try {
        // Verify the user is authenticated
        const authSupabase = await createClient();
        const { data: { session } } = await authSupabase.auth.getSession();
        if (!session) return apiError('Unauthorized', 401);

        // Use service client to bypass RLS on staff table
        const supabase = await createServiceClient();

        const { data: staff } = await supabase
            .from('staff')
            .select('id, role')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .single();

        if (!staff) return apiError('Staff profile not found. Visit /api/fix-staff first.', 403);
        if (!['triage_nurse', 'admin', 'frontdesk'].includes(staff.role)) {
            return apiError('Insufficient permissions', 403);
        }
        const body = await request.json();

        const parsed = CreateTokenSchema.safeParse(body);
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(', '), 400);
        }

        // Get patient DOB for the token
        const { data: patient } = await supabase
            .from('patients')
            .select('id, full_name, date_of_birth')
            .eq('id', parsed.data.patient_id)
            .single();

        if (!patient) return apiError('Patient not found', 404);

        // Generate unique token code
        let tokenCode = generateTokenCode();
        let attempts = 0;

        // Ensure uniqueness
        while (attempts < 5) {
            const { data: existing } = await supabase
                .from('patient_login_tokens')
                .select('id')
                .eq('token_code', tokenCode)
                .single();

            if (!existing) break;
            tokenCode = generateTokenCode();
            attempts++;
        }

        // Create the token
        const { data: token, error } = await supabase
            .from('patient_login_tokens')
            .insert({
                patient_id: patient.id,
                token_code: tokenCode,
                dob_verification: patient.date_of_birth,
                generated_by: staff.id,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            })
            .select()
            .single();

        if (error) return apiError(error.message, 500);

        return apiSuccess({
            token_code: token.token_code,
            patient_name: patient.full_name,
            patient_dob: patient.date_of_birth,
            expires_at: token.expires_at,
        }, 201);

    } catch (err) {
        console.error('[POST /api/patient-tokens]', err);
        return apiError('Internal server error');
    }
}

// GET: Staff lists tokens
export async function GET(request: Request) {
    try {
        const authSupabase = await createClient();
        const { data: { session } } = await authSupabase.auth.getSession();
        if (!session) return apiError('Unauthorized', 401);

        const supabase = await createServiceClient();
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') ?? '20');

        const { data, error } = await supabase
            .from('patient_login_tokens')
            .select('*, patients(full_name, mrn)')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) return apiError(error.message);
        return apiSuccess(data);

    } catch {
        return apiError('Internal server error');
    }
}
