// src/components/queue/QueueBoard.tsx
'use client';

import { useState } from 'react';
import { useRealtimeQueue } from '@/hooks/useRealtimeQueue';
import { SeverityBadge } from './SeverityBadge';
import { PatientDrawer } from './PatientDrawer';
import { formatWaitTime, formatTimeAgo, cn, SEVERITY_COLORS } from '@/lib/utils';
import type { QueueEntry } from '@/types/database';
import { RefreshCw, Users, AlertTriangle, StickyNote } from 'lucide-react';

export function QueueBoard() {
    const { queue, isLoading, error, lastUpdated, changedPatients, refresh } = useRealtimeQueue();
    const [selectedPatient, setSelectedPatient] = useState<QueueEntry | null>(null);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <p className="font-medium text-red-500">Failed to load queue</p>
                <p className="text-sm">{error}</p>
                <button onClick={refresh} className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted">
                    Retry
                </button>
            </div>
        );
    }

    const criticalCount = queue.filter(p => p.severity_tier === 'critical').length;
    const urgentCount = queue.filter(p => p.severity_tier === 'urgent').length;

    return (
        <div className="space-y-4">
            {/* Stats bar */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{queue.length}</span>
                        <span className="text-muted-foreground">waiting</span>
                    </div>
                    {criticalCount > 0 && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium animate-pulse ${SEVERITY_COLORS.critical.badge}`}>
                            {criticalCount} critical
                        </span>
                    )}
                    {urgentCount > 0 && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS.urgent.badge}`}>
                            {urgentCount} urgent
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {lastUpdated && (
                        <span className="text-xs text-muted-foreground">
                            Updated {formatTimeAgo(lastUpdated.toISOString())}
                        </span>
                    )}
                    <button
                        onClick={refresh}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 text-sm border rounded-md px-3 py-1.5 hover:bg-muted disabled:opacity-50"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Queue table */}
            <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-muted/50 border-b">
                            <th className="w-12 text-center p-3 font-medium text-muted-foreground">Rank</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Patient</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Complaint</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Severity</th>
                            <th className="text-right p-3 font-medium text-muted-foreground">Score</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Waiting</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Acuity</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Pain</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Detn.</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-b">
                                    {Array.from({ length: 10 }).map((_, j) => (
                                        <td key={j} className="p-3">
                                            <div className="h-4 bg-muted animate-pulse rounded" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : queue.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="h-24 text-center text-muted-foreground">
                                    No patients currently waiting
                                </td>
                            </tr>
                        ) : (
                            queue.map((patient) => {
                                const isChanged = changedPatients.has(patient.patient_id);
                                const isCritical = patient.severity_tier === 'critical';
                                const hasOverride = patient.override_rank !== null;
                                const rank = patient.override_rank ?? patient.queue_rank ?? 99;
                                const colors = SEVERITY_COLORS[patient.severity_tier];

                                return (
                                    <tr
                                        key={patient.patient_id}
                                        className={cn(
                                            'cursor-pointer transition-colors border-b last:border-b-0',
                                            colors.row,
                                            isChanged && 'rank-changed',
                                            isCritical && 'critical-row',
                                            'hover:bg-muted/50'
                                        )}
                                        onClick={() => setSelectedPatient(patient)}
                                    >
                                        <td className="text-center p-3">
                                            <div className="flex flex-col items-center">
                                                <span className={cn(
                                                    'text-lg font-bold tabular-nums',
                                                    rank === 1 && 'text-red-600',
                                                    rank === 2 && 'text-orange-600',
                                                )}>
                                                    #{rank}
                                                </span>
                                                {hasOverride && (
                                                    <span className="text-xs text-amber-600">Override</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div>
                                                <p className="font-medium text-sm">{patient.full_name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{patient.mrn}</p>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <p className="text-sm max-w-32 truncate" title={patient.chief_complaint}>
                                                {patient.chief_complaint}
                                            </p>
                                            {patient.notes && (
                                                <p className="text-[11px] text-muted-foreground mt-0.5 max-w-32 truncate flex items-center gap-1" title={patient.notes}>
                                                    <StickyNote className="h-3 w-3 text-amber-500 shrink-0" />
                                                    {patient.notes}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <SeverityBadge tier={patient.severity_tier} />
                                        </td>
                                        <td className="text-right p-3">
                                            <span className={cn('font-bold tabular-nums', colors.text)}>
                                                {patient.s_final?.toFixed(1) ?? '—'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <span className={cn(
                                                'text-sm font-medium',
                                                patient.wait_minutes > 60 && 'text-amber-600',
                                                patient.wait_minutes > 120 && 'text-red-600',
                                            )}>
                                                {formatWaitTime(patient.wait_minutes)}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <span className={cn(
                                                'font-medium tabular-nums',
                                                patient.acuity >= 8 && 'text-red-600',
                                                patient.acuity >= 5 && patient.acuity < 8 && 'text-amber-600',
                                            )}>
                                                {patient.acuity}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <span className="tabular-nums">{patient.pain_index}</span>
                                        </td>
                                        <td className="p-3">
                                            <span className={cn(
                                                'tabular-nums font-medium',
                                                patient.deterioration_rate >= 7 && 'text-red-600 font-bold',
                                                patient.deterioration_rate >= 4 && patient.deterioration_rate < 7 && 'text-amber-600',
                                            )}>
                                                {patient.deterioration_rate}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <span className="text-xs text-muted-foreground">
                                                {formatTimeAgo(patient.last_updated_at)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {selectedPatient && (
                <PatientDrawer
                    patient={selectedPatient}
                    onClose={() => setSelectedPatient(null)}
                    onUpdate={() => {
                        setSelectedPatient(null);
                        refresh();
                    }}
                />
            )}
        </div>
    );
}
