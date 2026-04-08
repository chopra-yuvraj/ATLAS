-- ============================================================================
-- A.T.L.A.S. Smart Hospital Management System — Full Migration
-- Paste this entire file into Supabase SQL Editor and run it.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────
-- 1. DEPARTMENTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    head_doctor_id UUID,
    floor_number INT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_read_all" ON public.departments FOR SELECT USING (true);
CREATE POLICY "departments_write_admin" ON public.departments FOR ALL USING (true);

-- ──────────────────────────────────────────────────────────────
-- 2. MODIFY STAFF TABLE — add specialization & department
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='specialization') THEN
        ALTER TABLE public.staff ADD COLUMN specialization TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='department_id') THEN
        ALTER TABLE public.staff ADD COLUMN department_id UUID REFERENCES public.departments(id);
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 3. DOCTOR PROFILES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id),
    specialization TEXT NOT NULL DEFAULT 'General Medicine',
    qualification TEXT,
    experience_years INT DEFAULT 0,
    max_concurrent_patients INT NOT NULL DEFAULT 5,
    current_load INT NOT NULL DEFAULT 0,
    availability_status TEXT NOT NULL DEFAULT 'available'
        CHECK (availability_status IN ('available','busy','on_break','off_duty','on_leave')),
    last_patient_assigned_at TIMESTAMPTZ,
    min_rest_minutes INT NOT NULL DEFAULT 10,
    consultation_room TEXT,
    is_accepting_patients BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(staff_id)
);

ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doctor_profiles_read_all" ON public.doctor_profiles FOR SELECT USING (true);
CREATE POLICY "doctor_profiles_write_admin" ON public.doctor_profiles FOR ALL USING (true);

-- ──────────────────────────────────────────────────────────────
-- 4. DOCTOR SCHEDULES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_profile_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    shift_start TIME NOT NULL,
    shift_end TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedules_read_all" ON public.doctor_schedules FOR SELECT USING (true);
CREATE POLICY "schedules_write_admin" ON public.doctor_schedules FOR ALL USING (true);

-- ──────────────────────────────────────────────────────────────
-- 5. MODIFY PATIENTS TABLE — add doctor & department assignment
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='assigned_doctor_id') THEN
        ALTER TABLE public.patients ADD COLUMN assigned_doctor_id UUID REFERENCES public.doctor_profiles(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='department_id') THEN
        ALTER TABLE public.patients ADD COLUMN department_id UUID REFERENCES public.departments(id);
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 6. PATIENT ASSIGNMENTS (load balancing audit trail)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_profile_id UUID NOT NULL REFERENCES public.doctor_profiles(id),
    department_id UUID REFERENCES public.departments(id),
    assignment_reason TEXT NOT NULL DEFAULT 'auto_load_balance',
    assignment_score NUMERIC(6,3),
    specialization_match BOOLEAN DEFAULT false,
    doctor_load_at_assignment INT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_read_all" ON public.patient_assignments FOR SELECT USING (true);
CREATE POLICY "assignments_write_admin" ON public.patient_assignments FOR ALL USING (true);

