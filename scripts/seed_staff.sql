-- ============================================================================
-- A.T.L.A.S. — Clean Staff Reset & Re-seed
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Remove all existing staff (cascades to doctor_profiles, assignments, etc.)
TRUNCATE TABLE public.staff RESTART IDENTITY CASCADE;

-- Step 2: Drop the role constraint temporarily (in case it still has 'receptionist')
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_role_check;

-- Step 3: Insert the 4 staff members
INSERT INTO public.staff (user_id, full_name, role, badge_number, is_active, specialization)
VALUES
    ('2debc96b-51b3-4693-b3a8-a4d247fff5d4', 'System Admin',  'admin',        'ADM-001', true, null),
    ('fc0dc4d0-aa3e-40eb-8def-1e73f45b1eab', 'Doctor Test',   'doctor',       'DOC-101', true, 'Emergency Medicine'),
    ('b6cd717c-66ff-44b5-862a-b6eb29704b8f', 'Nurse Test',    'triage_nurse', 'NRS-201', true, null),
    ('20c413e7-b4d0-48b6-9d22-c4780372f7f3', 'Front Desk',    'frontdesk',    'REC-301', true, null);

-- Step 4: Re-add the role constraint with 'frontdesk'
ALTER TABLE public.staff ADD CONSTRAINT staff_role_check
    CHECK (role IN ('admin', 'doctor', 'triage_nurse', 'frontdesk'));

-- Step 5: Create doctor profile for the doctor staff member
INSERT INTO public.doctor_profiles (staff_id, specialization, qualification, experience_years, max_concurrent_patients)
SELECT s.id, 'Emergency Medicine', 'MBBS, MD', 5, 5
FROM public.staff s WHERE s.badge_number = 'DOC-101'
ON CONFLICT (staff_id) DO NOTHING;

-- Verify
SELECT s.full_name, s.role, s.badge_number, s.user_id FROM public.staff s ORDER BY s.role;
