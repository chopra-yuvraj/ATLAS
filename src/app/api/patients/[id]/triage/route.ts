// src/app/api/patients/[id]/triage/route.ts
// PATCH — update triage variables and immediately rescore + re-rank
import { createServiceClient } from '@/lib/supabase/server';
import {
    computeScore, computeWaitMinutes, getNextRecalcInterval
} from '@/lib/scoring-engine';
import { apiError, apiSuccess } from '@/lib/utils';
import { z } from 'zod';

const TriageUpdateSchema = z.object({
    acuity: z.number().min(0).max(10).optional(),
    vulnerability: z.number().min(0).max(10).optional(),
    pain_index: z.number().min(0).max(10).optional(),
    resource_consumption: z.number().min(0).max(10).optional(),
    contagion_risk: z.number().min(0).max(10).optional(),
    behavioral_risk: z.number().min(0).max(10).optional(),
    deterioration_rate: z.number().min(0).max(10).optional(),
    scored_by_id: z.string().uuid().optional(),
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createServiceClient();
        const body = await request.json();

        const parsed = TriageUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(', '), 400);
        }

        const { data: patient, error: pErr } = await supabase
            .from('patients')
            .select('id, arrived_at, status, triage_scores(*)')
            .eq('id', id)
            .single();

        if (pErr || !patient) return apiError('Patient not found', 404);
        if (patient.status !== 'waiting') {
            return apiError('Cannot update triage for a patient not in waiting status', 400);
        }

        const existingScore = (patient.triage_scores as any[])[0] as Record<string, number>;

        const mergedVars = {
            acuity: parsed.data.acuity ?? existingScore.acuity,
            vulnerability: parsed.data.vulnerability ?? existingScore.vulnerability,
            pain_index: parsed.data.pain_index ?? existingScore.pain_index,
            resource_consumption: parsed.data.resource_consumption ?? existingScore.resource_consumption,
            contagion_risk: parsed.data.contagion_risk ?? existingScore.contagion_risk,
            behavioral_risk: parsed.data.behavioral_risk ?? existingScore.behavioral_risk,
            deterioration_rate: parsed.data.deterioration_rate ?? existingScore.deterioration_rate,
        };

        const waitMinutes = computeWaitMinutes(patient.arrived_at);

        const scoreResult = computeScore({
            acuity: mergedVars.acuity,
            vulnerability: mergedVars.vulnerability,
            painIndex: mergedVars.pain_index,
            resourceConsumption: mergedVars.resource_consumption,
            contagionRisk: mergedVars.contagion_risk,
            behavioralRisk: mergedVars.behavioral_risk,
            deteriorationRate: mergedVars.deterioration_rate,
            waitMinutes,
        });

        const recalcIntervalSeconds = getNextRecalcInterval(mergedVars.deterioration_rate);
        const nextRecalcAt = new Date(Date.now() + recalcIntervalSeconds * 1000).toISOString();

        const { data: updatedScore, error: scoreError } = await supabase
            .from('triage_scores')
            .update({
                ...mergedVars,
                w_norm: scoreResult.wNorm,
                s_base: scoreResult.sBase,
                s_final: scoreResult.sFinal,
                scored_by_id: parsed.data.scored_by_id || null,
                scored_at: new Date().toISOString(),
                last_updated_at: new Date().toISOString(),
                next_recalc_at: nextRecalcAt,
            })
            .eq('patient_id', id)
            .select()
            .single();

        if (scoreError) return apiError(scoreError.message);

        await supabase.rpc('rerank_queue');

        await supabase.from('queue_snapshots').insert({
            patient_id: id,
            triage_score_id: updatedScore.id,
            ...mergedVars,
            wait_minutes: waitMinutes,
            w_norm: scoreResult.wNorm,
            s_base: scoreResult.sBase,
            s_final: scoreResult.sFinal,
            trigger_source: 'nurse_update',
            triggered_by_id: parsed.data.scored_by_id || null,
        });

        return apiSuccess({ triageScore: updatedScore, scoreResult });
    } catch (err) {
        console.error('[PATCH /api/patients/[id]/triage]', err);
        return apiError('Internal server error');
    }
}
