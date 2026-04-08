// src/app/api/network/referrals/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';
import { z } from 'zod';

const CreateReferralSchema = z.object({
    patient_id: z.string().uuid(),
    from_hospital_id: z.string().uuid(),
    to_hospital_id: z.string().uuid(),
    reason: z.string().min(3).max(500),
    urgency: z.enum(['critical', 'urgent', 'routine']).default('routine'),
    required_resource: z.string().optional(),
    notes: z.string().optional(),
    referred_by_id: z.string().uuid().optional(),
});

export async function GET(request: Request) {
    try {
        const supabase = await createServiceClient();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let query = supabase
            .from('patient_referrals')
            .select(`
                *,
                patients(full_name, mrn),
                from_hospital:hospital_network!patient_referrals_from_hospital_id_fkey(name, code, city),
                to_hospital:hospital_network!patient_referrals_to_hospital_id_fkey(name, code, city)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) return apiError(error.message);
        return apiSuccess(data);
    } catch {
        return apiError('Internal server error');
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient();
        const body = await request.json();
        const parsed = CreateReferralSchema.safeParse(body);
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(', '), 400);
        }

        const { data, error } = await supabase
            .from('patient_referrals')
            .insert(parsed.data)
            .select()
            .single();

        if (error) return apiError(error.message);

        // Update patient status to transferred
        await supabase
            .from('patients')
            .update({ status: 'transferred' })
            .eq('id', parsed.data.patient_id);

        return apiSuccess(data, 201);
    } catch {
        return apiError('Internal server error');
    }
}
