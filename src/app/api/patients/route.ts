// src/app/api/patients/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { computeScore, getNextRecalcInterval } from '@/lib/scoring-engine';
import { CTAS_LEVELS } from '@/types/triage';
import { apiError, apiSuccess } from '@/lib/utils';
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

        return apiSuccess({ patient, triageScore }, 201);
    } catch (err) {
        console.error('[POST /api/patients]', err);
        return apiError('Internal server error');
    }
}
