// src/app/api/vacancies/route.ts
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils';
import { z } from 'zod';

const CreateVacancySchema = z.object({
    department_id: z.string().uuid().optional(),
    title: z.string().min(3).max(200),
    specialization: z.string().min(2).max(100),
    qualification_required: z.string().optional(),
    experience_min_years: z.number().int().min(0).default(0),
    positions_available: z.number().int().min(1).default(1),
    employment_type: z.enum(['full_time', 'part_time', 'visiting', 'contract']).default('full_time'),
    description: z.string().optional(),
    salary_range: z.string().optional(),
    deadline: z.string().optional(),
    posted_by_id: z.string().uuid().optional(),
});

export async function GET(request: Request) {
    try {
        const supabase = await createServiceClient();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') ?? 'open';

        const { data, error } = await supabase
            .from('doctor_vacancies')
            .select('*, departments(name, code)')
            .eq('status', status)
            .order('created_at', { ascending: false });

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
        const parsed = CreateVacancySchema.safeParse(body);
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(', '), 400);
        }

        const { data, error } = await supabase
            .from('doctor_vacancies')
            .insert(parsed.data)
            .select('*, departments(name, code)')
            .single();

        if (error) return apiError(error.message);
        return apiSuccess(data, 201);
    } catch {
        return apiError('Internal server error');
    }
}
