// src/app/(dashboard)/intake/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AcuitySelector } from '@/components/triage/AcuitySelector';
import { VariableSlider } from '@/components/triage/VariableSlider';
import { ScorePreview } from '@/components/triage/ScorePreview';
import { CTAS_LEVELS, type CTASLevel } from '@/types/triage';
import { UserPlus, ChevronRight } from 'lucide-react';

export default function IntakePage() {
    const router = useRouter();

    const [ctasLevel, setCtasLevel] = useState<CTASLevel>(3);
    const [vulnerability, setVulnerability] = useState(3);
    const [painIndex, setPainIndex] = useState(3);
    const [resourceConsumption, setResourceConsumption] = useState(3);
    const [contagionRisk, setContagionRisk] = useState(0);
    const [behavioralRisk, setBehavioralRisk] = useState(0);
    const [deteriorationRate, setDeteriorationRate] = useState(2);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form fields
    const [fullName, setFullName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState('male');
    const [phone, setPhone] = useState('');
    const [chiefComplaint, setChiefComplaint] = useState('');
    const [emergencyContact, setEmergencyContact] = useState('');
    const [allergies, setAllergies] = useState('');
    const [notes, setNotes] = useState('');

    const acuityValue = CTAS_LEVELS.find(l => l.level === ctasLevel)?.acuityValue ?? 6;

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: fullName,
                    date_of_birth: dateOfBirth,
                    gender,
                    phone: phone || undefined,
                    emergency_contact: emergencyContact || undefined,
                    chief_complaint: chiefComplaint,
                    allergies: allergies || undefined,
                    notes: notes || undefined,
                    ctas_level: ctasLevel,
                    vulnerability,
                    pain_index: painIndex,
                    resource_consumption: resourceConsumption,
                    contagion_risk: contagionRisk,
                    behavioral_risk: behavioralRisk,
                    deterioration_rate: deteriorationRate,
                }),
            });

            const json = await res.json();

            if (!res.ok || json.error) {
                setError(json.error ?? 'Unknown error');
                return;
            }

            router.push('/dashboard');
        } catch {
            setError('Network error — please check your connection and try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <UserPlus className="h-6 w-6" />
                <div>
                    <h1 className="text-2xl font-bold">New Patient Intake</h1>
                    <p className="text-sm text-muted-foreground">
                        Complete triage assessment to add patient to the priority queue
                    </p>
                </div>
            </div>

            <form onSubmit={onSubmit}>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* Left: Patient demographics */}
                    <div className="xl:col-span-2 bg-card rounded-lg border shadow-sm">
                        <div className="p-6 pb-4">
                            <h2 className="text-base font-semibold">Patient Information</h2>
                            <p className="text-sm text-muted-foreground">Enter the patient&apos;s basic demographic and clinical details</p>
                        </div>
                        <div className="px-6 pb-6 space-y-4">
                            {error && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{error}</div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="full_name" className="text-sm font-medium">Full name *</label>
                                    <input id="full_name" placeholder="e.g. Yuvraj Chopra" value={fullName} onChange={e => setFullName(e.target.value)} required
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="date_of_birth" className="text-sm font-medium">Date of birth *</label>
                                    <input id="date_of_birth" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} required
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Gender *</label>
                                    <select value={gender} onChange={e => setGender(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                        <option value="prefer_not_to_say">Prefer not to say</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="phone" className="text-sm font-medium">Phone number</label>
                                    <input id="phone" placeholder="+91 1234567890" value={phone} onChange={e => setPhone(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="chief_complaint" className="text-sm font-medium">Chief complaint *</label>
                                <input id="chief_complaint" placeholder="Why did the patient come to the ED?" value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="emergency_contact" className="text-sm font-medium">Emergency contact</label>
                                    <input id="emergency_contact" placeholder="Name & phone" value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="allergies" className="text-sm font-medium">Known allergies</label>
                                    <input id="allergies" placeholder="Comma-separated (e.g. Penicillin, Latex)" value={allergies} onChange={e => setAllergies(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="notes" className="text-sm font-medium">Clinical notes</label>
                                <input id="notes" placeholder="Any additional observations" value={notes} onChange={e => setNotes(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                            </div>

                            <hr className="border-border" />

                            {/* Triage Assessment */}
                            <div className="space-y-6 pt-2">
                                <div>
                                    <h3 className="font-semibold mb-1">Triage Assessment</h3>
                                    <p className="text-sm text-muted-foreground">Use sliders to set all 7 variables. Score updates live.</p>
                                </div>

                                <AcuitySelector value={ctasLevel} onChange={setCtasLevel} />

                                <hr className="border-border" />
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clinical factors</p>
                                <VariableSlider id="pain_index" label="Pain index (P)" description="Patient's self-reported pain level"
                                    value={painIndex} onChange={setPainIndex} hints={{ low: 'No pain', high: 'Worst imaginable' }} />
                                <VariableSlider id="deterioration_rate" label="Deterioration rate (D)" description="How rapidly is the condition worsening?"
                                    value={deteriorationRate} onChange={setDeteriorationRate} hints={{ low: 'Stable', high: 'Rapidly deteriorating' }} />

                                <hr className="border-border" />
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Patient profile</p>
                                <VariableSlider id="vulnerability" label="Vulnerability (V)" description="Age extremes, pregnancy, immunocompromised, disability"
                                    value={vulnerability} onChange={setVulnerability} hints={{ low: 'No vulnerability factors', high: 'Multiple high-risk factors' }} />

                                <hr className="border-border" />
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Operational factors</p>
                                <VariableSlider id="resource_consumption" label="Resource consumption (R)" description="Expected ED resources required (INVERTED — high = lower priority)"
                                    value={resourceConsumption} onChange={setResourceConsumption} inverted hints={{ low: 'Minimal resources', high: 'Heavy resource use' }} />

                                <hr className="border-border" />
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk flags</p>
                                <VariableSlider id="contagion_risk" label="Contagion risk (C)" description="Risk of spreading infection to other patients/staff"
                                    value={contagionRisk} onChange={setContagionRisk} hints={{ low: 'Non-infectious', high: 'Highly contagious — isolate' }} />
                                <VariableSlider id="behavioral_risk" label="Behavioral risk (B)" description="Agitation, violence risk, substance intoxication"
                                    value={behavioralRisk} onChange={setBehavioralRisk} hints={{ low: 'Calm, cooperative', high: 'High safety risk' }} />
                            </div>
                        </div>
                    </div>

                    {/* Right: Live score preview + submit */}
                    <div className="space-y-4">
                        <ScorePreview
                            acuity={acuityValue}
                            vulnerability={vulnerability}
                            painIndex={painIndex}
                            resourceConsumption={resourceConsumption}
                            contagionRisk={contagionRisk}
                            behavioralRisk={behavioralRisk}
                            deteriorationRate={deteriorationRate}
                        />

                        <div className="bg-card rounded-lg border shadow-sm p-4 space-y-3">
                            <p className="text-xs text-muted-foreground">
                                ⚠ This score is a clinical decision <strong>aid</strong>, not a
                                replacement for nurse judgment. You retain full override authority.
                            </p>
                            <button
                                type="submit"
                                className="w-full inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-4 py-2 disabled:opacity-50"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Admitting patient…' : 'Confirm & Add to Queue'}
                                {!isSubmitting && <ChevronRight className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                </div>
            </form>
        </div>
    );
}
