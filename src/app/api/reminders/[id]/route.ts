// src/app/api/reminders/[id]/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createServiceClient();
        const body = await request.json();

        const { data, error } = await supabase
            .from('patient_reminders')
            .update(body)
            .eq('id', id)
            .select()
            .single();

        if (error) return apiError(error.message);
        return apiSuccess(data);
    } catch {
        return apiError('Internal server error');
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createServiceClient();

        const { error } = await supabase
            .from('patient_reminders')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (error) return apiError(error.message);
        return apiSuccess({ message: 'Reminder cancelled' });
    } catch {
        return apiError('Internal server error');
    }
}
