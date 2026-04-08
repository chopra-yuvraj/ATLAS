// src/app/(dashboard)/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { QueueBoard } from '@/components/queue/QueueBoard';
import { Users, AlertTriangle, Clock, Stethoscope, Activity, TrendingUp } from 'lucide-react';

interface Stats {
    totalWaiting: number;
    critical: number;
    urgent: number;
    avgWaitMinutes: number;
    activeDoctors: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats>({ totalWaiting: 0, critical: 0, urgent: 0, avgWaitMinutes: 0, activeDoctors: 0 });

    useEffect(() => {
        async function fetchStats() {
            try {
                const [qRes, dRes] = await Promise.all([
                    fetch('/api/queue'),
                    fetch('/api/load-balance'),
                ]);
                const qJson = await qRes.json();
                const dJson = await dRes.json();

                const queue = qJson.data ?? [];
                const doctors = dJson.data ?? [];

                const totalWaiting = queue.length;
                const critical = queue.filter((p: { severity_tier: string }) => p.severity_tier === 'critical').length;
                const urgent = queue.filter((p: { severity_tier: string }) => p.severity_tier === 'urgent').length;
                const avgWaitMinutes = totalWaiting > 0
                    ? Math.round(queue.reduce((sum: number, p: { wait_minutes: number }) => sum + (p.wait_minutes ?? 0), 0) / totalWaiting)
                    : 0;
                const activeDoctors = doctors.filter((d: { availability_status: string }) => d.availability_status === 'available').length;

                setStats({ totalWaiting, critical, urgent, avgWaitMinutes, activeDoctors });
            } catch { /* ignore */ }
        }
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const statCards = [
        {
            label: 'Total Waiting',
            value: stats.totalWaiting,
            icon: Users,
            gradient: 'from-blue-500 to-cyan-500',
            shadow: 'shadow-blue-500/20',
        },
        {
            label: 'Critical',
            value: stats.critical,
            icon: AlertTriangle,
            gradient: 'from-red-500 to-rose-500',
            shadow: 'shadow-red-500/20',
            pulse: stats.critical > 0,
        },
        {
            label: 'Avg Wait',
            value: stats.avgWaitMinutes > 0 ? `${stats.avgWaitMinutes}m` : '—',
            icon: Clock,
            gradient: 'from-amber-500 to-orange-500',
            shadow: 'shadow-amber-500/20',
        },
        {
            label: 'Active Doctors',
            value: stats.activeDoctors,
            icon: Stethoscope,
            gradient: 'from-emerald-500 to-teal-500',
            shadow: 'shadow-emerald-500/20',
        },
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        Live Triage Queue
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Patients sorted by priority score — updates automatically in real time
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map(card => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className={`bg-card rounded-xl border shadow-sm p-4 hover:shadow-md transition-all ${card.pulse ? 'animate-glow' : ''}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg ${card.shadow}`}>
                                    <Icon className="h-4.5 w-4.5 text-white" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold tabular-nums">{card.value}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                        </div>
                    );
                })}
            </div>

            <QueueBoard />
        </div>
    );
}