-- ──────────────────────────────────────────────────────────────
-- 7. PATIENT REMINDERS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES public.staff(id),
    reminder_type TEXT NOT NULL
        CHECK (reminder_type IN ('follow_up','medication','lab_test','report_available','general')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    delivery_channel TEXT NOT NULL DEFAULT 'portal'
        CHECK (delivery_channel IN ('email','sms','portal','all')),
    recurrence TEXT DEFAULT 'none'
        CHECK (recurrence IN ('none','daily','weekly','monthly')),
    recurrence_end_date DATE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','sent','failed','cancelled','snoozed')),
    sent_at TIMESTAMPTZ,
    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low','normal','high','urgent')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders_read_all" ON public.patient_reminders FOR SELECT USING (true);
CREATE POLICY "reminders_write_admin" ON public.patient_reminders FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_reminders_patient ON public.patient_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status_scheduled ON public.patient_reminders(status, scheduled_at);

-- ──────────────────────────────────────────────────────────────
-- 8. REMINDER LOGS (delivery audit trail)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID NOT NULL REFERENCES public.patient_reminders(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('email','sms','portal')),
    status TEXT NOT NULL CHECK (status IN ('sent','failed','pending','bounced')),
    recipient TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminder_logs_read_all" ON public.reminder_logs FOR SELECT USING (true);
CREATE POLICY "reminder_logs_write_admin" ON public.reminder_logs FOR ALL USING (true);

-- ──────────────────────────────────────────────────────────────
-- 9. HOSPITAL NETWORK
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hospital_network (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    address TEXT,
    city TEXT NOT NULL,
    state TEXT,
    phone TEXT,
    email TEXT,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    distance_km NUMERIC(6,1) DEFAULT 0,
    hospital_type TEXT DEFAULT 'general'
        CHECK (hospital_type IN ('general','specialty','trauma_center','teaching','clinic')),
    total_beds INT DEFAULT 0,
    available_beds INT DEFAULT 0,
    icu_total INT DEFAULT 0,
    icu_available INT DEFAULT 0,
    ventilators_total INT DEFAULT 0,
    ventilators_available INT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hospital_network ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hospital_network_read_all" ON public.hospital_network FOR SELECT USING (true);
CREATE POLICY "hospital_network_write_admin" ON public.hospital_network FOR ALL USING (true);

-- ──────────────────────────────────────────────────────────────
-- 10. HOSPITAL RESOURCES (per-hospital resource types)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hospital_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES public.hospital_network(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL
        CHECK (resource_type IN ('icu_bed','ventilator','specialist','diagnostic_equipment','blood_bank','operation_theater','ambulance','nicu_bed','dialysis_unit','mri','ct_scan','xray')),
    resource_name TEXT NOT NULL,
    total_count INT NOT NULL DEFAULT 0,
    available_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'operational'
        CHECK (status IN ('operational','limited','unavailable','maintenance')),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hospital_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources_read_all" ON public.hospital_resources FOR SELECT USING (true);
CREATE POLICY "resources_write_admin" ON public.hospital_resources FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_resources_hospital ON public.hospital_resources(hospital_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON public.hospital_resources(resource_type);

-- ──────────────────────────────────────────────────────────────
-- 11. PATIENT REFERRALS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    from_hospital_id UUID NOT NULL REFERENCES public.hospital_network(id),
    to_hospital_id UUID NOT NULL REFERENCES public.hospital_network(id),
    referred_by_id UUID REFERENCES public.staff(id),
    reason TEXT NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'routine'
        CHECK (urgency IN ('critical','urgent','routine')),
    required_resource TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','accepted','rejected','in_transit','completed','cancelled')),
    notes TEXT,
    accepted_at TIMESTAMPTZ,
    transfer_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals_read_all" ON public.patient_referrals FOR SELECT USING (true);
CREATE POLICY "referrals_write_admin" ON public.patient_referrals FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_referrals_patient ON public.patient_referrals(patient_id);

-- ──────────────────────────────────────────────────────────────
-- 12. DOCTOR VACANCIES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_vacancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES public.departments(id),
    title TEXT NOT NULL,
    specialization TEXT NOT NULL,
    qualification_required TEXT,
    experience_min_years INT DEFAULT 0,
    positions_available INT NOT NULL DEFAULT 1,
    positions_filled INT NOT NULL DEFAULT 0,
    employment_type TEXT NOT NULL DEFAULT 'full_time'
        CHECK (employment_type IN ('full_time','part_time','visiting','contract')),
    description TEXT,
    salary_range TEXT,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open','closed','filled','on_hold')),
    posted_by_id UUID REFERENCES public.staff(id),
    deadline DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_vacancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vacancies_read_all" ON public.doctor_vacancies FOR SELECT USING (true);
CREATE POLICY "vacancies_write_admin" ON public.doctor_vacancies FOR ALL USING (true);

-- ──────────────────────────────────────────────────────────────
-- 13. UPDATED_AT TRIGGER FUNCTION (reusable)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'departments','doctor_profiles','patient_reminders',
        'patient_referrals','doctor_vacancies'
    ]
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I; CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
            tbl, tbl, tbl, tbl
        );
    END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 14. DOCTOR LOAD UPDATE FUNCTION
-- Automatically update doctor current_load when assignments change
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_doctor_load()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.doctor_profiles
    SET current_load = (
        SELECT COUNT(*) FROM public.patient_assignments
        WHERE doctor_profile_id = COALESCE(NEW.doctor_profile_id, OLD.doctor_profile_id)
        AND is_active = true
    ),
    updated_at = now()
    WHERE id = COALESCE(NEW.doctor_profile_id, OLD.doctor_profile_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assignment_load_update ON public.patient_assignments;
CREATE TRIGGER trg_assignment_load_update
AFTER INSERT OR UPDATE OR DELETE ON public.patient_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_doctor_load();

-- ──────────────────────────────────────────────────────────────
-- 15. DOCTOR AVAILABILITY AUTO-UPDATE
-- When load reaches max, set status to 'busy'
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_doctor_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_load >= NEW.max_concurrent_patients THEN
        NEW.availability_status := 'busy';
        NEW.is_accepting_patients := false;
    ELSIF NEW.current_load < NEW.max_concurrent_patients AND OLD.availability_status = 'busy' THEN
        NEW.availability_status := 'available';
        NEW.is_accepting_patients := true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_doctor_availability ON public.doctor_profiles;
CREATE TRIGGER trg_auto_doctor_availability
BEFORE UPDATE ON public.doctor_profiles
FOR EACH ROW EXECUTE FUNCTION public.auto_doctor_availability();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- ── Departments ──
INSERT INTO public.departments (name, code, description, floor_number, keywords) VALUES
('Emergency Medicine',    'EM',    'Emergency department and trauma',            1, ARRAY['emergency','trauma','accident','injury','critical','resuscitation','burn','wound','laceration','MVA','fall']),
('Cardiology',            'CARD',  'Heart and cardiovascular diseases',          2, ARRAY['chest pain','heart','cardiac','ACS','palpitation','hypertension','arrhythmia','heart failure','coronary','angina','blood pressure']),
('Neurology',             'NEUR',  'Brain, spine and nervous system disorders',  2, ARRAY['stroke','seizure','headache','migraine','concussion','head injury','paralysis','numbness','CVA','brain','neurological','dizziness','vertigo']),
('Pulmonology',           'PULM',  'Respiratory and lung diseases',             3, ARRAY['asthma','breathing','pneumonia','COPD','cough','respiratory','lung','bronchitis','tuberculosis','TB','dyspnea','COVID','wheezing']),
('Orthopedics',           'ORTH',  'Bones, joints and musculoskeletal system',   3, ARRAY['fracture','bone','joint','back pain','spine','dislocation','sprain','arthritis','musculoskeletal','ligament','knee','hip']),
('General Surgery',       'SURG',  'Surgical interventions',                     4, ARRAY['appendicitis','hernia','abscess','surgical','surgery','gallbladder','intestinal','obstruction']),
('Pediatrics',            'PEDS',  'Child and adolescent medicine',              4, ARRAY['child','infant','pediatric','baby','neonate','toddler','febrile','croup','bronchiolitis','vaccination','dehydration']),
('Obstetrics & Gynecology','OBGYN','Pregnancy, childbirth and women health',     5, ARRAY['pregnancy','obstetric','gynecology','labor','delivery','prenatal','miscarriage','menstrual','ovarian','uterine']),
('Gastroenterology',      'GI',    'Digestive system disorders',                 5, ARRAY['abdominal','stomach','GI','gastro','vomiting','diarrhea','nausea','liver','hepatitis','pancreatitis','bleeding','food poisoning']),
('Psychiatry',            'PSYCH', 'Mental health and behavioral disorders',     6, ARRAY['psychiatric','mental','suicidal','psychosis','anxiety','depression','hallucination','behavioral','agitation','self-harm','substance','alcohol','intoxication']),
('Infectious Diseases',   'INFD',  'Communicable and infectious diseases',       6, ARRAY['infection','sepsis','fever','dengue','malaria','HIV','infectious','contagious','meningitis','typhoid']),
('Nephrology',            'NEPH',  'Kidney and urinary system diseases',         7, ARRAY['kidney','renal','dialysis','urinary','UTI','nephro','creatinine','urine']),
('Oncology',              'ONCO',  'Cancer diagnosis and treatment',             7, ARRAY['cancer','tumor','oncology','chemotherapy','malignant','biopsy','lump','mass']),
('Dermatology',           'DERM',  'Skin, hair and nail disorders',              8, ARRAY['skin','rash','allergy','dermatitis','eczema','hives','wound','itching','burn']),
('Ophthalmology',         'OPHT',  'Eye diseases and vision disorders',          8, ARRAY['eye','vision','ophthalm','retina','cataract','glaucoma','foreign body eye','corneal'])
ON CONFLICT (code) DO NOTHING;

-- ── Hospital Network (Indian hospitals) ──
INSERT INTO public.hospital_network (name, code, address, city, state, phone, latitude, longitude, distance_km, hospital_type, total_beds, available_beds, icu_total, icu_available, ventilators_total, ventilators_available) VALUES
('AIIMS Delhi',           'AIIMS-DEL', 'Ansari Nagar, New Delhi',        'New Delhi',   'Delhi',         '+91-11-26588500', 28.5672, 77.2100, 0,    'teaching',       2500, 180, 120, 12, 80, 15),
('Fortis Escorts',        'FORTIS-DEL','Okhla Road, New Delhi',          'New Delhi',   'Delhi',         '+91-11-47135000', 28.5494, 77.2718, 8.5,  'specialty',      300,  42,  35,  8,  20, 5),
('Apollo Hospital Delhi', 'APOLLO-DEL','Sarita Vihar, New Delhi',        'New Delhi',   'Delhi',         '+91-11-71791090', 28.5296, 77.2927, 12.3, 'general',        700,  85,  60, 10,  40, 8),
('Max Super Specialty',   'MAX-DEL',   'Saket, New Delhi',               'New Delhi',   'Delhi',         '+91-11-26515050', 28.5274, 77.2134, 5.1,  'specialty',      500,  65,  45,  7,  30, 6),
('Safdarjung Hospital',   'SAFDAR',    'Ansari Nagar West, New Delhi',   'New Delhi',   'Delhi',         '+91-11-26730000', 28.5684, 77.2077, 0.5,  'general',        1600, 120, 80, 15,  50, 10),
('Sir Ganga Ram Hospital','SGRH',      'Rajinder Nagar, New Delhi',      'New Delhi',   'Delhi',         '+91-11-25750000', 28.6380, 77.1868, 9.2,  'teaching',       675,  55,  40,  6,  25, 4),
('CMC Vellore',           'CMC-VLR',   'Ida Scudder Road, Vellore',      'Vellore',     'Tamil Nadu',    '+91-416-2281000', 12.9249, 79.1325, 2150, 'teaching',       2700, 200, 150, 18,  90, 12),
('NIMHANS Bangalore',     'NIMHANS',   'Hosur Road, Bangalore',          'Bangalore',   'Karnataka',     '+91-80-26995000', 12.9425, 77.5969, 2000, 'specialty',      750,  60,  30,  5,  15, 3),
('Medanta Gurugram',      'MEDANTA',   'Sector 38, Gurugram',            'Gurugram',    'Haryana',       '+91-124-4141414', 28.4407, 77.0422, 25,   'specialty',      1600, 130, 80, 14,  55, 9),
('Tata Memorial Mumbai',  'TMH-MUM',   'Dr E Borges Road, Parel',        'Mumbai',      'Maharashtra',   '+91-22-24177000', 19.0048, 72.8428, 1400, 'specialty',      600,  30,  25,  3,  12, 2)
ON CONFLICT (code) DO NOTHING;

-- ── Hospital Resources (for each network hospital) ──
INSERT INTO public.hospital_resources (hospital_id, resource_type, resource_name, total_count, available_count, status)
SELECT h.id, r.resource_type, r.resource_name, r.total_count, r.available_count, r.status
FROM public.hospital_network h
CROSS JOIN (VALUES
    ('icu_bed',              'ICU Beds',              0, 0, 'operational'),
    ('ventilator',           'Ventilators',           0, 0, 'operational'),
    ('operation_theater',    'Operation Theaters',    0, 0, 'operational'),
    ('mri',                  'MRI Machines',          0, 0, 'operational'),
    ('ct_scan',              'CT Scanners',           0, 0, 'operational'),
    ('xray',                 'X-Ray Units',           0, 0, 'operational'),
    ('dialysis_unit',        'Dialysis Units',        0, 0, 'operational'),
    ('blood_bank',           'Blood Bank',            1, 1, 'operational'),
    ('ambulance',            'Ambulances',            0, 0, 'operational'),
    ('nicu_bed',             'NICU Beds',             0, 0, 'operational')
) AS r(resource_type, resource_name, total_count, available_count, status)
WHERE NOT EXISTS (
    SELECT 1 FROM public.hospital_resources hr
    WHERE hr.hospital_id = h.id AND hr.resource_type = r.resource_type
);

-- Update resource counts to match hospital-level data
UPDATE public.hospital_resources hr SET
    total_count = h.icu_total,
    available_count = h.icu_available
FROM public.hospital_network h
WHERE hr.hospital_id = h.id AND hr.resource_type = 'icu_bed';

UPDATE public.hospital_resources hr SET
    total_count = h.ventilators_total,
    available_count = h.ventilators_available
FROM public.hospital_network h
WHERE hr.hospital_id = h.id AND hr.resource_type = 'ventilator';

-- Set realistic counts for other resources based on hospital size
UPDATE public.hospital_resources hr SET
    total_count = GREATEST(2, h.total_beds / 100),
    available_count = GREATEST(1, h.total_beds / 200)
FROM public.hospital_network h
WHERE hr.hospital_id = h.id AND hr.resource_type = 'operation_theater';

UPDATE public.hospital_resources hr SET
    total_count = GREATEST(1, h.total_beds / 300),
    available_count = GREATEST(0, h.total_beds / 500)
FROM public.hospital_network h
WHERE hr.hospital_id = h.id AND hr.resource_type = 'mri';

UPDATE public.hospital_resources hr SET
    total_count = GREATEST(1, h.total_beds / 200),
    available_count = GREATEST(1, h.total_beds / 300)
FROM public.hospital_network h
WHERE hr.hospital_id = h.id AND hr.resource_type = 'ct_scan';

UPDATE public.hospital_resources hr SET
    total_count = GREATEST(2, h.total_beds / 80),
    available_count = GREATEST(1, h.total_beds / 120)
FROM public.hospital_network h
WHERE hr.hospital_id = h.id AND hr.resource_type = 'xray';

UPDATE public.hospital_resources hr SET
    total_count = GREATEST(2, h.total_beds / 120),
    available_count = GREATEST(1, h.total_beds / 180)
FROM public.hospital_network h
WHERE hr.hospital_id = h.id AND hr.resource_type = 'ambulance';

UPDATE public.hospital_resources hr SET
    total_count = GREATEST(0, h.icu_total / 4),
    available_count = GREATEST(0, h.icu_available / 4)
FROM public.hospital_network h
WHERE hr.hospital_id = h.id AND hr.resource_type = 'nicu_bed';

UPDATE public.hospital_resources hr SET
    total_count = GREATEST(1, h.total_beds / 150),
    available_count = GREATEST(0, h.total_beds / 250)
FROM public.hospital_network h
WHERE hr.hospital_id = h.id AND hr.resource_type = 'dialysis_unit';

-- ══════════════════════════════════════════════════════════════
-- VERIFICATION: Print counts for all new tables
-- ══════════════════════════════════════════════════════════════
DO $$
DECLARE
    dept_count INT;
    hosp_count INT;
    res_count  INT;
BEGIN
    SELECT COUNT(*) INTO dept_count FROM public.departments;
    SELECT COUNT(*) INTO hosp_count FROM public.hospital_network;
    SELECT COUNT(*) INTO res_count  FROM public.hospital_resources;
    RAISE NOTICE '✅ Migration complete!';
    RAISE NOTICE '   Departments:        % rows', dept_count;
    RAISE NOTICE '   Hospital Network:   % rows', hosp_count;
    RAISE NOTICE '   Hospital Resources: % rows', res_count;
    RAISE NOTICE '   Tables created: departments, doctor_profiles, doctor_schedules, patient_assignments, patient_reminders, reminder_logs, hospital_network, hospital_resources, patient_referrals, doctor_vacancies';
    RAISE NOTICE '   Columns added: patients.assigned_doctor_id, patients.department_id, staff.specialization, staff.department_id';
END $$;
