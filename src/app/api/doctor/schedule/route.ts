// src/app/api/doctor/schedule/route.ts
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';
import { z } from 'zod';

const CreateScheduleSchema = z.object({
    doctor_profile_id: z.string().uuid(),
    day_of_week: z.number().int().min(0).max(6),
    shift_start: z.string(),
    shift_end: z.string(),
});

export async function GET(request: Request) {
    try {
        const supabase = await createServiceClient();
        const { searchParams } = new URL(request.url);
        const doctorProfileId = searchParams.get('doctor_profile_id');

        // If no specific doctor, get for current user
        if (!doctorProfileId) {
            const authClient = await createClient();
            const { data: { session } } = await authClient.auth.getSession();
            if (!session) return apiError('Unauthorized', 401);

            const { data: staff } = await supabase
                .from('staff')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (!staff) return apiError('Staff not found', 404);

            const { data: dp } = await supabase
                .from('doctor_profiles')
                .select('id')
                .eq('staff_id', staff.id)
                .single();

            if (!dp) return apiError('Doctor profile not found', 404);

            const { data, error } = await supabase
                .from('doctor_schedules')
                .select('*')
                .eq('doctor_profile_id', dp.id)
                .eq('is_active', true)
                .order('day_of_week');

            if (error) return apiError(error.message);
            return apiSuccess(data);
        }

        const { data, error } = await supabase
            .from('doctor_schedules')
            .select('*')
            .eq('doctor_profile_id', doctorProfileId)
            .eq('is_active', true)
            .order('day_of_week');

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
        const parsed = CreateScheduleSchema.safeParse(body);
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(', '), 400);
        }

        const { data, error } = await supabase
            .from('doctor_schedules')
            .insert(parsed.data)
            .select()
            .single();

        if (error) return apiError(error.message);
        return apiSuccess(data, 201);
    } catch {
        return apiError('Internal server error');
    }
}
