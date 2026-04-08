// src/app/api/departments/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';

export async function GET() {
    try {
        const supabase = await createServiceClient();

        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) return apiError(error.message);
        return apiSuccess(data);
    } catch {
        return apiError('Internal server error');
    }
}
