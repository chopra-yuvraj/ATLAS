// src/app/api/score/route.ts
// POST — returns a score preview without saving anything.
import { computeScore, getSeverityTier } from '@/lib/scoring-engine';
import { apiError, apiSuccess } from '@/lib/utils';
import { z } from 'zod';

const PreviewSchema = z.object({
    acuity: z.number().min(0).max(10),
    vulnerability: z.number().min(0).max(10),
    pain_index: z.number().min(0).max(10),
    resource_consumption: z.number().min(0).max(10),
    contagion_risk: z.number().min(0).max(10),
    behavioral_risk: z.number().min(0).max(10),
    deterioration_rate: z.number().min(0).max(10),
    wait_minutes: z.number().min(0).default(0),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = PreviewSchema.safeParse(body);

        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(', '), 400);
        }

        const {
            acuity, vulnerability, pain_index, resource_consumption,
            contagion_risk, behavioral_risk, deterioration_rate, wait_minutes,
        } = parsed.data;

        const result = computeScore({
            acuity,
            vulnerability,
            painIndex: pain_index,
            resourceConsumption: resource_consumption,
            contagionRisk: contagion_risk,
            behavioralRisk: behavioral_risk,
            deteriorationRate: deterioration_rate,
            waitMinutes: wait_minutes,
        });

        return apiSuccess({
            w_norm: result.wNorm,
            s_base: result.sBase,
            s_final: result.sFinal,
            severity_tier: getSeverityTier(result.sFinal),
            breakdown: {
                acuity_contribution: result.breakdown.acuityContribution,
                vulnerability_contribution: result.breakdown.vulnerabilityContribution,
                pain_contribution: result.breakdown.painContribution,
                resource_contribution: result.breakdown.resourceContribution,
                wait_contribution: result.breakdown.waitContribution,
                contagion_multiplier: result.breakdown.contagionMultiplier,
                behavioral_multiplier: result.breakdown.behavioralMultiplier,
                deterioration_spike: result.breakdown.deteriorationSpike,
            },
        });
    } catch (err) {
        if (err instanceof RangeError) return apiError(err.message, 400);
        return apiError('Internal server error');
    }
}
