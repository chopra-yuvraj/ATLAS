// src/app/api/recalc/route.ts
// POST — Vercel Cron endpoint. Recalculates all waiting patients due for update.
import { createServiceClient } from '@/lib/supabase/server';
import {
    computeScore, computeWaitMinutes, getNextRecalcInterval
} from '@/lib/scoring-engine';
import { apiError, apiSuccess } from '@/lib/utils';

export async function POST(request: Request) {
    const authHeader = request.headers.get('authorization');
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedToken) {
        return apiError('Unauthorized', 401);
    }

    try {
        const supabase = await createServiceClient();
        const startTime = Date.now();
        let processed = 0;
        let errors = 0;

        const { data: dueScores, error: fetchError } = await supabase
            .from('triage_scores')
            .select(`*, patients!inner(id, arrived_at, status)`)
            .lte('next_recalc_at', new Date().toISOString())
            .eq('patients.status', 'waiting');

        if (fetchError) {
            console.error('[CRON] Failed to fetch due scores:', fetchError);
            return apiError(fetchError.message);
        }

        if (!dueScores || dueScores.length === 0) {
            return apiSuccess({ processed: 0, message: 'No patients due for recalculation' });
        }

        const updates: Promise<unknown>[] = [];

        for (const score of dueScores) {
            const patient = (score as { patients: { id: string; arrived_at: string; status: string } }).patients;
            if (!patient || patient.status !== 'waiting') continue;

            try {
                const waitMinutes = computeWaitMinutes(patient.arrived_at);

                const result = computeScore({
                    acuity: score.acuity,
                    vulnerability: score.vulnerability,
                    painIndex: score.pain_index,
                    resourceConsumption: score.resource_consumption,
                    contagionRisk: score.contagion_risk,
                    behavioralRisk: score.behavioral_risk,
                    deteriorationRate: score.deterioration_rate,
                    waitMinutes,
                });

                const recalcIntervalSeconds = getNextRecalcInterval(score.deterioration_rate);
                const nextRecalcAt = new Date(Date.now() + recalcIntervalSeconds * 1000).toISOString();

                updates.push(
                    supabase.from('triage_scores').update({
                        w_norm: result.wNorm,
                        s_base: result.sBase,
                        s_final: result.sFinal,
                        last_updated_at: new Date().toISOString(),
                        next_recalc_at: nextRecalcAt,
                    }).eq('id', score.id) as unknown as Promise<unknown>
                );

                updates.push(
                    supabase.from('queue_snapshots').insert({
                        patient_id: patient.id,
                        triage_score_id: score.id,
                        acuity: score.acuity,
                        vulnerability: score.vulnerability,
                        pain_index: score.pain_index,
                        resource_consumption: score.resource_consumption,
                        contagion_risk: score.contagion_risk,
                        behavioral_risk: score.behavioral_risk,
                        deterioration_rate: score.deterioration_rate,
                        wait_minutes: waitMinutes,
                        w_norm: result.wNorm,
                        s_base: result.sBase,
                        s_final: result.sFinal,
                        trigger_source: 'cron_job',
                    }) as unknown as Promise<unknown>
                );

                processed++;
            } catch (err) {
                console.error(`[CRON] Error scoring patient ${patient.id}:`, err);
                errors++;
            }
        }

        await Promise.allSettled(updates);
        await supabase.rpc('rerank_queue');

        const duration = Date.now() - startTime;
        console.log(`[CRON] Processed ${processed} patients in ${duration}ms. Errors: ${errors}`);

        return apiSuccess({
            processed,
            errors,
            durationMs: duration,
            message: `Recalculated ${processed} patients in ${duration}ms`,
        });
    } catch (err) {
        console.error('[CRON] Fatal error:', err);
        return apiError('Internal server error');
    }
}
