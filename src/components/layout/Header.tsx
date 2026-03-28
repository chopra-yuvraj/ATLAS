// src/components/layout/Header.tsx
'use client';

import { useState, useEffect } from 'react';
import { Clock, Wifi, WifiOff } from 'lucide-react';
import type { Staff } from '@/types/database';
import { format } from 'date-fns';

interface HeaderProps {
    staffProfile: Staff | null;
}

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

    const roleLabels: Record<string, string> = {
        triage_nurse: 'Triage Nurse',
        doctor: 'Physician',
        admin: 'Administrator',
        receptionist: 'Receptionist',
    };

    return (
        <header className="h-14 border-b bg-background px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-mono text-muted-foreground" suppressHydrationWarning>
                    {format(currentTime, 'dd MMM yyyy HH:mm:ss')}
                </span>
            </div>

            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-1.5 text-xs ${isOnline ? 'text-green-600' : 'text-red-500'}`}>
                    {isOnline
                        ? <><Wifi className="h-3.5 w-3.5" /> Live</>
                        : <><WifiOff className="h-3.5 w-3.5" /> Offline</>
                    }
                </div>

                {staffProfile && (
                    <div className="flex items-center gap-2">
                        <div className="text-right">
                            <p className="text-sm font-medium leading-tight">{staffProfile.full_name}</p>
                            <p className="text-xs text-muted-foreground leading-tight">
                                {roleLabels[staffProfile.role]} · {staffProfile.badge_number}
                            </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-medium">
                            {staffProfile.full_name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
