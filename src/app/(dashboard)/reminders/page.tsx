// src/app/(dashboard)/reminders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
    Bell, Plus, Clock, CheckCircle, XCircle, AlertTriangle, Search,
    Mail, MessageSquare, Monitor, Filter, CalendarClock, Loader2, Trash2
} from 'lucide-react';
import { PageGuard } from '@/components/layout/PageGuard';

interface Reminder {
    id: string;
    patient_id: string;
    reminder_type: string;
    title: string;
    message: string;
    scheduled_at: string;
    delivery_channel: string;
    recurrence: string;
    status: string;
    priority: string;
    sent_at: string | null;
    patients?: { full_name: string; mrn: string };
}

interface Patient {
    id: string;
    mrn: string;
    full_name: string;
}

const TYPE_BADGES: Record<string, { label: string; color: string; bgColor: string }> = {
    follow_up: { label: 'Follow-up', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900' },
    medication: { label: 'Medication', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900' },
    lab_test: { label: 'Lab Test', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900' },
    report_available: { label: 'Report', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900' },
    general: { label: 'General', color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-900' },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending: <Clock className="h-4 w-4 text-yellow-500" />,
    sent: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
    cancelled: <Trash2 className="h-4 w-4 text-slate-400" />,
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
    email: <Mail className="h-3.5 w-3.5" />,
    sms: <MessageSquare className="h-3.5 w-3.5" />,
    portal: <Monitor className="h-3.5 w-3.5" />,
    all: <Bell className="h-3.5 w-3.5" />,
};

export default function RemindersPage() {
    return <PageGuard><RemindersContent /></PageGuard>;
}

function RemindersContent() {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form state
    const [form, setForm] = useState({
        patient_id: '', reminder_type: 'follow_up', title: '', message: '',
        scheduled_at: '', delivery_channel: 'portal', recurrence: 'none', priority: 'normal',
    });

    useEffect(() => {
        fetchReminders();
        fetchPatients();
    }, []);

    async function fetchReminders() {
        try {
            const res = await fetch('/api/reminders?limit=100');
            const json = await res.json();
            if (json.data) setReminders(json.data);
        } catch { /* ignore */ }
        finally { setIsLoading(false); }
    }

    async function fetchPatients() {
        try {
            const res = await fetch('/api/patients?per_page=200');
            const json = await res.json();
            if (json.data) setPatients(json.data);
        } catch { /* ignore */ }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage(null);
        try {
            const res = await fetch('/api/reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                setMessage({ type: 'error', text: json.error ?? 'Failed to create reminder' });
            } else {
                setMessage({ type: 'success', text: 'Reminder scheduled successfully!' });
                setShowCreate(false);
                setForm({ patient_id: '', reminder_type: 'follow_up', title: '', message: '', scheduled_at: '', delivery_channel: 'portal', recurrence: 'none', priority: 'normal' });
                fetchReminders();
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error' });
        }
        finally { setIsSubmitting(false); }
    }

    async function handleCancel(id: string) {
        await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
        fetchReminders();
    }

    const filtered = reminders.filter(r => {
        if (filterStatus !== 'all' && r.status !== filterStatus) return false;
        if (filterType !== 'all' && r.reminder_type !== filterType) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return r.title.toLowerCase().includes(q) ||
                r.patients?.full_name?.toLowerCase().includes(q) ||
                r.patients?.mrn?.toLowerCase().includes(q);
        }
        return true;
    });

    const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bell className="h-6 w-6" />
                    <div>
                        <h1 className="text-2xl font-bold">Patient Reminders</h1>
                        <p className="text-sm text-muted-foreground">Schedule and manage patient notifications</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="inline-flex items-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                    <Plus className="h-4 w-4" />
                    New Reminder
                </button>
            </div>

            {message && (
                <div className={`text-sm rounded-md p-3 border ${message.type === 'error' ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-600 bg-green-50 border-green-200'}`}>
                    {message.text}
                </div>
            )}

            {/* Create Form */}
            {showCreate && (
                <div className="bg-card rounded-lg border shadow-sm">
                    <div className="p-6 pb-4">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <CalendarClock className="h-4 w-4" /> Schedule New Reminder
                        </h2>
                    </div>
                    <div className="px-6 pb-6">
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Patient *</label>
                                    <select value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} required className={inputClass}>
                                        <option value="">Select patient...</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.full_name} ({p.mrn})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Type *</label>
                                    <select value={form.reminder_type} onChange={e => setForm({ ...form, reminder_type: e.target.value })} className={inputClass}>
                                        <option value="follow_up">Follow-up Visit</option>
                                        <option value="medication">Medication Schedule</option>
                                        <option value="lab_test">Lab Test</option>
                                        <option value="report_available">Report Available</option>
                                        <option value="general">General</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Title *</label>
                                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Follow-up appointment" className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Scheduled Date/Time *</label>
                                    <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} required className={inputClass} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Message *</label>
                                <input value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required placeholder="Reminder message for the patient..." className={inputClass} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Channel</label>
                                    <select value={form.delivery_channel} onChange={e => setForm({ ...form, delivery_channel: e.target.value })} className={inputClass}>
                                        <option value="portal">Portal</option>
                                        <option value="email">Email</option>
                                        <option value="sms">SMS</option>
                                        <option value="all">All Channels</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Recurrence</label>
                                    <select value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })} className={inputClass}>
                                        <option value="none">None</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Priority</label>
                                    <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className={inputClass}>
                                        <option value="low">Low</option>
                                        <option value="normal">Normal</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50">
                                {isSubmitting ? 'Scheduling...' : 'Schedule Reminder'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input placeholder="Search reminders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm" />
                </div>
                <div className="flex items-center gap-1.5">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="sent">Sent</option>
                        <option value="failed">Failed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                        <option value="all">All Types</option>
                        <option value="follow_up">Follow-up</option>
                        <option value="medication">Medication</option>
                        <option value="lab_test">Lab Test</option>
                        <option value="report_available">Report</option>
                    </select>
                </div>
            </div>

            {/* Reminders List */}
            <div className="bg-card rounded-lg border shadow-sm">
                <div className="p-6 pb-4">
                    <h2 className="text-base font-semibold">All Reminders ({filtered.length})</h2>
                </div>
                <div className="px-6 pb-6">
                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No reminders found.</p>
                    ) : (
                        <div className="space-y-3">
                            {filtered.map(r => {
                                const typeInfo = TYPE_BADGES[r.reminder_type] || TYPE_BADGES.general;
                                return (
                                    <div key={r.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                                        <div className="shrink-0">{STATUS_ICONS[r.status] || STATUS_ICONS.pending}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-sm">{r.title}</p>
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${typeInfo.color} ${typeInfo.bgColor}`}>{typeInfo.label}</span>
                                                {r.priority === 'urgent' && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">{r.patients?.full_name} · {r.message}</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-muted-foreground">{CHANNEL_ICONS[r.delivery_channel]}</div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-medium">{new Date(r.scheduled_at).toLocaleDateString()}</p>
                                            <p className="text-[10px] text-muted-foreground">{new Date(r.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        {r.status === 'pending' && (
                                            <button onClick={() => handleCancel(r.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors" title="Cancel">
                                                <XCircle className="h-4 w-4 text-red-400" />
                                            </button>
                                        )}
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
