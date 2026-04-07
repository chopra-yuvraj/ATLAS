// src/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, UserPlus, Users, Stethoscope,
    Settings, Activity, LogOut, KeyRound
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
}

const NAV_ITEMS: NavItem[] = [
    { href: '/dashboard', label: 'Live Queue', icon: LayoutDashboard, roles: ['triage_nurse', 'doctor', 'admin', 'receptionist'] },
    { href: '/intake', label: 'New Patient', icon: UserPlus, roles: ['triage_nurse', 'admin'] },
    { href: '/tokens', label: 'Patient Tokens', icon: KeyRound, roles: ['triage_nurse', 'admin', 'receptionist'] },
    { href: '/doctor', label: 'Doctor View', icon: Stethoscope, roles: ['doctor', 'admin'] },
    { href: '/admin', label: 'Admin Panel', icon: Settings, roles: ['admin'] },
];

interface SidebarProps {
    role: StaffRole;
}

export function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role));

    async function handleSignOut() {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    }

    return (
        <div className="w-64 bg-slate-900 text-white flex flex-col h-full shrink-0">
            <div className="p-5 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <Activity className="h-6 w-6 text-red-400" />
                    <div>
                        <p className="font-semibold text-sm leading-tight">ED Triage</p>
                        <p className="text-xs text-slate-400 leading-tight">Priority Queue</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                                isActive
                                    ? 'bg-slate-700 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-700">
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 w-full transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Sign out
                </button>
            </div>
        </div>
    );
}
