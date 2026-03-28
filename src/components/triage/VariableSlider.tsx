// src/components/triage/VariableSlider.tsx
'use client';

import { cn } from '@/lib/utils';

interface VariableSliderProps {
    id: string;
    label: string;
    description: string;
    value: number;
    onChange: (value: number) => void;
    hints?: { low: string; high: string };
    inverted?: boolean;
}

function getSliderColor(value: number, inverted = false): string {
    const effective = inverted ? 10 - value : value;
    if (effective >= 7) return 'text-red-600';
    if (effective >= 4) return 'text-amber-600';
    return 'text-green-600';
}

export function VariableSlider({
    id, label, description, value, onChange, hints, inverted = false
}: VariableSliderProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div>
                    <label htmlFor={id} className="text-sm font-medium">{label}</label>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <span className={cn(
                    'text-2xl font-bold tabular-nums w-8 text-right',
                    getSliderColor(value, inverted)
                )}>
                    {value}
                </span>
            </div>

            <input
                id={id}
                type="range"
                min={0}
                max={10}
                step={1}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />

            {hints && (
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{hints.low}</span>
                    <span>{hints.high}</span>
                </div>
            )}
        </div>
    );
}
