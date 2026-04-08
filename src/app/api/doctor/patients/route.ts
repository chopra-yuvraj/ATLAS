// src/app/api/doctor/patients/route.ts
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';

export async function GET() {
    try {
        const authClient = await createClient();
        const { data: { session } } = await authClient.auth.getSession();
        if (!session) return apiError('Unauthorized', 401);

        const supabase = await createServiceClient();

        // Get the staff profile for this user
        const { data: staff } = await supabase
            .from('staff')
            .select('id')
            .eq('user_id', session.user.id)
            .single();

        if (!staff) return apiError('Staff profile not found', 404);

        // Get doctor profile
        const { data: doctorProfile } = await supabase
            .from('doctor_profiles')
            .select('id')
            .eq('staff_id', staff.id)
            .single();

        if (!doctorProfile) return apiError('Doctor profile not found', 404);

        // Get assigned patients with triage scores
        const { data: assignments, error } = await supabase
            .from('patient_assignments')
            .select(`
                *,
                patients(*, triage_scores(*)),
                doctor_profiles(specialization, department_id)
            `)
            .eq('doctor_profile_id', doctorProfile.id)
            .eq('is_active', true)
            .order('assigned_at', { ascending: false });

        if (error) return apiError(error.message);
        return apiSuccess(assignments);
    } catch {
        return apiError('Internal server error');
    }
}
