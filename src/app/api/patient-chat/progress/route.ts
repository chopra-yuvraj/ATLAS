// src/app/api/patient-chat/progress/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';
import { z } from 'zod';

const ProgressSchema = z.object({
    session_id: z.string().uuid(),
});

export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient();
        const body = await request.json();

        const parsed = ProgressSchema.safeParse(body);
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(', '), 400);
        }

        const { session_id } = parsed.data;

        // Get session
        const { data: session } = await supabase
            .from('patient_sessions')
            .select('patient_id')
            .eq('id', session_id)
            .single();

        if (!session) {
            return apiError('Session not found.', 404);
        }

        // Get patient record
        const { data: patient } = await supabase
            .from('patients')
            .select('id, full_name, status, arrived_at, chief_complaint, assigned_bed_id, assigned_doctor_id')
            .eq('id', session.patient_id)
            .single();

        if (!patient) {
            return apiError('Patient not found.', 404);
        }

        // Get queue info from active_queue view
        const { data: queueEntry } = await supabase
            .from('active_queue')
            .select('wait_minutes, severity_tier, acuity, pain_index, s_final')
            .eq('patient_id', session.patient_id)
            .single();

        // Get bed label if assigned
        let bedLabel: string | null = null;
        if (patient.assigned_bed_id) {
            const { data: bed } = await supabase
                .from('beds')
                .select('label, ward')
                .eq('id', patient.assigned_bed_id)
                .single();
            if (bed) bedLabel = `${bed.label} (${bed.ward})`;
        }

        // Get doctor name if assigned
        let doctorName: string | null = null;
        if (patient.assigned_doctor_id) {
            const { data: docProfile } = await supabase
                .from('doctor_profiles')
                .select('staff_id')
                .eq('id', patient.assigned_doctor_id)
                .single();
            if (docProfile) {
                const { data: staff } = await supabase
                    .from('staff')
                    .select('full_name')
                    .eq('id', docProfile.staff_id)
                    .single();
                if (staff) doctorName = staff.full_name;
            }
        }

        // Count patients waiting ahead (with higher s_final) — but don't expose the actual number to patient
        let patientsAhead = 0;
        if (queueEntry?.s_final) {
            const { count } = await supabase
                .from('active_queue')
                .select('*', { count: 'exact', head: true })
                .gt('s_final', queueEntry.s_final);
            patientsAhead = count || 0;
        }

        // Estimate category (don't give exact numbers)
        let waitEstimate: string;
        const waitMins = queueEntry?.wait_minutes || 0;
        if (patient.status === 'in_treatment') {
            waitEstimate = 'in_treatment';
        } else if (patientsAhead === 0) {
            waitEstimate = 'next_up';
        } else if (patientsAhead <= 2) {
            waitEstimate = 'very_soon';
        } else if (patientsAhead <= 5) {
            waitEstimate = 'moderate_wait';
        } else {
            waitEstimate = 'longer_wait';
        }

        return apiSuccess({
            status: patient.status,
            severity_tier: queueEntry?.severity_tier || 'unknown',
            wait_minutes: waitMins,
            wait_estimate: waitEstimate,
            chief_complaint: patient.chief_complaint,
            bed: bedLabel,
            doctor: doctorName,
            arrived_at: patient.arrived_at,
        });

    } catch (err: any) {
        console.error('[POST /api/patient-chat/progress] Error:', err);
        return apiError(`Failed to fetch progress: ${err.message || 'Unknown error'}`);
    }
}
