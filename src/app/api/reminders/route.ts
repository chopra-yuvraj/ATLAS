// src/app/api/reminders/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';
import { z } from 'zod';

const CreateReminderSchema = z.object({
    patient_id: z.string().uuid(),
    reminder_type: z.enum(['follow_up', 'medication', 'lab_test', 'report_available', 'general']),
    title: z.string().min(2).max(200),
    message: z.string().min(2).max(1000),
    scheduled_at: z.string(),
    delivery_channel: z.enum(['email', 'sms', 'portal', 'all']).default('portal'),
    recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
    recurrence_end_date: z.string().nullable().optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    created_by_id: z.string().uuid().optional(),
});

export async function GET(request: Request) {
    try {
        const supabase = await createServiceClient();
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('patient_id');
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const limit = parseInt(searchParams.get('limit') ?? '50');

        let query = supabase
            .from('patient_reminders')
            .select('*, patients(full_name, mrn)')
            .order('scheduled_at', { ascending: true })
            .limit(limit);

        if (patientId) query = query.eq('patient_id', patientId);
        if (status) query = query.eq('status', status);
        if (type) query = query.eq('reminder_type', type);

        const { data, error } = await query;
        if (error) return apiError(error.message);
        return apiSuccess(data);
    } catch {
        return apiError('Internal server error');
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient();
        const body = await request.json();
        const parsed = CreateReminderSchema.safeParse(body);
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(', '), 400);
        }

        const { data, error } = await supabase
            .from('patient_reminders')
            .insert(parsed.data)
            .select('*, patients(full_name, mrn)')
            .single();

        if (error) return apiError(error.message);
        return apiSuccess(data, 201);
    } catch {
        return apiError('Internal server error');
    }
}
