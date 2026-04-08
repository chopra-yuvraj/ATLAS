// src/app/(dashboard)/load-balance/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
    Scale, Loader2, Users, AlertTriangle, CheckCircle,
    Coffee, Moon, Stethoscope, RefreshCw
} from 'lucide-react';
import { PageGuard } from '@/components/layout/PageGuard';

interface DoctorLoad {
    id: string;
    specialization: string;
    current_load: number;
    max_concurrent_patients: number;
    availability_status: string;
    is_accepting_patients: boolean;
    last_patient_assigned_at: string | null;
    min_rest_minutes: number;
    consultation_room: string | null;
    staff: { full_name: string; badge_number: string };
    departments: { name: string; code: string } | null;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    available: { icon: <CheckCircle className="h-4 w-4" />, label: 'Available', color: 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300' },
    busy: { icon: <Users className="h-4 w-4" />, label: 'Busy', color: 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300' },
    on_break: { icon: <Coffee className="h-4 w-4" />, label: 'On Break', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900 dark:text-amber-300' },
    off_duty: { icon: <Moon className="h-4 w-4" />, label: 'Off Duty', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' },
    on_leave: { icon: <Moon className="h-4 w-4" />, label: 'On Leave', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' },
};

export default function LoadBalancePage() {
    return <PageGuard><LoadBalanceContent /></PageGuard>;
}

function LoadBalanceContent() {
    const [doctors, setDoctors] = useState<DoctorLoad[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { fetchDoctors(); }, []);

    async function fetchDoctors() {
        setIsLoading(true);
        try {
            const res = await fetch('/api/load-balance');
            const json = await res.json();
            if (json.data) setDoctors(json.data);
        } catch { /* ignore */ }
        finally { setIsLoading(false); }
    }

    // Summary stats
    const totalDoctors = doctors.length;
    const availableDoctors = doctors.filter(d => d.availability_status === 'available').length;
    const totalPatients = doctors.reduce((sum, d) => sum + d.current_load, 0);
    const avgLoad = totalDoctors > 0 ? (totalPatients / totalDoctors).toFixed(1) : '0';
    const overloaded = doctors.filter(d => d.current_load >= d.max_concurrent_patients).length;

    function getLoadColor(current: number, max: number) {
        if (max === 0) return 'bg-slate-300';
        const ratio = current / max;
        if (ratio >= 1) return 'bg-red-500';
        if (ratio >= 0.7) return 'bg-amber-500';
        return 'bg-emerald-500';
    }

    function getLoadBgColor(current: number, max: number) {
        if (max === 0) return '';
        const ratio = current / max;
        if (ratio >= 1) return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
        if (ratio >= 0.7) return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800';
        return '';
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Scale className="h-6 w-6" />
                    <div>
                        <h1 className="text-2xl font-bold">Patient Load Balancing</h1>
                        <p className="text-sm text-muted-foreground">Monitor and manage doctor workload distribution</p>
                    </div>
                </div>
                <button onClick={fetchDoctors} className="inline-flex items-center gap-2 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-4 py-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-card rounded-lg border shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold">{totalDoctors}</p>
                    <p className="text-xs text-muted-foreground">Total Doctors</p>
                </div>
                <div className="bg-card rounded-lg border shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{availableDoctors}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                </div>
                <div className="bg-card rounded-lg border shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold">{totalPatients}</p>
                    <p className="text-xs text-muted-foreground">Active Patients</p>
                </div>
                <div className="bg-card rounded-lg border shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold">{avgLoad}</p>
                    <p className="text-xs text-muted-foreground">Avg Load</p>
                </div>
                <div className="bg-card rounded-lg border shadow-sm p-4 text-center">
                    <p className={`text-2xl font-bold ${overloaded > 0 ? 'text-red-600' : 'text-green-600'}`}>{overloaded}</p>
                    <p className="text-xs text-muted-foreground">Overloaded</p>
                </div>
            </div>

            {/* Doctor Load Cards */}
            <div className="bg-card rounded-lg border shadow-sm">
                <div className="p-6 pb-4">
                    <h2 className="text-base font-semibold">Doctor Workload Distribution</h2>
                </div>
                <div className="px-6 pb-6">
                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : doctors.length === 0 ? (
                        <div className="text-center py-8">
                            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No doctor profiles found. Create doctor profiles from the Admin panel.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {doctors.map(d => {
                                const loadPercent = d.max_concurrent_patients > 0
                                    ? Math.min(100, (d.current_load / d.max_concurrent_patients) * 100)
                                    : 0;
                                const statusConfig = STATUS_CONFIG[d.availability_status] ?? STATUS_CONFIG.available;

                                return (
                                    <div key={d.id} className={`p-4 rounded-lg border transition-colors ${getLoadBgColor(d.current_load, d.max_concurrent_patients)}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <Stethoscope className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-sm">{d.staff?.full_name}</p>
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusConfig.color}`}>
                                                        {statusConfig.icon} {statusConfig.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span>{d.specialization}</span>
                                                    {d.departments && <span>· {d.departments.name}</span>}
                                                    {d.consultation_room && <span>· Room {d.consultation_room}</span>}
                                                </div>
                                            </div>
                                            <div className="w-48 shrink-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs text-muted-foreground">Load</span>
                                                    <span className="text-sm font-bold tabular-nums">
                                                        {d.current_load}/{d.max_concurrent_patients}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-secondary rounded-full h-2.5">
                                                    <div className={`h-2.5 rounded-full transition-all ${getLoadColor(d.current_load, d.max_concurrent_patients)}`}
                                                        style={{ width: `${loadPercent}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
