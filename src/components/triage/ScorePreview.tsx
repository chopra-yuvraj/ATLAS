// src/components/triage/ScorePreview.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { SEVERITY_COLORS } from '@/lib/utils';
import { TrendingUp, Clock } from 'lucide-react';
import type { SeverityTier } from '@/types/database';
import type { ScorePreviewResponse } from '@/types/api';

interface ScorePreviewProps {
    acuity: number;
    vulnerability: number;
    painIndex: number;
    resourceConsumption: number;
    contagionRisk: number;
    behavioralRisk: number;
    deteriorationRate: number;
}

const SEVERITY_LABELS: Record<SeverityTier, string> = {
    critical: 'Critical',
    urgent: 'Urgent',
    moderate: 'Moderate',
    minor: 'Minor',
    nonurgent: 'Non-urgent',
};

export function ScorePreview(props: ScorePreviewProps) {
    const [preview, setPreview] = useState<ScorePreviewResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchPreview = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acuity: props.acuity,
                    vulnerability: props.vulnerability,
                    pain_index: props.painIndex,
                    resource_consumption: props.resourceConsumption,
                    contagion_risk: props.contagionRisk,
                    behavioral_risk: props.behavioralRisk,
                    deterioration_rate: props.deteriorationRate,
                    wait_minutes: 0,
                }),
            });
            const json = await res.json();
            if (json.data) setPreview(json.data);
        } catch { }
        setIsLoading(false);
    }, [
        props.acuity, props.vulnerability, props.painIndex,
        props.resourceConsumption, props.contagionRisk,
        props.behavioralRisk, props.deteriorationRate,
    ]);

    useEffect(() => {
        const timer = setTimeout(fetchPreview, 300);
        return () => clearTimeout(timer);
    }, [fetchPreview]);

    const tier = (preview?.severity_tier as SeverityTier) ?? 'nonurgent';
    const colors = SEVERITY_COLORS[tier];

    return (
        <div className={`rounded-lg border-2 transition-colors p-4 ${colors.border}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Live Score Preview</span>
                </div>
                {isLoading && (
                    <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin opacity-50" />
                )}
            </div>

            <div className="flex items-end gap-4">
                <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Priority score</p>
                    <p className={`text-4xl font-bold tabular-nums ${colors.text}`}>
                        {preview ? preview.s_final.toFixed(1) : '—'}
                    </p>
                </div>

                <div className="pb-1 space-y-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>
                        {SEVERITY_LABELS[tier]}
                    </span>
                    <p className="text-xs text-muted-foreground">
                        Base: {preview ? preview.s_base.toFixed(1) : '—'}
                    </p>
                </div>
            </div>

            {/* Score breakdown bars */}
            {preview && (
                <div className="mt-4 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Score breakdown</p>
                    {[
                        { label: 'Acuity', value: preview.breakdown.acuity_contribution, max: 300 },
                        { label: 'Vulnerability', value: preview.breakdown.vulnerability_contribution, max: 15 },
                        { label: 'Pain', value: preview.breakdown.pain_contribution, max: 12 },
                        { label: 'Deterioration spike', value: preview.breakdown.deterioration_spike, max: 250 },
                    ].map(({ label, value, max }) => (
                        <div key={label} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${colors.dot}`}
                                    style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                                />
                            </div>
                            <span className="text-xs tabular-nums w-12 text-right text-muted-foreground">
                                {value.toFixed(1)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Score increases as wait time grows</span>
            </div>
        </div>
    );
}
