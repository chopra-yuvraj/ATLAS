// src/app/(dashboard)/vacancies/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
    Briefcase, Plus, Building2, Clock, Users, Filter,
    Loader2, CheckCircle, XCircle, Pause
} from 'lucide-react';
import { PageGuard } from '@/components/layout/PageGuard';

interface Department {
    id: string;
    name: string;
    code: string;
}

interface Vacancy {
    id: string;
    title: string;
    specialization: string;
    qualification_required: string | null;
    experience_min_years: number;
    positions_available: number;
    positions_filled: number;
    employment_type: string;
    description: string | null;
    salary_range: string | null;
    status: string;
    deadline: string | null;
    created_at: string;
    departments?: { name: string; code: string };
}

const STATUS_BADGES: Record<string, { icon: React.ReactNode; color: string }> = {
    open: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: 'text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300' },
    closed: { icon: <XCircle className="h-3.5 w-3.5" />, color: 'text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300' },
    filled: { icon: <Users className="h-3.5 w-3.5" />, color: 'text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-300' },
    on_hold: { icon: <Pause className="h-3.5 w-3.5" />, color: 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300' },
};

const EMP_LABELS: Record<string, string> = {
    full_time: 'Full-Time',
    part_time: 'Part-Time',
    visiting: 'Visiting',
    contract: 'Contract',
};

export default function VacanciesPage() {
    return <PageGuard><VacanciesContent /></PageGuard>;
}

function VacanciesContent() {
    const [vacancies, setVacancies] = useState<Vacancy[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [statusFilter, setStatusFilter] = useState('open');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [form, setForm] = useState({
        department_id: '', title: '', specialization: '', qualification_required: '',
        experience_min_years: 0, positions_available: 1, employment_type: 'full_time',
        description: '', salary_range: '', deadline: '',
    });

    useEffect(() => {
        fetchVacancies();
        fetchDepartments();
    }, [statusFilter]);

    async function fetchVacancies() {
        try {
            const res = await fetch(`/api/vacancies?status=${statusFilter}`);
            const json = await res.json();
            if (json.data) setVacancies(json.data);
        } catch { /* ignore */ }
        finally { setIsLoading(false); }
    }

    async function fetchDepartments() {
        try {
            const res = await fetch('/api/departments');
            const json = await res.json();
            if (json.data) setDepartments(json.data);
        } catch { /* ignore */ }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage(null);
        try {
            const payload = {
                ...form,
                department_id: form.department_id || undefined,
                qualification_required: form.qualification_required || undefined,
                description: form.description || undefined,
                salary_range: form.salary_range || undefined,
                deadline: form.deadline || undefined,
            };
            const res = await fetch('/api/vacancies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                setMessage({ type: 'error', text: json.error ?? 'Failed' });
            } else {
                setMessage({ type: 'success', text: 'Vacancy posted successfully!' });
                setShowCreate(false);
                setForm({ department_id: '', title: '', specialization: '', qualification_required: '', experience_min_years: 0, positions_available: 1, employment_type: 'full_time', description: '', salary_range: '', deadline: '' });
                fetchVacancies();
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error' });
        } finally { setIsSubmitting(false); }
    }

    const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Briefcase className="h-6 w-6" />
                    <div>
                        <h1 className="text-2xl font-bold">Doctor Vacancies</h1>
                        <p className="text-sm text-muted-foreground">Manage recruitment postings for medical staff</p>
                    </div>
                </div>
                <button onClick={() => setShowCreate(!showCreate)}
                    className="inline-flex items-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                    <Plus className="h-4 w-4" /> Post Vacancy
                </button>
            </div>

            {message && (
                <div className={`text-sm rounded-md p-3 border ${message.type === 'error' ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-600 bg-green-50 border-green-200'}`}>
                    {message.text}
                </div>
            )}

            {showCreate && (
                <div className="bg-card rounded-lg border shadow-sm">
                    <div className="p-6 pb-4">
                        <h2 className="text-base font-semibold">Post New Vacancy</h2>
                    </div>
                    <div className="px-6 pb-6">
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Title *</label>
                                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Senior Cardiologist" className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Specialization *</label>
                                    <input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} required placeholder="e.g. Cardiology" className={inputClass} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Department</label>
                                    <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} className={inputClass}>
                                        <option value="">Select department...</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Employment Type</label>
                                    <select value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })} className={inputClass}>
                                        <option value="full_time">Full-Time</option>
                                        <option value="part_time">Part-Time</option>
                                        <option value="visiting">Visiting</option>
                                        <option value="contract">Contract</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Positions</label>
                                    <input type="number" min={1} value={form.positions_available} onChange={e => setForm({ ...form, positions_available: parseInt(e.target.value) || 1 })} className={inputClass} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Min Experience (years)</label>
                                    <input type="number" min={0} value={form.experience_min_years} onChange={e => setForm({ ...form, experience_min_years: parseInt(e.target.value) || 0 })} className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Salary Range</label>
                                    <input value={form.salary_range} onChange={e => setForm({ ...form, salary_range: e.target.value })} placeholder="e.g. ₹1.5L - ₹3L/month" className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Deadline</label>
                                    <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className={inputClass} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Description</label>
                                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Job description and requirements..." className={inputClass} />
                            </div>
                            <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50">
                                {isSubmitting ? 'Posting...' : 'Post Vacancy'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                {['open', 'on_hold', 'filled', 'closed'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
                        {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </button>
                ))}
            </div>

            {/* Vacancy List */}
            <div className="bg-card rounded-lg border shadow-sm">
                <div className="p-6 pb-4">
                    <h2 className="text-base font-semibold">Vacancies ({vacancies.length})</h2>
                </div>
                <div className="px-6 pb-6">
                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : vacancies.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No vacancies found.</p>
                    ) : (
                        <div className="space-y-3">
                            {vacancies.map(v => {
                                const st = STATUS_BADGES[v.status] || STATUS_BADGES.open;
                                return (
                                    <div key={v.id} className="p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{v.title}</h3>
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                                                        {st.icon} {v.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                    {v.departments && (
                                                        <span className="flex items-center gap-1">
                                                            <Building2 className="h-3 w-3" /> {v.departments.name}
                                                        </span>
                                                    )}
                                                    <span>{v.specialization}</span>
                                                    <span>{EMP_LABELS[v.employment_type] ?? v.employment_type}</span>
                                                    {v.experience_min_years > 0 && <span>{v.experience_min_years}+ yrs exp</span>}
                                                </div>
                                                {v.description && <p className="text-xs text-muted-foreground mt-1">{v.description}</p>}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-lg font-bold">{v.positions_filled}/{v.positions_available}</p>
                                                <p className="text-[10px] text-muted-foreground">positions filled</p>
                                                {v.salary_range && <p className="text-xs font-medium mt-1">{v.salary_range}</p>}
                                                {v.deadline && (
                                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end mt-1">
                                                        <Clock className="h-3 w-3" /> {new Date(v.deadline).toLocaleDateString()}
                                                    </p>
                                                )}
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
