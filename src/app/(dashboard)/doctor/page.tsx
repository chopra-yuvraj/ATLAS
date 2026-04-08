// src/app/(dashboard)/doctor/page.tsx
// Enhanced Doctor Portal with tabbed workspace
'use client';

import { useState, useEffect } from 'react';
import {
    Stethoscope, Users, Calendar, FileText, Clock, AlertTriangle,
    Activity, Loader2, UserCheck, Pill, ArrowRight, ChevronRight
} from 'lucide-react';
import { formatWaitTime } from '@/lib/utils';
import { PageGuard } from '@/components/layout/PageGuard';

interface TriageScore {
    acuity: number;
    pain_index: number;
    deterioration_rate: number;
    s_final: number;
}

interface PatientData {
    id: string;
    mrn: string;
    full_name: string;
    age: number;
    gender: string;
    chief_complaint: string;
    allergies: string[] | null;
    status: string;
    arrived_at: string;
    notes: string | null;
    triage_scores: TriageScore[];
}

interface Assignment {
    id: string;
    assigned_at: string;
    patients: PatientData;
}

interface ScheduleSlot {
    id: string;
    day_of_week: number;
    shift_start: string;
    shift_end: string;
    is_active: boolean;
}

interface QueueEntry {
    patient_id: string;
    full_name: string;
    chief_complaint: string;
    severity_tier: string;
    s_final: number | null;
    wait_minutes: number;
    queue_rank: number | null;
    acuity: number;
    pain_index: number;
    deterioration_rate: number;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STATUS_COLORS: Record<string, string> = {
    waiting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    in_treatment: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    discharged: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export default function DoctorPage() {
    return <PageGuard><DoctorContent /></PageGuard>;
}

function DoctorContent() {
    const [activeTab, setActiveTab] = useState<'patients' | 'schedule' | 'queue'>('patients');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
    const [queue, setQueue] = useState<QueueEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasDoctorProfile, setHasDoctorProfile] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setIsLoading(true);
        try {
            const [pRes, sRes, qRes] = await Promise.all([
                fetch('/api/doctor/patients'),
                fetch('/api/doctor/schedule'),
                fetch('/api/queue'),
            ]);

            const pJson = await pRes.json();
            const sJson = await sRes.json();
            const qJson = await qRes.json();

            if (pRes.status === 404) {
                setHasDoctorProfile(false);
            } else if (pJson.data) {
                setAssignments(pJson.data);
            }
            if (sJson.data) setSchedule(sJson.data);
            if (qJson.data) setQueue(qJson.data);
        } catch { /* ignore */ }
        finally { setIsLoading(false); }
    }

