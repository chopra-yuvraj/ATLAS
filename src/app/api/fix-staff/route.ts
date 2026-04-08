// src/app/api/fix-staff/route.ts
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';

export async function GET() {
    try {
        const authSupabase = await createClient();
        const { data: { session } } = await authSupabase.auth.getSession();
        
        if (!session) {
            return apiError('You must be logged into ATLAS first to fix your profile. Go to /login, then come back here.', 401);
        }

        const supabase = await createServiceClient();
        const userId = session.user.id;
        const email = session.user.email || 'Admin';

        // Check if exists
        const { data: existing } = await supabase.from('staff').select('id, role').eq('user_id', userId).single();

        if (existing) {
            // Force it to be an admin and active
            await supabase.from('staff').update({
                role: 'admin',
                is_active: true
            }).eq('id', existing.id);
            return apiSuccess({ message: 'Your staff profile already existed and has been elevated back to an active Admin!', userId });
        }

        // Create it — infer role from email
        let role = 'frontdesk';
        const lower = email.toLowerCase();
        if (lower.includes('admin')) role = 'admin';
        else if (lower.includes('doctor') || lower.includes('doc')) role = 'doctor';
        else if (lower.includes('nurse')) role = 'triage_nurse';

        const { data: newStaff, error } = await supabase.from('staff').insert({
            user_id: userId,
            full_name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            role,
            badge_number: 'STAFF-' + Math.floor(Math.random() * 9000 + 1000),
            department: 'Emergency',
            is_active: true
        }).select().single();

        if (error) {
            return apiError('Failed to create staff profile: ' + error.message, 500);
        }

        return apiSuccess({
            message: `Successfully generated your staff profile! You are now an active ${role}.`,
            profile: newStaff
        });
        
    } catch (err: any) {
        return apiError('Exception: ' + err.message, 500);
    }
}
