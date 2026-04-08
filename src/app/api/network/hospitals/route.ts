// src/app/api/network/hospitals/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';

export async function GET(request: Request) {
    try {
        const supabase = await createServiceClient();
        const { searchParams } = new URL(request.url);
        const resourceType = searchParams.get('resource_type');

        let query = supabase
            .from('hospital_network')
            .select('*, hospital_resources(*)')
            .eq('is_active', true)
            .order('distance_km', { ascending: true });

        const { data, error } = await query;
        if (error) return apiError(error.message);

        // Filter by resource availability if requested
        let filtered = data ?? [];
        if (resourceType) {
            filtered = filtered.filter(h =>
                h.hospital_resources?.some(
                    (r: { resource_type: string; available_count: number }) =>
                        r.resource_type === resourceType && r.available_count > 0
                )
            );
        }

        return apiSuccess(filtered);
    } catch {
        return apiError('Internal server error');
    }
}
