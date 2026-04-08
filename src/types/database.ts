// src/types/database.ts
// These types mirror the exact shape of your Supabase tables.

export type StaffRole = 'triage_nurse' | 'doctor' | 'admin' | 'frontdesk';

export type PatientStatus =
    | 'waiting'
    | 'in_treatment'
    | 'discharged'
    | 'transferred'
    | 'deceased';

export type BedType = 'standard' | 'trauma' | 'isolation' | 'observation';

export type SeverityTier = 'critical' | 'urgent' | 'moderate' | 'minor' | 'nonurgent';

export type TriggerSource =
    | 'nurse_update'
    | 'cron_job'
    | 'patient_admission'
    | 'manual_override';

// --- Multilingual Chatbot Module Types ---
export type SessionStatus = 'active' | 'completed' | 'abandoned' | 'timed_out';
export type MessageSender = 'patient' | 'ai' | 'system';
export type InputMethod = 'speech' | 'typed' | 'system';
export type FormStatus = 'draft' | 'verified' | 'submitted' | 'cancelled';
export type VerificationMethod = 'verbal' | 'on_screen' | 'staff_assisted';

export interface Staff {
    id: string;
    user_id: string | null;
    full_name: string;
    role: StaffRole;
    badge_number: string;
    department: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Bed {
    id: string;
    label: string;
    ward: string;
    bed_type: BedType;
    is_occupied: boolean;
    created_at: string;
}

export interface Patient {
    id: string;
    mrn: string;
    full_name: string;
    date_of_birth: string;
    age: number;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    phone: string | null;
    emergency_contact: string | null;
    chief_complaint: string;
    allergies: string[] | null;
    status: PatientStatus;
    arrived_at: string;
    treatment_started_at: string | null;
    discharged_at: string | null;
    assigned_bed_id: string | null;
    admitted_by_id: string | null;
    notes: string | null;
    language_preference: string;
    intake_form_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface TriageScore {
    id: string;
    patient_id: string;
    acuity: number;
    vulnerability: number;
    pain_index: number;
    resource_consumption: number;
    contagion_risk: number;
    behavioral_risk: number;
    deterioration_rate: number;
    w_norm: number | null;
    s_base: number | null;
    s_final: number | null;
    queue_rank: number | null;
    scored_by_id: string | null;
    scored_at: string;
    last_updated_at: string;
    next_recalc_at: string;
    created_at: string;
}

export interface QueueSnapshot {
    id: string;
    patient_id: string;
    triage_score_id: string | null;
    acuity: number | null;
    vulnerability: number | null;
    pain_index: number | null;
    resource_consumption: number | null;
    contagion_risk: number | null;
    behavioral_risk: number | null;
    deterioration_rate: number | null;
    wait_minutes: number | null;
    w_norm: number | null;
    s_base: number | null;
    s_final: number | null;
    queue_rank: number | null;
    trigger_source: TriggerSource | null;
    triggered_by_id: string | null;
    snapshot_at: string;
}

export interface ScoreOverride {
    id: string;
    patient_id: string;
    override_rank: number;
    reason: string;
    overridden_by: string;
    expires_at: string | null;
    is_active: boolean;
    created_at: string;
}

// The active_queue VIEW result shape
export interface QueueEntry {
    patient_id: string;
    mrn: string;
    full_name: string;
    age: number;
    gender: string;
    chief_complaint: string;
    status: PatientStatus;
    arrived_at: string;
    wait_minutes: number;
    bed_label: string | null;
    triage_score_id: string;
    acuity: number;
    vulnerability: number;
    pain_index: number;
    resource_consumption: number;
    contagion_risk: number;
    behavioral_risk: number;
    deterioration_rate: number;
    w_norm: number | null;
    s_base: number | null;
    s_final: number | null;
    queue_rank: number | null;
    scored_at: string;
    last_updated_at: string;
    severity_tier: SeverityTier;
    override_rank: number | null;
    override_reason: string | null;
    notes: string | null;
}

// --- Multilingual Chatbot Module Interfaces ---

export interface SupportedLanguage {
    id: string;
    code: string;
    name: string;
    native_name: string;
    stt_supported: boolean;
    tts_supported: boolean;
    is_active: boolean;
    created_at: string;
}

export interface PatientLoginToken {
    id: string;
    patient_id: string;
    token_code: string;
    dob_verification: string;
    is_used: boolean;
    expires_at: string;
    generated_by: string;
    created_at: string;
}

export interface PatientSession {
    id: string;
    patient_id: string;
    language_code: string;
    session_status: SessionStatus;
    device_info: Record<string, unknown> | null;
    started_at: string;
    ended_at: string | null;
    created_at: string;
}

export interface ChatMessage {
    id: string;
    session_id: string;
    sender: MessageSender;
    original_text: string | null;
    translated_text: string | null;
    original_language: string | null;
    target_language: string | null;
    audio_url: string | null;
    input_method: InputMethod;
    extracted_fields: Record<string, unknown> | null;
    sequence_number: number;
    created_at: string;
}

export interface PatientIntakeForm {
    id: string;
    patient_id: string;
    session_id: string | null;
    full_name_regional: string | null;
    full_name_english: string | null;
    age: number | null;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
    symptoms_regional: string | null;
    symptoms_english: string | null;
    allergies_regional: string | null;
    allergies_english: string | null;
    medications_regional: string | null;
    medications_english: string | null;
    medical_history_regional: string | null;
    medical_history_english: string | null;
    pain_level: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    patient_verified: boolean;
    verification_method: VerificationMethod | null;
    verified_at: string | null;
    form_language: string;
    form_status: FormStatus;
    created_at: string;
    updated_at: string;
}

// --- Smart Hospital Management Module Types ---

export type DoctorAvailability = 'available' | 'busy' | 'on_break' | 'off_duty' | 'on_leave';
export type ReminderType = 'follow_up' | 'medication' | 'lab_test' | 'report_available' | 'general';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled' | 'snoozed';
export type DeliveryChannel = 'email' | 'sms' | 'portal' | 'all';
export type ReminderPriority = 'low' | 'normal' | 'high' | 'urgent';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';
export type HospitalType = 'general' | 'specialty' | 'trauma_center' | 'teaching' | 'clinic';
export type ResourceType = 'icu_bed' | 'ventilator' | 'specialist' | 'diagnostic_equipment' | 'blood_bank' | 'operation_theater' | 'ambulance' | 'nicu_bed' | 'dialysis_unit' | 'mri' | 'ct_scan' | 'xray';
export type ResourceStatus = 'operational' | 'limited' | 'unavailable' | 'maintenance';
export type ReferralUrgency = 'critical' | 'urgent' | 'routine';
export type ReferralStatus = 'pending' | 'accepted' | 'rejected' | 'in_transit' | 'completed' | 'cancelled';
export type VacancyStatus = 'open' | 'closed' | 'filled' | 'on_hold';
export type EmploymentType = 'full_time' | 'part_time' | 'visiting' | 'contract';

export interface Department {
    id: string;
    name: string;
    code: string;
    description: string | null;
    head_doctor_id: string | null;
    floor_number: number | null;
    is_active: boolean;
    keywords: string[];
    created_at: string;
    updated_at: string;
}

export interface DoctorProfile {
    id: string;
    staff_id: string;
    department_id: string | null;
    specialization: string;
    qualification: string | null;
    experience_years: number;
    max_concurrent_patients: number;
    current_load: number;
    availability_status: DoctorAvailability;
    last_patient_assigned_at: string | null;
    min_rest_minutes: number;
    consultation_room: string | null;
    is_accepting_patients: boolean;
    created_at: string;
    updated_at: string;
    // Joined data
    staff?: Staff;
    department?: Department;
}

export interface DoctorSchedule {
    id: string;
    doctor_profile_id: string;
    day_of_week: number;
    shift_start: string;
    shift_end: string;
    is_active: boolean;
    created_at: string;
}

export interface PatientReminder {
    id: string;
    patient_id: string;
    created_by_id: string | null;
    reminder_type: ReminderType;
    title: string;
    message: string;
    scheduled_at: string;
    delivery_channel: DeliveryChannel;
    recurrence: Recurrence;
    recurrence_end_date: string | null;
    status: ReminderStatus;
    sent_at: string | null;
    priority: ReminderPriority;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    // Joined data
    patients?: { full_name: string; mrn: string };
    staff?: { full_name: string };
}

export interface ReminderLog {
    id: string;
    reminder_id: string;
    channel: 'email' | 'sms' | 'portal';
    status: 'sent' | 'failed' | 'pending' | 'bounced';
    recipient: string | null;
    error_message: string | null;
    sent_at: string;
}

export interface HospitalNetwork {
    id: string;
    name: string;
    code: string;
    address: string | null;
    city: string;
    state: string | null;
    phone: string | null;
    email: string | null;
    latitude: number | null;
    longitude: number | null;
    distance_km: number;
    hospital_type: HospitalType;
    total_beds: number;
    available_beds: number;
    icu_total: number;
    icu_available: number;
    ventilators_total: number;
    ventilators_available: number;
    is_active: boolean;
    last_updated: string;
    created_at: string;
    // Joined
    hospital_resources?: HospitalResource[];
}

export interface HospitalResource {
    id: string;
    hospital_id: string;
    resource_type: ResourceType;
    resource_name: string;
    total_count: number;
    available_count: number;
    status: ResourceStatus;
    last_updated: string;
    created_at: string;
}

export interface PatientReferral {
    id: string;
    patient_id: string;
    from_hospital_id: string;
    to_hospital_id: string;
    referred_by_id: string | null;
    reason: string;
    urgency: ReferralUrgency;
    required_resource: string | null;
    status: ReferralStatus;
    notes: string | null;
    accepted_at: string | null;
    transfer_started_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
    // Joined
    patients?: { full_name: string; mrn: string };
    from_hospital?: HospitalNetwork;
    to_hospital?: HospitalNetwork;
}

export interface DoctorVacancy {
    id: string;
    department_id: string | null;
    title: string;
    specialization: string;
    qualification_required: string | null;
    experience_min_years: number;
    positions_available: number;
    positions_filled: number;
    employment_type: EmploymentType;
    description: string | null;
    salary_range: string | null;
    status: VacancyStatus;
    posted_by_id: string | null;
    deadline: string | null;
    created_at: string;
    updated_at: string;
    // Joined
    departments?: Department;
}

export interface PatientAssignment {
    id: string;
    patient_id: string;
    doctor_profile_id: string;
    department_id: string | null;
    assignment_reason: string;
    assignment_score: number | null;
    specialization_match: boolean;
    doctor_load_at_assignment: number | null;
    is_active: boolean;
    assigned_at: string;
    unassigned_at: string | null;
    created_at: string;
    // Joined
    doctor_profiles?: DoctorProfile;
    patients?: Patient;
}
