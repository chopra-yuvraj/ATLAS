// src/app/(dashboard)/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Settings, UserPlus, RefreshCw, Users, Stethoscope, Building2, Activity } from 'lucide-react';
import { PageGuard } from '@/components/layout/PageGuard';

interface StaffMember {
    id: string;
    full_name: string;
    role: string;
    badge_number: string;
    is_active: boolean;
    created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
    doctor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    triage_nurse: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    frontdesk: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

export default function AdminPage() {
    const supabase = createClient();
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [newStaff, setNewStaff] = useState({
        email: '', password: '', full_name: '', role: 'triage_nurse', badge_number: '',
    });
    const [isCreating, setIsCreating] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => { fetchStaff(); }, []);

    async function fetchStaff() {
        const { data } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
        if (data) setStaffList(data);
    }

    async function handleCreateStaff(e: React.FormEvent) {
        e.preventDefault();
        setIsCreating(true);
        setMessage(null);

        try {
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: newStaff.email,
                password: newStaff.password,
                email_confirm: true,
            });

            if (authError || !authData.user) {
                throw new Error(authError?.message ?? 'Failed to create user');
            }

            const { error: staffError } = await supabase.from('staff').insert({
                user_id: authData.user.id,
                full_name: newStaff.full_name,
                role: newStaff.role,
                badge_number: newStaff.badge_number,
            });

            if (staffError) throw new Error(staffError.message);

            setMessage({ type: 'success', text: `${newStaff.full_name} account created successfully.` });
            setNewStaff({ email: '', password: '', full_name: '', role: 'triage_nurse', badge_number: '' });
            fetchStaff();
        } catch (err: unknown) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unknown error' });
        } finally {
            setIsCreating(false);
        }
    }

    async function handleManualRecalc() {
        setIsRecalculating(true);
        setMessage(null);
        try {
            const res = await fetch('/api/recalc', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`,
                    'Content-Type': 'application/json',
                },
            });
            const json = await res.json();
            setMessage({ type: 'success', text: json.data?.message ?? 'Queue recalculated.' });
        } catch {
            setMessage({ type: 'error', text: 'Recalculation failed.' });
        } finally {
            setIsRecalculating(false);
        }
    }

    const inputClass = "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow";

    return (
        <PageGuard>
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Settings className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Admin Panel</h1>
                        <p className="text-sm text-muted-foreground">Manage staff accounts and system operations</p>
                    </div>
                </div>

                {message && (
                    <div className={`text-sm rounded-lg p-3 border flex items-center gap-2 ${message.type === 'error' ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800' : 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'}`}>
                        {message.text}
                    </div>
                )}

                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Staff', value: staffList.length, icon: Users, color: 'from-blue-500 to-cyan-500' },
                        { label: 'Doctors', value: staffList.filter(s => s.role === 'doctor').length, icon: Stethoscope, color: 'from-emerald-500 to-teal-500' },
                        { label: 'Nurses', value: staffList.filter(s => s.role === 'triage_nurse').length, icon: Activity, color: 'from-blue-500 to-indigo-500' },
                        { label: 'Departments', value: '15', icon: Building2, color: 'from-violet-500 to-purple-500' },
                    ].map(card => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} className="bg-card rounded-xl border shadow-sm p-4 hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                                        <Icon className="h-4 w-4 text-white" />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold">{card.value}</p>
                                <p className="text-xs text-muted-foreground">{card.label}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Create staff account */}
                <div className="bg-card rounded-xl border shadow-sm">
                    <div className="p-6 pb-4">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <UserPlus className="h-4 w-4" /> Create staff account
                        </h2>
                        <p className="text-sm text-muted-foreground">Add a new nurse, doctor, or admin user</p>
                    </div>
                    <div className="px-6 pb-6">
                        <form onSubmit={handleCreateStaff} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Full name</label>
                                    <input placeholder="Dr. Jane Smith" value={newStaff.full_name}
                                        onChange={e => setNewStaff({ ...newStaff, full_name: e.target.value })}
                                        required className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Badge number</label>
                                    <input placeholder="NURSE001" value={newStaff.badge_number}
                                        onChange={e => setNewStaff({ ...newStaff, badge_number: e.target.value })}
                                        required className={inputClass} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Email</label>
                                    <input type="email" placeholder="nurse@hospital.org" value={newStaff.email}
                                        onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                                        required className={inputClass} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Role</label>
                                    <select value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                                        className={inputClass}>
                                        <option value="triage_nurse">Triage nurse</option>
                                        <option value="doctor">Doctor</option>
                                        <option value="frontdesk">Front Desk</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Temporary password</label>
                                <input type="password" placeholder="Min 8 characters" value={newStaff.password}
                                    onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                                    required minLength={8} className={inputClass} />
                            </div>
                            <button type="submit" disabled={isCreating}
                                className="inline-flex items-center justify-center rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600 h-10 px-5 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all">
                                {isCreating ? 'Creating…' : 'Create account'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Staff List */}
                <div className="bg-card rounded-xl border shadow-sm">
                    <div className="p-6 pb-4">
                        <h2 className="text-base font-semibold">Current Staff ({staffList.length})</h2>
                    </div>
                    <div className="px-6 pb-6">
                        {staffList.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">No staff records found.</p>
                        ) : (
                            <div className="space-y-2">
                                {staffList.map(s => (
                                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                                            {s.full_name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{s.full_name}</p>
                                            <p className="text-xs text-muted-foreground">{s.badge_number}</p>
                                        </div>
                                        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${ROLE_COLORS[s.role] ?? 'bg-secondary'}`}>
                                            {s.role.replace('_', ' ')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Manual recalculation */}
                <div className="bg-card rounded-xl border shadow-sm">
                    <div className="p-6 pb-4">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" /> Manual queue recalculation
                        </h2>
                        <p className="text-sm text-muted-foreground">Force-recalculate all patient scores now (normally runs on cron)</p>
                    </div>
                    <div className="px-6 pb-6">
                        <button onClick={handleManualRecalc} disabled={isRecalculating}
                            className="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 disabled:opacity-50 transition-colors">
                            {isRecalculating ? 'Recalculating…' : 'Run recalculation now'}
                        </button>
                    </div>
                </div>
            </div>
        </PageGuard>
    );
}
