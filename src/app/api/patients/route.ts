// src/app/api/patients/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { computeScore, getNextRecalcInterval } from '@/lib/scoring-engine';
import { CTAS_LEVELS } from '@/types/triage';
import { apiError, apiSuccess } from '@/lib/utils';
import { mapComplaintToDepartment } from '@/lib/department-mapper';
import { selectBestDoctor, type DoctorCandidate } from '@/lib/load-balancer';
import { z } from 'zod';

const CreatePatientSchema = z.object({
    full_name: z.string().min(2).max(100),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
    phone: z.string().optional(),
    emergency_contact: z.string().optional(),
    chief_complaint: z.string().min(3).max(500),
    allergies: z.string().optional(),
    notes: z.string().optional(),
    ctas_level: z.number().int().min(1).max(5),
    vulnerability: z.number().min(0).max(10),
    pain_index: z.number().min(0).max(10),
    resource_consumption: z.number().min(0).max(10),
    contagion_risk: z.number().min(0).max(10),
    behavioral_risk: z.number().min(0).max(10),
    deterioration_rate: z.number().min(0).max(10),
    admitted_by_id: z.string().uuid().optional(),
});

export async function GET(request: Request) {
    try {
        const supabase = await createServiceClient();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') ?? '1');
        const perPage = parseInt(searchParams.get('per_page') ?? '50');
        const offset = (page - 1) * perPage;

        let query = supabase
            .from('patients')
            .select('*, triage_scores(*), beds(label)', { count: 'exact' })
            .order('arrived_at', { ascending: false })
            .range(offset, offset + perPage - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error, count } = await query;

        if (error) return apiError(error.message);

        return Response.json({
            data,
            total: count ?? 0,
            page,
            perPage,
            error: null,
        });
    } catch {
        return apiError('Internal server error');
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient();
        const body = await request.json();

        const parsed = CreatePatientSchema.safeParse(body);
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(', '), 400);
        }

        const {
            full_name, date_of_birth, gender, phone, emergency_contact,
            chief_complaint, allergies, notes, admitted_by_id,
            ctas_level, vulnerability, pain_index, resource_consumption,
            contagion_risk, behavioral_risk, deterioration_rate,
        } = parsed.data;

        const ctasEntry = CTAS_LEVELS.find(c => c.level === ctas_level);
        if (!ctasEntry) return apiError('Invalid CTAS level', 400);
        const acuity = ctasEntry.acuityValue;

        // Step 1: Create the patient record
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .insert({
                full_name,
                date_of_birth,
                gender,
                phone: phone || null,
                emergency_contact: emergency_contact || null,
                chief_complaint,
                allergies: allergies ? allergies.split(',').map(a => a.trim()) : null,
                notes: notes || null,
                admitted_by_id: admitted_by_id || null,
                status: 'waiting',
                arrived_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (patientError || !patient) {
            return apiError(patientError?.message ?? 'Failed to create patient', 500);
        }

        // Step 2: Compute initial triage score
        const waitMinutes = 0;
        const scoreResult = computeScore({
            acuity, vulnerability, painIndex: pain_index,
            resourceConsumption: resource_consumption,
            contagionRisk: contagion_risk, behavioralRisk: behavioral_risk,
            deteriorationRate: deterioration_rate, waitMinutes,
        });

        const recalcIntervalSeconds = getNextRecalcInterval(deterioration_rate);
        const nextRecalcAt = new Date(Date.now() + recalcIntervalSeconds * 1000).toISOString();

        // Step 3: Write triage score
        const { data: triageScore, error: scoreError } = await supabase
            .from('triage_scores')
            .insert({
                patient_id: patient.id,
                acuity,
                vulnerability,
                pain_index,
                resource_consumption,
                contagion_risk,
                behavioral_risk,
                deterioration_rate,
                w_norm: scoreResult.wNorm,
                s_base: scoreResult.sBase,
                s_final: scoreResult.sFinal,
                scored_by_id: admitted_by_id || null,
                next_recalc_at: nextRecalcAt,
            })
            .select()
            .single();

        if (scoreError) {
            await supabase.from('patients').delete().eq('id', patient.id);
            return apiError(scoreError.message, 500);
        }

        // Step 4: Re-rank the entire queue
        await supabase.rpc('rerank_queue');

        // Step 5: Write audit snapshot
        await supabase.from('queue_snapshots').insert({
            patient_id: patient.id,
            triage_score_id: triageScore.id,
            acuity,
            vulnerability,
            pain_index,
            resource_consumption,
            contagion_risk,
            behavioral_risk,
            deterioration_rate,
            wait_minutes: waitMinutes,
            w_norm: scoreResult.wNorm,
            s_base: scoreResult.sBase,
            s_final: scoreResult.sFinal,
            trigger_source: 'patient_admission',
            triggered_by_id: admitted_by_id || null,
        });

        // Step 6: Auto-assign department based on chief complaint
        let departmentMatch = null;
        let doctorAssignment = null;
        try {
            const { data: departments } = await supabase
                .from('departments')
                .select('id, name, code, keywords')
                .eq('is_active', true);

            if (departments && departments.length > 0) {
                departmentMatch = mapComplaintToDepartment(chief_complaint, departments);

                if (departmentMatch.departmentId) {
                    await supabase
                        .from('patients')
                        .update({ department_id: departmentMatch.departmentId })
                        .eq('id', patient.id);

                    // Step 7: Auto-assign doctor via load balancer
                    const { data: profiles } = await supabase
                        .from('doctor_profiles')
                        .select('*, staff(full_name)')
                        .eq('is_accepting_patients', true);

                    if (profiles && profiles.length > 0) {
                        const candidates: DoctorCandidate[] = profiles.map(p => ({
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

                        const best = selectBestDoctor(candidates, departmentMatch.departmentId);
                        if (best) {
                            await supabase.from('patient_assignments').insert({
                                patient_id: patient.id,
                                doctor_profile_id: best.doctorProfileId,
                                department_id: departmentMatch.departmentId,
                                assignment_reason: 'auto_load_balance',
                                assignment_score: best.score,
                                specialization_match: best.specializationMatch,
                                doctor_load_at_assignment: best.loadAtAssignment,
                            });

                            await supabase
                                .from('patients')
                                .update({ assigned_doctor_id: best.doctorProfileId })
                                .eq('id', patient.id);

                            await supabase
                                .from('doctor_profiles')
                                .update({ last_patient_assigned_at: new Date().toISOString() })
                                .eq('id', best.doctorProfileId);

                            doctorAssignment = best;
                        }
                    }
                }
            }
        } catch (autoErr) {
            console.warn('[POST /api/patients] Auto-assignment failed (non-fatal):', autoErr);
        }

        return apiSuccess({ patient, triageScore, departmentMatch, doctorAssignment }, 201);
    } catch (err) {
        console.error('[POST /api/patients]', err);
        return apiError('Internal server error');
    }
}
