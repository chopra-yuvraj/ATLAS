// src/lib/__tests__/scoring-engine.test.ts
import { describe, it, expect } from 'vitest';
import { computeScore, getSeverityTier, DEFAULT_WEIGHTS } from '../scoring-engine';

describe('computeScore', () => {
    it('Test 1: max acuity, stable patient → S_final = 310', () => {
        const result = computeScore({
            acuity: 10, vulnerability: 0, painIndex: 0,
            resourceConsumption: 0, contagionRisk: 0, behavioralRisk: 0,
            deteriorationRate: 0, waitMinutes: 0,
        });
        // S_base = 3.0 * 100 + 0 + 0 + 1.0 * 10 + 0 = 310
        // S_final = 310 * 1.0 * 1.0 + 0 = 310
        expect(result.sFinal).toBe(310);
        expect(result.sBase).toBe(310);
    });

    it('Test 2: zero acuity, max deterioration → S_final = 260', () => {
        const result = computeScore({
            acuity: 0, vulnerability: 0, painIndex: 0,
            resourceConsumption: 0, contagionRisk: 0, behavioralRisk: 0,
            deteriorationRate: 10, waitMinutes: 0,
        });
        // S_base = 0 + 0 + 0 + 1.0 * 10 + 0 = 10
        // S_final = 10 * 1.0 * 1.0 + 2.5 * 100 = 260
        expect(result.sFinal).toBe(260);
        expect(result.breakdown.deteriorationSpike).toBe(250);
    });

    it('Test 3: max contagion multiplier', () => {
        const result = computeScore({
            acuity: 5, vulnerability: 0, painIndex: 5,
            resourceConsumption: 5, contagionRisk: 10, behavioralRisk: 0,
            deteriorationRate: 0, waitMinutes: 0,
        });
        // Contagion multiplier = 1 + 0.3 * 10 = 4.0
        expect(result.breakdown.contagionMultiplier).toBe(4.0);
        expect(result.sFinal).toBeGreaterThan(result.sBase);
    });

    it('Test 4: wait time is capped at tMax', () => {
        const a = computeScore({
            acuity: 5, vulnerability: 5, painIndex: 5,
            resourceConsumption: 5, contagionRisk: 0, behavioralRisk: 0,
            deteriorationRate: 0, waitMinutes: 1000,
        });
        const b = computeScore({
            acuity: 5, vulnerability: 5, painIndex: 5,
            resourceConsumption: 5, contagionRisk: 0, behavioralRisk: 0,
            deteriorationRate: 0, waitMinutes: 300,
        });
        // Both should have W_norm = 1.0
        expect(a.wNorm).toBe(1.0);
        expect(b.wNorm).toBe(1.0);
        expect(a.sFinal).toBe(b.sFinal);
    });

    it('validates ranges — rejects acuity > 10', () => {
        expect(() => computeScore({
            acuity: 11, vulnerability: 0, painIndex: 0,
            resourceConsumption: 0, contagionRisk: 0, behavioralRisk: 0,
            deteriorationRate: 0, waitMinutes: 0,
        })).toThrow(RangeError);
    });

    it('validates ranges — rejects negative wait time', () => {
        expect(() => computeScore({
            acuity: 5, vulnerability: 0, painIndex: 0,
            resourceConsumption: 0, contagionRisk: 0, behavioralRisk: 0,
            deteriorationRate: 0, waitMinutes: -1,
        })).toThrow(RangeError);
    });

    it('uses resource consumption inversely', () => {
        const highResource = computeScore({
            acuity: 5, vulnerability: 5, painIndex: 5,
            resourceConsumption: 10, contagionRisk: 0, behavioralRisk: 0,
            deteriorationRate: 0, waitMinutes: 0,
        });
        const lowResource = computeScore({
            acuity: 5, vulnerability: 5, painIndex: 5,
            resourceConsumption: 0, contagionRisk: 0, behavioralRisk: 0,
            deteriorationRate: 0, waitMinutes: 0,
        });
        // High resource consumption = lower priority
        expect(lowResource.sFinal).toBeGreaterThan(highResource.sFinal);
    });
});

describe('getSeverityTier', () => {
    it('maps scores to correct tiers', () => {
        expect(getSeverityTier(300)).toBe('critical');
        expect(getSeverityTier(200)).toBe('urgent');
        expect(getSeverityTier(100)).toBe('moderate');
        expect(getSeverityTier(50)).toBe('minor');
        expect(getSeverityTier(10)).toBe('nonurgent');
    });
});
