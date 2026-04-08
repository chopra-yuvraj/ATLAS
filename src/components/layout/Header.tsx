// src/components/layout/Header.tsx
'use client';

import { useState, useEffect } from 'react';
import { Clock, Wifi, WifiOff, Bell, Sparkles } from 'lucide-react';
import type { Staff } from '@/types/database';
import { format } from 'date-fns';

interface HeaderProps {
    staffProfile: Staff | null;
}

const ROLE_LABELS: Record<string, string> = {
    triage_nurse: 'Triage Nurse',
    doctor: 'Physician',
    admin: 'Administrator',
    frontdesk: 'Front Desk',
};

const ROLE_GRADIENT: Record<string, string> = {
    admin: 'from-violet-500 to-purple-600',
    doctor: 'from-emerald-500 to-teal-600',
    triage_nurse: 'from-blue-500 to-cyan-600',
    frontdesk: 'from-amber-500 to-orange-600',
};

export function Header({ staffProfile }: HeaderProps) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const gradient = ROLE_GRADIENT[staffProfile?.role ?? ''] ?? 'from-slate-500 to-slate-600';

    return (
        <header className="h-14 border-b bg-background/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 relative z-10">
            {/* Left: Time & Status */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="font-mono tabular-nums" suppressHydrationWarning>
                        {format(currentTime, 'dd MMM yyyy')}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-foreground" suppressHydrationWarning>
                        {format(currentTime, 'HH:mm:ss')}
                    </span>
                </div>

                {/* Connection status */}
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                    isOnline
                        ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/50'
                        : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/50'
                }`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse-dot' : 'bg-red-500'}`} />
                    {isOnline
                        ? <><Wifi className="h-3 w-3" /> Real-time</>
                        : <><WifiOff className="h-3 w-3" /> Offline</>
                    }
                </div>
            </div>

            {/* Right: User info */}
            <div className="flex items-center gap-4">
                {/* Quick icons */}
                <button className="relative p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                    <Bell className="h-4 w-4" />
                </button>

                {staffProfile && (
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-semibold leading-tight flex items-center gap-1.5 justify-end">
                                {staffProfile.full_name}
                                {staffProfile.role === 'admin' && <Sparkles className="h-3 w-3 text-violet-500" />}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                                {ROLE_LABELS[staffProfile.role]} · {staffProfile.badge_number}
                            </p>
                        </div>
                        <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-sm font-bold text-white shadow-lg`}>
                            {staffProfile.full_name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
