// src/components/triage/AcuitySelector.tsx
'use client';

import { CTAS_LEVELS, type CTASLevel } from '@/types/triage';
import { cn } from '@/lib/utils';

interface AcuitySelectorProps {
    value: CTASLevel;
    onChange: (level: CTASLevel) => void;
}

export function AcuitySelector({ value, onChange }: AcuitySelectorProps) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Acuity Level (CTAS)</label>
            <div className="grid grid-cols-5 gap-2">
                {CTAS_LEVELS.map((level) => (
                    <button
                        key={level.level}
                        type="button"
                        onClick={() => onChange(level.level as CTASLevel)}
                        className={cn(
                            'flex flex-col items-center p-3 rounded-lg border-2 transition-all text-left',
                            'hover:scale-105 active:scale-95',
                            value === level.level
                                ? 'border-current shadow-md scale-105'
                                : 'border-transparent bg-muted hover:bg-muted/80'
                        )}
                        style={{
                            backgroundColor: value === level.level ? level.bgColor : undefined,
                            borderColor: value === level.level ? level.color : undefined,
                        }}
                    >
                        <span className="text-xl font-bold" style={{ color: level.color }}>
                            L{level.level}
                        </span>
                        <span className="text-xs font-medium mt-0.5" style={{ color: level.color }}>
                            {level.name}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1 text-center leading-tight hidden lg:block">
                            {level.description}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
