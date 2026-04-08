-- ============================================================================
-- A.T.L.A.S. — Rename 'receptionist' role to 'frontdesk'
-- Run this in Supabase SQL Editor if you have existing receptionist staff
-- ============================================================================

DO $$
BEGIN
    -- 1. Drop old constraint first to allow the update
    ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_role_check;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Constraint drop skipped: %', SQLERRM;
END $$;

-- 2. Update any existing staff records
UPDATE public.staff SET role = 'frontdesk' WHERE role = 'receptionist';

DO $$
BEGIN
    -- 3. Add new constraint with 'frontdesk' instead of 'receptionist'
    ALTER TABLE public.staff ADD CONSTRAINT staff_role_check 
        CHECK (role IN ('admin', 'doctor', 'triage_nurse', 'frontdesk'));
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Constraint add skipped: %', SQLERRM;
END $$;

-- Verify
SELECT role, COUNT(*) FROM public.staff GROUP BY role;
