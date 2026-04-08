// src/contexts/StaffContext.tsx
'use client';

import { createContext, useContext } from 'react';
import type { Staff, StaffRole } from '@/types/database';

interface StaffContextValue {
    staffProfile: Staff | null;
    role: StaffRole;
}

const StaffContext = createContext<StaffContextValue>({
    staffProfile: null,
    role: 'frontdesk',
});

export function StaffProvider({
    children,
    staffProfile,
}: {
    children: React.ReactNode;
    staffProfile: Staff | null;
}) {
    const role = (staffProfile?.role as StaffRole) ?? 'frontdesk';
    return (
        <StaffContext.Provider value={{ staffProfile, role }}>
            {children}
        </StaffContext.Provider>
    );
}

export function useStaff() {
    return useContext(StaffContext);
}

const ROLE_PAGES: Record<StaffRole, string[]> = {
    admin: ['/dashboard', '/intake', '/tokens', '/reminders', '/doctor', '/network', '/vacancies', '/load-balance', '/admin'],
    triage_nurse: ['/dashboard', '/intake', '/tokens', '/reminders'],
    doctor: ['/dashboard', '/doctor'],
    frontdesk: ['/dashboard', '/tokens'],
};

export function canAccessPage(role: StaffRole, pathname: string): boolean {
    const allowed = ROLE_PAGES[role] ?? [];
    return allowed.some(p => pathname.startsWith(p));
}
