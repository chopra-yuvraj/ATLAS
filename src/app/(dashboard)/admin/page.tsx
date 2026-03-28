// src/app/(dashboard)/admin/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Settings, UserPlus, RefreshCw } from 'lucide-react';

export default function AdminPage() {
    const supabase = createClient();
    const [newStaff, setNewStaff] = useState({
        email: '', password: '', full_name: '', role: 'triage_nurse', badge_number: '',
    });
    const [isCreating, setIsCreating] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

    const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-3">
                <Settings className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Admin Panel</h1>
            </div>

            {message && (
                <div className={`text-sm rounded-md p-3 border ${message.type === 'error' ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-600 bg-green-50 border-green-200'}`}>
                    {message.text}
                </div>
            )}

            {/* Create staff account */}
            <div className="bg-card rounded-lg border shadow-sm">
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
                                    <option value="receptionist">Receptionist</option>
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
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50">
                            {isCreating ? 'Creating…' : 'Create account'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Manual recalculation */}
            <div className="bg-card rounded-lg border shadow-sm">
                <div className="p-6 pb-4">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" /> Manual queue recalculation
                    </h2>
                    <p className="text-sm text-muted-foreground">Force-recalculate all patient scores now (normally runs on cron)</p>
                </div>
                <div className="px-6 pb-6">
                    <button onClick={handleManualRecalc} disabled={isRecalculating}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 disabled:opacity-50">
                        {isRecalculating ? 'Recalculating…' : 'Run recalculation now'}
                    </button>
                </div>
            </div>
        </div>
    );
}
