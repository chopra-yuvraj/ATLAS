// src/types/triage.ts

export interface TriageVariables {
    acuity: number;              // A: 0-10 (maps from CTAS 1-5)
    vulnerability: number;       // V: 0-10
    painIndex: number;           // P: 0-10
    resourceConsumption: number; // R: 0-10
    contagionRisk: number;       // C: 0-10
    behavioralRisk: number;      // B: 0-10
    deteriorationRate: number;   // D: 0-10
    waitMinutes: number;         // W: actual minutes since arrival
}

export interface ScoreResult {
    wNorm: number;    // Normalized wait time (0 to 1)
    sBase: number;    // Intermediate base score
    sFinal: number;   // Final priority score
    breakdown: {
        acuityContribution: number;
        vulnerabilityContribution: number;
        painContribution: number;
        resourceContribution: number;
        waitContribution: number;
        contagionMultiplier: number;
        behavioralMultiplier: number;
        deteriorationSpike: number;
    };
}

export interface AlgorithmWeights {
    wA: number;   // Acuity weight (default: 3.0)
    wV: number;   // Vulnerability weight (default: 1.5)
    wP: number;   // Pain index weight (default: 1.2)
    wR: number;   // Resource consumption weight (default: 1.0)
    wW: number;   // Wait time weight (default: 0.8)
    mC: number;   // Contagion multiplier (default: 0.3)
    mB: number;   // Behavioral risk multiplier (default: 0.2)
    wD: number;   // Deterioration spike weight (default: 2.5)
    tMax: number; // Max expected wait in minutes (default: 240)
}

// CTAS (Canadian Triage and Acuity Scale) level definitions
export const CTAS_LEVELS = [
    {
        level: 1,
        name: 'Resuscitation',
        description: 'Immediate life threat',
        acuityValue: 10,
        color: '#dc2626',
        bgColor: '#fef2f2',
        maxWaitMinutes: 0,
    },
    {
        level: 2,
        name: 'Emergent',
        description: 'Imminent threat to life',
        acuityValue: 8,
        color: '#ea580c',
        bgColor: '#fff7ed',
        maxWaitMinutes: 15,
    },
    {
        level: 3,
        name: 'Urgent',
        description: 'Serious condition',
        acuityValue: 6,
        color: '#ca8a04',
        bgColor: '#fefce8',
        maxWaitMinutes: 30,
    },
    {
        level: 4,
        name: 'Less urgent',
        description: 'Could delay treatment',
        acuityValue: 4,
        color: '#16a34a',
        bgColor: '#f0fdf4',
        maxWaitMinutes: 60,
    },
    {
        level: 5,
        name: 'Non-urgent',
        description: 'Non-urgent condition',
        acuityValue: 2,
        color: '#2563eb',
        bgColor: '#eff6ff',
        maxWaitMinutes: 120,
    },
] as const;

export type CTASLevel = 1 | 2 | 3 | 4 | 5;

// New patient intake form shape
export interface PatientIntakeForm {
    full_name: string;
    date_of_birth: string;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    phone?: string;
    emergency_contact?: string;
    chief_complaint: string;
    allergies?: string;
    notes?: string;
    // Triage variables
    ctas_level: CTASLevel;
    vulnerability: number;
    pain_index: number;
    resource_consumption: number;
    contagion_risk: number;
    behavioral_risk: number;
    deterioration_rate: number;
}
