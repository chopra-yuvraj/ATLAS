// src/app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { StaffProvider } from '@/contexts/StaffContext';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) redirect('/login');

    // Use service client to bypass RLS — staff lookup is server-side only
    const serviceClient = await createServiceClient();
    const { data: staffProfile } = await serviceClient
        .from('staff')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

    const role = staffProfile?.role ?? 'frontdesk';
    const staffName = staffProfile?.full_name ?? session.user.email?.split('@')[0] ?? 'User';

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <Sidebar role={role} staffName={staffName} />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header staffProfile={staffProfile} />
                <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
                    <StaffProvider staffProfile={staffProfile}>
                        {children}
                    </StaffProvider>
                </main>
            </div>
        </div>
    );
}
