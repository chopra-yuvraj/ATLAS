// src/app/(patient)/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ATLAS Patient Portal — Hospital Intake',
    description: 'Multilingual patient intake powered by AI voice assistant',
};

export default function PatientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
            {children}
        </div>
    );
}
