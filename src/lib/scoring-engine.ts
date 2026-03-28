// src/lib/scoring-engine.ts
//
// THE PRIORITY QUEUE SCORING ALGORITHM
//
// Formula Overview:
//   W_norm  = min(1.0, W / T_max)
//   S_base  = wA·A² + wV·V + wP·P + wR·(10−R) + wW·√(W_norm)
//   S_final = [S_base · (1 + mC·C) · (1 + mB·B)] + wD·D²
//
// Higher S_final = higher priority = lower queue rank (Rank 1 = treated next)

import type { AlgorithmWeights, ScoreResult, TriageVariables } from '@/types/triage';

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT WEIGHT CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_WEIGHTS: AlgorithmWeights = {
    wA: 3.0,    // Acuity: highest weight, squared for exponential gap.
    wV: 1.5,    // Vulnerability: elderly, pregnant, immunocompromised boost.
    wP: 1.2,    // Pain index: linear contribution.
    wR: 1.0,    // Resource consumption: INVERTED — low use = higher priority.
    wW: 0.8,    // Wait time: sqrt-dampened to prevent unfair dominance over acuity.
    mC: 0.3,    // Contagion: multiplicative — high risk patients jump up fast.
    mB: 0.2,    // Behavioral: flag for safety, minor upward bump.
    wD: 2.5,    // Deterioration: additive spike — D=10 adds 250 points.
    tMax: 240,  // Max expected ED wait = 4 hours.
};

// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY TIER THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────
export const SEVERITY_THRESHOLDS = {
    critical: 280,
    urgent: 160,
    moderate: 80,
    minor: 30,
    nonurgent: 0,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCORING FUNCTION — pure, no side effects
// ─────────────────────────────────────────────────────────────────────────────
export function computeScore(
    vars: TriageVariables,
    weights: AlgorithmWeights = DEFAULT_WEIGHTS
): ScoreResult {
    const { acuity: A, vulnerability: V, painIndex: P, resourceConsumption: R,
        contagionRisk: C, behavioralRisk: B, deteriorationRate: D,
        waitMinutes: W } = vars;

    const validateRange = (val: number, name: string) => {
        if (val < 0 || val > 10) {
            throw new RangeError(`${name} must be between 0 and 10, got ${val}`);
        }
    };
    validateRange(A, 'acuity');
    validateRange(V, 'vulnerability');
    validateRange(P, 'painIndex');
    validateRange(R, 'resourceConsumption');
    validateRange(C, 'contagionRisk');
    validateRange(B, 'behavioralRisk');
    validateRange(D, 'deteriorationRate');
    if (W < 0) throw new RangeError(`waitMinutes must be >= 0, got ${W}`);

    // Step 1: Time normalization
    const wNorm = Math.min(1.0, W / weights.tMax);

    // Step 2: Base score components
    const acuityContribution = weights.wA * (A ** 2);
    const vulnerabilityContribution = weights.wV * V;
    const painContribution = weights.wP * P;
    const resourceContribution = weights.wR * (10 - R);
    const waitContribution = weights.wW * Math.sqrt(wNorm);

    const sBase =
        acuityContribution +
        vulnerabilityContribution +
        painContribution +
        resourceContribution +
        waitContribution;

    // Step 3: Apply multipliers
    const contagionMultiplier = 1 + weights.mC * C;
    const behavioralMultiplier = 1 + weights.mB * B;

    // Step 4: Deterioration spike (additive)
    const deteriorationSpike = weights.wD * (D ** 2);

    // Step 5: Final score
    const sFinal = (sBase * contagionMultiplier * behavioralMultiplier) + deteriorationSpike;

    return {
        wNorm: parseFloat(wNorm.toFixed(6)),
        sBase: parseFloat(sBase.toFixed(4)),
        sFinal: parseFloat(sFinal.toFixed(4)),
        breakdown: {
            acuityContribution: parseFloat(acuityContribution.toFixed(4)),
            vulnerabilityContribution: parseFloat(vulnerabilityContribution.toFixed(4)),
            painContribution: parseFloat(painContribution.toFixed(4)),
            resourceContribution: parseFloat(resourceContribution.toFixed(4)),
            waitContribution: parseFloat(waitContribution.toFixed(4)),
            contagionMultiplier: parseFloat(contagionMultiplier.toFixed(4)),
            behavioralMultiplier: parseFloat(behavioralMultiplier.toFixed(4)),
            deteriorationSpike: parseFloat(deteriorationSpike.toFixed(4)),
        },
    };
}

/** Maps a final score to a severity tier label. */
export function getSeverityTier(sFinal: number): keyof typeof SEVERITY_THRESHOLDS {
    if (sFinal >= SEVERITY_THRESHOLDS.critical) return 'critical';
    if (sFinal >= SEVERITY_THRESHOLDS.urgent) return 'urgent';
    if (sFinal >= SEVERITY_THRESHOLDS.moderate) return 'moderate';
    if (sFinal >= SEVERITY_THRESHOLDS.minor) return 'minor';
    return 'nonurgent';
}

/** Returns next recalculation interval in seconds based on deterioration rate. */
export function getNextRecalcInterval(deteriorationRate: number): number {
    if (deteriorationRate >= 8) return 30;
    if (deteriorationRate >= 6) return 60;
    if (deteriorationRate >= 4) return 120;
    if (deteriorationRate >= 2) return 300;
    return 600;
}

/** Computes minutes elapsed since arrival timestamp. */
export function computeWaitMinutes(arrivedAt: string | Date): number {
    const arrival = typeof arrivedAt === 'string' ? new Date(arrivedAt) : arrivedAt;
    const now = new Date();
    const diffMs = now.getTime() - arrival.getTime();
    return Math.max(0, diffMs / 60000);
}
