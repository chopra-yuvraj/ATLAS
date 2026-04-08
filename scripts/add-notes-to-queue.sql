-- ============================================================================
-- A.T.L.A.S. — Add notes to the active_queue view (Final Fix)
-- Run this in Supabase SQL Editor
-- ============================================================================

DROP VIEW IF EXISTS public.active_queue;

CREATE VIEW public.active_queue AS
SELECT
    p.id          AS patient_id,
    p.mrn,
    p.full_name,
    EXTRACT(YEAR FROM age(p.date_of_birth))::int AS age,
    p.gender,
    p.chief_complaint,
    p.status,
    p.arrived_at,
    GREATEST(0, EXTRACT(EPOCH FROM (now() - p.arrived_at)) / 60)::int AS wait_minutes,
    NULL::text    AS bed_label,
    ts.id         AS triage_score_id,
    ts.acuity,
    ts.vulnerability,
    ts.pain_index,
    ts.resource_consumption,
    ts.contagion_risk,
    ts.behavioral_risk,
    ts.deterioration_rate,
    ts.w_norm,
    ts.s_base,
    ts.s_final,
    ts.queue_rank,
    ts.scored_at,
    COALESCE(ts.scored_at, p.arrived_at) AS last_updated_at,
    CASE 
        WHEN ts.s_final >= 280 THEN 'critical'
        WHEN ts.s_final >= 160 THEN 'urgent'
        WHEN ts.s_final >= 80 THEN 'moderate'
        WHEN ts.s_final >= 30 THEN 'minor'
        ELSE 'nonurgent'
    END AS severity_tier,
    NULL::int     AS override_rank,
    NULL::text    AS override_reason,
    p.notes
FROM public.patients p
LEFT JOIN public.triage_scores ts ON ts.patient_id = p.id
WHERE p.status = 'waiting'
ORDER BY ts.s_final DESC NULLS LAST;
