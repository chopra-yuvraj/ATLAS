// src/app/api/reminders/process/route.ts
// Cron-triggered endpoint: processes all due reminders and simulates delivery.
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';

export async function POST() {
    try {
        const supabase = await createServiceClient();
        const now = new Date().toISOString();

        // Fetch due reminders
        const { data: dueReminders, error: fetchError } = await supabase
            .from('patient_reminders')
            .select('*, patients(full_name, phone)')
            .eq('status', 'pending')
            .lte('scheduled_at', now)
            .limit(100);

        if (fetchError) return apiError(fetchError.message);
        if (!dueReminders || dueReminders.length === 0) {
            return apiSuccess({ processed: 0, message: 'No due reminders' });
        }

        let sent = 0;
        let failed = 0;

        for (const reminder of dueReminders) {
            const channels = reminder.delivery_channel === 'all'
                ? ['email', 'sms', 'portal'] as const
                : [reminder.delivery_channel] as const;

            let anySent = false;

            for (const channel of channels) {
                // Simulate delivery (in production, integrate Twilio/SendGrid)
                const success = Math.random() > 0.05; // 95% success rate

                await supabase.from('reminder_logs').insert({
                    reminder_id: reminder.id,
                    channel,
                    status: success ? 'sent' : 'failed',
                    recipient: channel === 'sms'
                        ? reminder.patients?.phone
                        : `${reminder.patients?.full_name ?? 'Patient'} (${channel})`,
                    error_message: success ? null : 'Simulated delivery failure',
                });

                if (success) anySent = true;
            }

            // Update reminder status
            await supabase
                .from('patient_reminders')
                .update({
                    status: anySent ? 'sent' : 'failed',
                    sent_at: anySent ? now : null,
                })
                .eq('id', reminder.id);

            if (anySent) sent++; else failed++;

            // Handle recurrence — create next reminder
            if (anySent && reminder.recurrence !== 'none') {
                const nextDate = new Date(reminder.scheduled_at);
                if (reminder.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
                else if (reminder.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                else if (reminder.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

                const endDate = reminder.recurrence_end_date
                    ? new Date(reminder.recurrence_end_date)
                    : null;

                if (!endDate || nextDate <= endDate) {
                    await supabase.from('patient_reminders').insert({
                        patient_id: reminder.patient_id,
                        created_by_id: reminder.created_by_id,
                        reminder_type: reminder.reminder_type,
                        title: reminder.title,
                        message: reminder.message,
                        scheduled_at: nextDate.toISOString(),
                        delivery_channel: reminder.delivery_channel,
                        recurrence: reminder.recurrence,
                        recurrence_end_date: reminder.recurrence_end_date,
                        priority: reminder.priority,
                        status: 'pending',
                    });
                }
            }
        }

        return apiSuccess({ processed: dueReminders.length, sent, failed });
    } catch {
        return apiError('Internal server error');
    }
}
