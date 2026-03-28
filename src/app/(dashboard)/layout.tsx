// src/app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) redirect('/login');

    const { data: staffProfile } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <Sidebar role={staffProfile?.role ?? 'triage_nurse'} />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header staffProfile={staffProfile} />
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
