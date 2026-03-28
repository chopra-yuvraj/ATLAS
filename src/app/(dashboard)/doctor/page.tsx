// src/app/(dashboard)/doctor/page.tsx
// Read-only view optimized for physicians
import { createClient } from '@/lib/supabase/server';
import { SeverityBadge } from '@/components/queue/SeverityBadge';
import { formatWaitTime } from '@/lib/utils';
import type { QueueEntry } from '@/types/database';

export const revalidate = 0;

export default async function DoctorPage() {
    const supabase = await createClient();
    const { data: queue } = await supabase.from('active_queue').select('*');
    const patients = (queue ?? []) as QueueEntry[];

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Physician View</h1>
                <p className="text-sm text-muted-foreground">
                    Read-only queue — contact triage nurse for variable updates
                </p>
            </div>

            <div className="grid gap-3">
                {patients.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No patients currently waiting.</p>
                ) : (
                    patients.map(p => (
                        <div key={p.patient_id} className="border rounded-lg p-4 flex flex-wrap items-center gap-4 bg-card">
                            <div className="text-2xl font-bold text-muted-foreground w-10">
                                #{p.queue_rank}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold">{p.full_name}</p>
                                <p className="text-sm text-muted-foreground">{p.chief_complaint}</p>
                            </div>
                            <SeverityBadge tier={p.severity_tier} />
                            <div className="text-right">
                                <p className="font-bold tabular-nums">{p.s_final?.toFixed(1)}</p>
                                <p className="text-xs text-muted-foreground">score</p>
                            </div>
                            <div className="text-right">
                                <p className="font-medium">{formatWaitTime(p.wait_minutes)}</p>
                                <p className="text-xs text-muted-foreground">waiting</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div>
                                    <p className="font-bold text-base">{p.acuity}</p>
                                    <p className="text-muted-foreground">Acuity</p>
                                </div>
                                <div>
                                    <p className="font-bold text-base">{p.pain_index}</p>
                                    <p className="text-muted-foreground">Pain</p>
                                </div>
                                <div>
                                    <p className="font-bold text-base text-red-600">{p.deterioration_rate}</p>
                                    <p className="text-muted-foreground">Detn.</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
