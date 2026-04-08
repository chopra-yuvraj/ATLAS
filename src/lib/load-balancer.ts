// src/lib/load-balancer.ts
// Patient Load Balancing Engine — assigns patients to optimal doctors.

export interface DoctorCandidate {
    id: string;
    staff_id: string;
    staffName: string;
    department_id: string | null;
    specialization: string;
    current_load: number;
    max_concurrent_patients: number;
    availability_status: string;
    is_accepting_patients: boolean;
    last_patient_assigned_at: string | null;
    min_rest_minutes: number;
}

export interface BalanceResult {
    doctorProfileId: string;
    staffName: string;
    score: number;
    reasons: string[];
    specializationMatch: boolean;
    loadAtAssignment: number;
}

const WEIGHTS = {
    SPECIALIZATION_MATCH: 0.40,
    LOAD_RATIO: 0.35,
    AVAILABILITY: 0.15,
    REST_INTERVAL: 0.10,
};

/**
 * Score and rank doctors for a given patient's department.
 * Returns the ranked list, or empty if no doctors are available.
 */
export function rankDoctorsForPatient(
    doctors: DoctorCandidate[],
    targetDepartmentId: string | null
): BalanceResult[] {
    const now = Date.now();
    const results: BalanceResult[] = [];

    for (const doc of doctors) {
        // Skip doctors who can't accept patients
        if (!doc.is_accepting_patients) continue;
        if (doc.availability_status === 'off_duty' || doc.availability_status === 'on_leave') continue;
        if (doc.current_load >= doc.max_concurrent_patients) continue;

        const reasons: string[] = [];
        let totalScore = 0;

        // 1. Specialization match (40%)
        const specMatch = targetDepartmentId
            ? doc.department_id === targetDepartmentId
            : false;
        const specScore = specMatch ? 1.0 : 0.3;
        totalScore += specScore * WEIGHTS.SPECIALIZATION_MATCH;
        if (specMatch) reasons.push('Specialization match');

        // 2. Load ratio — lower is better (35%)
        const loadRatio = doc.max_concurrent_patients > 0
            ? doc.current_load / doc.max_concurrent_patients
            : 1;
        const loadScore = 1 - loadRatio;
        totalScore += loadScore * WEIGHTS.LOAD_RATIO;
        reasons.push(`Load: ${doc.current_load}/${doc.max_concurrent_patients}`);

        // 3. Availability status (15%)
        let availScore = 0;
        switch (doc.availability_status) {
            case 'available': availScore = 1.0; break;
            case 'busy': availScore = 0.3; break;
            case 'on_break': availScore = 0.1; break;
            default: availScore = 0;
        }
        totalScore += availScore * WEIGHTS.AVAILABILITY;

        // 4. Rest interval (10%)
        let restScore = 1.0;
        if (doc.last_patient_assigned_at) {
            const lastAssigned = new Date(doc.last_patient_assigned_at).getTime();
            const minutesSinceLastAssignment = (now - lastAssigned) / 60000;
            if (minutesSinceLastAssignment < doc.min_rest_minutes) {
                restScore = minutesSinceLastAssignment / doc.min_rest_minutes;
                reasons.push(`Rest: ${Math.round(minutesSinceLastAssignment)}/${doc.min_rest_minutes}min`);
            }
        }
        totalScore += restScore * WEIGHTS.REST_INTERVAL;

        results.push({
            doctorProfileId: doc.id,
            staffName: doc.staffName,
            score: Math.round(totalScore * 1000) / 1000,
            reasons,
            specializationMatch: specMatch,
            loadAtAssignment: doc.current_load,
        });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    return results;
}

/**
 * Pick the best doctor for a patient. Returns null if none available.
 */
export function selectBestDoctor(
    doctors: DoctorCandidate[],
    targetDepartmentId: string | null
): BalanceResult | null {
    const ranked = rankDoctorsForPatient(doctors, targetDepartmentId);
    return ranked.length > 0 ? ranked[0] : null;
}
