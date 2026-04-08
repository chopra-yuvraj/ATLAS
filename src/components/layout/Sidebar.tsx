// src/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, UserPlus, Stethoscope,
    Settings, Activity, LogOut, KeyRound, Bell,
    Building2, Briefcase, Scale, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { StaffRole } from '@/types/database';

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: StaffRole[];
    section?: string;
}

const NAV_ITEMS: NavItem[] = [
    { href: '/dashboard', label: 'Live Queue', icon: LayoutDashboard, roles: ['triage_nurse', 'doctor', 'admin', 'frontdesk'], section: 'Operations' },
    { href: '/intake', label: 'New Patient', icon: UserPlus, roles: ['triage_nurse', 'admin'] },
    { href: '/tokens', label: 'Patient Tokens', icon: KeyRound, roles: ['triage_nurse', 'admin', 'frontdesk'] },
    { href: '/reminders', label: 'Reminders', icon: Bell, roles: ['triage_nurse', 'admin'] },
    { href: '/doctor', label: 'Doctor Portal', icon: Stethoscope, roles: ['doctor', 'admin'], section: 'Medical' },
    { href: '/network', label: 'Hospital Network', icon: Building2, roles: ['admin'], section: 'Management' },
    { href: '/vacancies', label: 'Vacancies', icon: Briefcase, roles: ['admin'] },
    { href: '/load-balance', label: 'Load Balance', icon: Scale, roles: ['admin'] },
    { href: '/admin', label: 'Admin Panel', icon: Settings, roles: ['admin'], section: 'System' },
];

const ROLE_LABELS: Record<string, string> = {
    triage_nurse: 'Triage Nurse',
    doctor: 'Physician',
    admin: 'Administrator',
    frontdesk: 'Front Desk',
};

const ROLE_COLORS: Record<string, string> = {
    admin: 'from-violet-500 to-purple-600',
    doctor: 'from-emerald-500 to-teal-600',
    triage_nurse: 'from-blue-500 to-cyan-600',
    frontdesk: 'from-amber-500 to-orange-600',
};

interface SidebarProps {
    role: StaffRole;
    staffName?: string;
}

export function Sidebar({ role, staffName }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role));

    async function handleSignOut() {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    }

    // Group items by section
    let lastSection = '';

    return (
        <div className="w-64 flex flex-col h-full shrink-0 relative overflow-hidden"
            style={{
                background: 'linear-gradient(180deg, hsl(224 71% 6%) 0%, hsl(215 28% 10%) 100%)',
            }}
        >
            {/* Decorative glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Logo / Branding */}
            <div className="p-5 border-b border-white/10 relative">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                            <Activity className="h-5 w-5 text-white animate-heartbeat" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse-dot" />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-white tracking-wide">A.T.L.A.S.</p>
                        <p className="text-[10px] text-slate-400 leading-tight">Smart Hospital System</p>
                    </div>
                </div>
            </div>

            {/* Role Badge */}
            <div className="px-5 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${ROLE_COLORS[role] ?? 'from-slate-500 to-slate-600'} flex items-center justify-center text-[10px] font-bold text-white`}>
                        {(staffName ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{staffName ?? 'User'}</p>
                        <p className="text-[10px] text-slate-400">{ROLE_LABELS[role] ?? role}</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                {visibleItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    const showSection = item.section && item.section !== lastSection;
                    if (item.section) lastSection = item.section;

                    return (
                        <div key={item.href} style={{ animationDelay: `${idx * 50}ms` }} className="animate-slide-in opacity-0">
                            {showSection && (
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1.5">
                                    {item.section}
                                </p>
                            )}
                            <Link
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                                    isActive
                                        ? 'bg-white/10 text-white shadow-lg shadow-blue-500/5'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                )}
                            >
                                {/* Active indicator bar */}
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-blue-400 to-cyan-400" />
                                )}
                                <Icon className={cn(
                                    'h-4 w-4 shrink-0 transition-colors',
                                    isActive ? 'text-blue-400' : 'group-hover:text-blue-400'
                                )} />
                                <span className="flex-1">{item.label}</span>
                                {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-400" />}
                            </Link>
                        </div>
                    );
                })}
            </nav>

            {/* Sign out */}
            <div className="p-3 border-t border-white/10">
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 w-full transition-all duration-200"
                >
                    <LogOut className="h-4 w-4" />
                    Sign out
                </button>
            </div>
        </div>
    );
}
