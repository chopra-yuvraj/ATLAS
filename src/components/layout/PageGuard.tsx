// src/components/layout/PageGuard.tsx
'use client';

import { useStaff, canAccessPage } from '@/contexts/StaffContext';
import { usePathname } from 'next/navigation';
import { ShieldX, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export function PageGuard({ children }: { children: React.ReactNode }) {
    const { role, staffProfile } = useStaff();
    const pathname = usePathname();

    // If no staff profile found at all, show a different message
    if (!staffProfile) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4 animate-fade-in">
                <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold">Staff Profile Not Found</h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        Your account doesn&apos;t have a linked staff profile yet.
                        Please contact your system administrator to set up your account.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => window.location.reload()}
                        className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
                        Refresh Page
                    </button>
                    <Link href="/api/fix-staff" target="_blank"
                        className="text-sm font-medium border border-input px-4 py-2 rounded-lg hover:bg-accent">
                        Fix My Profile
                    </Link>
                </div>
            </div>
        );
    }

    if (!canAccessPage(role, pathname)) {
        const roleLabel = role.replace('_', ' ');
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4 animate-fade-in">
                <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <ShieldX className="h-8 w-8 text-red-500" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold">Access Denied</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Your role (<span className="font-semibold">{roleLabel}</span>) does not have access to this page.
                    </p>
                </div>
                <Link
                    href="/dashboard"
                    className="text-sm font-medium text-primary hover:underline"
                >
                    ← Back to Dashboard
                </Link>
            </div>
        );
    }

    return <>{children}</>;
}
