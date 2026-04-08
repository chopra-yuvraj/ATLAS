// src/app/api/load-balance/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';
import { rankDoctorsForPatient, type DoctorCandidate } from '@/lib/load-balancer';

export async function GET() {
    try {
        const supabase = await createServiceClient();

        // Get all doctor profiles with staff info
        const { data: profiles, error } = await supabase
            .from('doctor_profiles')
            .select('*, staff(full_name, role, badge_number), departments(name, code)')
            .order('current_load', { ascending: false });

        if (error) return apiError(error.message);
        return apiSuccess(profiles);
    } catch {
        return apiError('Internal server error');
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient();
        const body = await request.json();
        const { patient_id, department_id } = body;

        if (!patient_id) return apiError('patient_id is required', 400);

        // Get all available doctors
        const { data: profiles, error: profileError } = await supabase
            .from('doctor_profiles')
            .select('*, staff(full_name)')
            .eq('is_accepting_patients', true);

        if (profileError) return apiError(profileError.message);

        const candidates: DoctorCandidate[] = (profiles ?? []).map(p => ({
            id: p.id,
            staff_id: p.staff_id,
            staffName: p.staff?.full_name ?? 'Unknown',
            department_id: p.department_id,
            specialization: p.specialization,
            current_load: p.current_load,
            max_concurrent_patients: p.max_concurrent_patients,
            availability_status: p.availability_status,
            is_accepting_patients: p.is_accepting_patients,
            last_patient_assigned_at: p.last_patient_assigned_at,
            min_rest_minutes: p.min_rest_minutes,
        }));

        const ranked = rankDoctorsForPatient(candidates, department_id ?? null);

        if (ranked.length === 0) {
            return apiSuccess({ assigned: false, message: 'No available doctors', rankings: [] });
        }

        const best = ranked[0];

        // Create assignment
        const { error: assignError } = await supabase
            .from('patient_assignments')
            .insert({
                patient_id,
                doctor_profile_id: best.doctorProfileId,
                department_id: department_id ?? null,
                assignment_reason: 'auto_load_balance',
                assignment_score: best.score,
                specialization_match: best.specializationMatch,
                doctor_load_at_assignment: best.loadAtAssignment,
            });

        if (assignError) return apiError(assignError.message);

        // Update patient's assigned doctor
        await supabase
            .from('patients')
            .update({ assigned_doctor_id: best.doctorProfileId, department_id: department_id ?? null })
            .eq('id', patient_id);

        // Update doctor's last assigned timestamp
        await supabase
            .from('doctor_profiles')
            .update({ last_patient_assigned_at: new Date().toISOString() })
            .eq('id', best.doctorProfileId);

        return apiSuccess({
            assigned: true,
            doctor: best,
            rankings: ranked.slice(0, 5),
        });
    } catch {
        return apiError('Internal server error');
    }
}
