// src/types/api.ts

export interface ApiResponse<T = unknown> {
    data: T | null;
    error: string | null;
    status: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    perPage: number;
    error: string | null;
}

export interface ScorePreviewRequest {
    acuity: number;
    vulnerability: number;
    pain_index: number;
    resource_consumption: number;
    contagion_risk: number;
    behavioral_risk: number;
    deterioration_rate: number;
    wait_minutes?: number;
}

export interface ScorePreviewResponse {
    w_norm: number;
    s_base: number;
    s_final: number;
    severity_tier: string;
    breakdown: {
        acuity_contribution: number;
        vulnerability_contribution: number;
        pain_contribution: number;
        resource_contribution: number;
        wait_contribution: number;
        contagion_multiplier: number;
        behavioral_multiplier: number;
        deterioration_spike: number;
    };
}

export interface TriageUpdateRequest {
    acuity?: number;
    vulnerability?: number;
    pain_index?: number;
    resource_consumption?: number;
    contagion_risk?: number;
    behavioral_risk?: number;
    deterioration_rate?: number;
    trigger_source?: string;
}