    async function updatePatientStatus(patientId: string, status: string) {
        await fetch(`/api/patients/${patientId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        fetchData();
    }

    const tabs = [
        { key: 'patients', label: 'My Patients', icon: Users, count: assignments.length },
        { key: 'schedule', label: 'Schedule', icon: Calendar },
        { key: 'queue', label: 'Live Queue', icon: Activity, count: queue.length },
    ] as const;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <Stethoscope className="h-6 w-6" />
                <div>
                    <h1 className="text-2xl font-bold">Doctor Portal</h1>
                    <p className="text-sm text-muted-foreground">Manage your patients, schedule, and view the live queue</p>
                </div>
            </div>

            {!hasDoctorProfile && (
                <div className="text-sm rounded-md p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    No doctor profile found for your account. Ask an admin to set up your doctor profile.
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}>
                            <Icon className="h-4 w-4" />
                            {tab.label}
                            {'count' in tab && tab.count !== undefined && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary">{tab.count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
                <>
                    {/* My Patients Tab */}
                    {activeTab === 'patients' && (
                        <div className="space-y-4">
                            {assignments.length === 0 ? (
                                <div className="bg-card rounded-lg border p-8 text-center">
                                    <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground">No patients currently assigned to you.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {assignments.map(a => {
                                        const p = a.patients;
                                        const ts = p.triage_scores?.[0];
                                        return (
                                            <div key={a.id} className="bg-card rounded-lg border shadow-sm p-5 hover:shadow-md transition-shadow">
                                                <div className="flex items-start gap-4">
                                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                                                        {p.full_name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-semibold">{p.full_name}</h3>
                                                            <span className="text-xs text-muted-foreground">MRN: {p.mrn}</span>
                                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] ?? 'bg-secondary'}`}>
                                                                {p.status.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">{p.chief_complaint}</p>
                                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                            <span>{p.age}y · {p.gender}</span>
                                                            {p.allergies && p.allergies.length > 0 && (
                                                                <span className="flex items-center gap-1 text-red-500">
                                                                    <Pill className="h-3 w-3" /> {p.allergies.join(', ')}
                                                                </span>
                                                            )}
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" /> Assigned {new Date(a.assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        {p.notes && <p className="text-xs mt-1 p-2 bg-secondary/50 rounded">{p.notes}</p>}
                                                    </div>
                                                    {ts && (
                                                        <div className="grid grid-cols-3 gap-3 text-center shrink-0">
                                                            <div>
                                                                <p className="text-lg font-bold">{ts.acuity}</p>
                                                                <p className="text-[10px] text-muted-foreground">Acuity</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-lg font-bold">{ts.pain_index}</p>
                                                                <p className="text-[10px] text-muted-foreground">Pain</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-lg font-bold text-red-600">{ts.s_final?.toFixed(1)}</p>
                                                                <p className="text-[10px] text-muted-foreground">Score</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Actions */}
                                                <div className="flex gap-2 mt-4 pt-3 border-t">
                                                    {p.status === 'waiting' && (
                                                        <button onClick={() => updatePatientStatus(p.id, 'in_treatment')}
                                                            className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-md">
                                                            <ArrowRight className="h-3 w-3" /> Start Treatment
                                                        </button>
                                                    )}
                                                    {p.status === 'in_treatment' && (
                                                        <button onClick={() => updatePatientStatus(p.id, 'discharged')}
                                                            className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-md">
                                                            <ChevronRight className="h-3 w-3" /> Discharge
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Schedule Tab */}
                    {activeTab === 'schedule' && (
                        <div className="bg-card rounded-lg border shadow-sm">
                            <div className="p-6 pb-4">
                                <h2 className="text-base font-semibold flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Weekly Schedule
                                </h2>
                            </div>
                            <div className="px-6 pb-6">
                                {schedule.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">No schedule configured. Contact admin to set up your schedule.</p>
                                ) : (
                                    <div className="grid grid-cols-7 gap-2">
                                        {DAYS.map((day, i) => {
                                            const slots = schedule.filter(s => s.day_of_week === i);
                                            const isToday = new Date().getDay() === i;
                                            return (
                                                <div key={i} className={`rounded-lg border p-3 ${isToday ? 'border-primary bg-primary/5' : ''}`}>
                                                    <p className={`text-xs font-semibold mb-2 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{day.slice(0, 3)}</p>
                                                    {slots.length === 0 ? (
                                                        <p className="text-[10px] text-muted-foreground">Off</p>
                                                    ) : (
                                                        slots.map(s => (
                                                            <div key={s.id} className="text-xs bg-primary/10 text-primary rounded px-2 py-1 mb-1">
                                                                {s.shift_start.slice(0, 5)} - {s.shift_end.slice(0, 5)}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Queue Tab */}
                    {activeTab === 'queue' && (
                        <div className="bg-card rounded-lg border shadow-sm">
                            <div className="p-6 pb-4">
                                <h2 className="text-base font-semibold flex items-center gap-2">
                                    <Activity className="h-4 w-4" /> Live Queue
                                </h2>
                                <p className="text-sm text-muted-foreground">Read-only view — contact triage nurse for updates</p>
                            </div>
                            <div className="px-6 pb-6">
                                {queue.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">No patients currently waiting.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {queue.map(p => (
                                            <div key={p.patient_id} className="flex items-center gap-4 p-3 border rounded-lg">
                                                <div className="text-xl font-bold text-muted-foreground w-8">#{p.queue_rank}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm">{p.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{p.chief_complaint}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold tabular-nums">{p.s_final?.toFixed(1)}</p>
                                                    <p className="text-[10px] text-muted-foreground">score</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium text-sm">{formatWaitTime(p.wait_minutes)}</p>
                                                    <p className="text-[10px] text-muted-foreground">waiting</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
