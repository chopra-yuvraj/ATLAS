// src/app/api/patients/[id]/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';
import { z } from 'zod';

const UpdatePatientSchema = z.object({
    status: z.enum(['waiting', 'in_treatment', 'discharged', 'transferred', 'deceased']).optional(),
    assigned_bed_id: z.string().uuid().nullable().optional(),
    notes: z.string().optional(),
    treatment_started_at: z.string().optional(),
    discharged_at: z.string().optional(),
});

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createServiceClient();

        const { data, error } = await supabase
            .from('patients')
            .select(`
        *,
        triage_scores(*),
        beds(id, label, ward, bed_type),
        staff:admitted_by_id(id, full_name, role, badge_number),
        queue_snapshots(
          id, s_final, queue_rank, snapshot_at, trigger_source,
          acuity, pain_index, deterioration_rate, wait_minutes
        )
      `)
            .eq('id', id)
            .order('snapshot_at', { referencedTable: 'queue_snapshots', ascending: false })
            .limit(20, { referencedTable: 'queue_snapshots' })
            .single();

        if (error) return apiError('Patient not found', 404);

        return apiSuccess(data);
    } catch {
        return apiError('Internal server error');
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createServiceClient();
        const body = await request.json();

        const parsed = UpdatePatientSchema.safeParse(body);
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(i => i.message).join(', '), 400);
        }

        const updateData: Record<string, unknown> = { ...parsed.data };

        if (parsed.data.status === 'in_treatment' && !parsed.data.treatment_started_at) {
            updateData.treatment_started_at = new Date().toISOString();
        }
        if (parsed.data.status === 'discharged' && !parsed.data.discharged_at) {
            updateData.discharged_at = new Date().toISOString();
        }

        if (parsed.data.status && ['discharged', 'transferred', 'deceased'].includes(parsed.data.status)) {
            const { data: patient } = await supabase
                .from('patients')
                .select('assigned_bed_id')
                .eq('id', id)
                .single();

            if (patient?.assigned_bed_id) {
                await supabase
                    .from('beds')
                    .update({ is_occupied: false })
                    .eq('id', patient.assigned_bed_id);
            }
        }

        if (parsed.data.assigned_bed_id) {
            await supabase
                .from('beds')
                .update({ is_occupied: true })
                .eq('id', parsed.data.assigned_bed_id);
        }

        const { data, error } = await supabase
            .from('patients')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) return apiError(error.message);

        if (parsed.data.status) {
            await supabase.rpc('rerank_queue');
        }

        return apiSuccess(data);
    } catch {
        return apiError('Internal server error');
    }
}
