// src/app/(dashboard)/intake/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AcuitySelector } from '@/components/triage/AcuitySelector';
import { VariableSlider } from '@/components/triage/VariableSlider';
import { ScorePreview } from '@/components/triage/ScorePreview';
import { CTAS_LEVELS, type CTASLevel } from '@/types/triage';
import { UserPlus, ChevronRight, Zap, Search, Info } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// DISEASE PRESET DATABASE — Zero-latency hardcoded profiles
// Each preset maps a common ED chief complaint to clinically
// appropriate default values for ALL 7 triage variables.
// ─────────────────────────────────────────────────────────────
interface DiseasePreset {
    name: string;
    category: string;
    ctas: CTASLevel;
    vulnerability: number;
    painIndex: number;
    resourceConsumption: number;
    contagionRisk: number;
    behavioralRisk: number;
    deteriorationRate: number;
}

const DISEASE_PRESETS: DiseasePreset[] = [
    // ── Cardiac ──
    { name: 'Chest Pain / ACS',              category: 'Cardiac',       ctas: 2, vulnerability: 4, painIndex: 7, resourceConsumption: 8, contagionRisk: 0, behavioralRisk: 1, deteriorationRate: 8 },
    { name: 'Cardiac Arrest',                 category: 'Cardiac',       ctas: 1, vulnerability: 6, painIndex: 2, resourceConsumption: 10, contagionRisk: 0, behavioralRisk: 0, deteriorationRate: 10 },
    { name: 'Heart Failure Exacerbation',      category: 'Cardiac',       ctas: 2, vulnerability: 5, painIndex: 4, resourceConsumption: 7, contagionRisk: 0, behavioralRisk: 0, deteriorationRate: 6 },
    { name: 'Hypertensive Crisis',             category: 'Cardiac',       ctas: 2, vulnerability: 4, painIndex: 5, resourceConsumption: 5, contagionRisk: 0, behavioralRisk: 1, deteriorationRate: 7 },
    // ── Respiratory ──
    { name: 'Asthma Attack (Severe)',          category: 'Respiratory',   ctas: 2, vulnerability: 4, painIndex: 3, resourceConsumption: 6, contagionRisk: 1, behavioralRisk: 1, deteriorationRate: 7 },
    { name: 'Pneumonia',                       category: 'Respiratory',   ctas: 3, vulnerability: 4, painIndex: 4, resourceConsumption: 5, contagionRisk: 5, behavioralRisk: 0, deteriorationRate: 4 },
    { name: 'COPD Exacerbation',               category: 'Respiratory',   ctas: 2, vulnerability: 5, painIndex: 3, resourceConsumption: 6, contagionRisk: 2, behavioralRisk: 0, deteriorationRate: 6 },
    { name: 'COVID-19 / Respiratory Distress',  category: 'Respiratory',   ctas: 2, vulnerability: 5, painIndex: 4, resourceConsumption: 7, contagionRisk: 9, behavioralRisk: 0, deteriorationRate: 6 },
    // ── Neurological ──
    { name: 'Stroke (CVA)',                    category: 'Neurological',  ctas: 1, vulnerability: 5, painIndex: 2, resourceConsumption: 9, contagionRisk: 0, behavioralRisk: 1, deteriorationRate: 9 },
    { name: 'Seizure',                         category: 'Neurological',  ctas: 2, vulnerability: 4, painIndex: 2, resourceConsumption: 6, contagionRisk: 0, behavioralRisk: 4, deteriorationRate: 5 },
    { name: 'Severe Headache / Migraine',      category: 'Neurological',  ctas: 3, vulnerability: 2, painIndex: 8, resourceConsumption: 3, contagionRisk: 0, behavioralRisk: 1, deteriorationRate: 2 },
    { name: 'Head Injury / Concussion',        category: 'Neurological',  ctas: 2, vulnerability: 4, painIndex: 5, resourceConsumption: 7, contagionRisk: 0, behavioralRisk: 2, deteriorationRate: 6 },
    // ── Trauma ──
    { name: 'Major Trauma / MVA',              category: 'Trauma',        ctas: 1, vulnerability: 5, painIndex: 8, resourceConsumption: 10, contagionRisk: 0, behavioralRisk: 2, deteriorationRate: 9 },
    { name: 'Fracture (Closed)',               category: 'Trauma',        ctas: 3, vulnerability: 2, painIndex: 7, resourceConsumption: 5, contagionRisk: 0, behavioralRisk: 1, deteriorationRate: 1 },
    { name: 'Laceration / Wound',              category: 'Trauma',        ctas: 4, vulnerability: 1, painIndex: 5, resourceConsumption: 3, contagionRisk: 0, behavioralRisk: 0, deteriorationRate: 1 },
    { name: 'Burns (Moderate-Severe)',         category: 'Trauma',        ctas: 2, vulnerability: 4, painIndex: 9, resourceConsumption: 8, contagionRisk: 1, behavioralRisk: 2, deteriorationRate: 5 },
    // ── Abdominal ──
    { name: 'Acute Appendicitis',              category: 'Abdominal',     ctas: 2, vulnerability: 3, painIndex: 7, resourceConsumption: 7, contagionRisk: 0, behavioralRisk: 0, deteriorationRate: 6 },
    { name: 'Abdominal Pain (General)',        category: 'Abdominal',     ctas: 3, vulnerability: 2, painIndex: 6, resourceConsumption: 4, contagionRisk: 0, behavioralRisk: 0, deteriorationRate: 3 },
    { name: 'GI Bleeding',                     category: 'Abdominal',     ctas: 2, vulnerability: 4, painIndex: 4, resourceConsumption: 7, contagionRisk: 1, behavioralRisk: 0, deteriorationRate: 7 },
    { name: 'Food Poisoning / Gastroenteritis', category: 'Abdominal',     ctas: 4, vulnerability: 2, painIndex: 4, resourceConsumption: 3, contagionRisk: 4, behavioralRisk: 0, deteriorationRate: 2 },
    // ── Infectious ──
    { name: 'Sepsis / Septic Shock',           category: 'Infectious',    ctas: 1, vulnerability: 6, painIndex: 4, resourceConsumption: 9, contagionRisk: 6, behavioralRisk: 1, deteriorationRate: 9 },
    { name: 'Dengue Fever',                    category: 'Infectious',    ctas: 3, vulnerability: 4, painIndex: 5, resourceConsumption: 5, contagionRisk: 3, behavioralRisk: 0, deteriorationRate: 5 },
    { name: 'Malaria (Severe)',                category: 'Infectious',    ctas: 2, vulnerability: 5, painIndex: 5, resourceConsumption: 6, contagionRisk: 2, behavioralRisk: 1, deteriorationRate: 7 },
    { name: 'Tuberculosis (Active)',           category: 'Infectious',    ctas: 3, vulnerability: 4, painIndex: 3, resourceConsumption: 5, contagionRisk: 8, behavioralRisk: 0, deteriorationRate: 3 },
    // ── Pediatric ──
    { name: 'Febrile Seizure (Child)',         category: 'Pediatric',     ctas: 2, vulnerability: 7, painIndex: 2, resourceConsumption: 5, contagionRisk: 1, behavioralRisk: 2, deteriorationRate: 5 },
    { name: 'Croup / Bronchiolitis',           category: 'Pediatric',     ctas: 3, vulnerability: 6, painIndex: 3, resourceConsumption: 4, contagionRisk: 4, behavioralRisk: 2, deteriorationRate: 4 },
    { name: 'Dehydration (Child)',             category: 'Pediatric',     ctas: 3, vulnerability: 6, painIndex: 2, resourceConsumption: 4, contagionRisk: 1, behavioralRisk: 1, deteriorationRate: 4 },
    // ── Psychiatric/Behavioral ──
    { name: 'Suicidal Ideation / Self-Harm',   category: 'Psychiatric',   ctas: 2, vulnerability: 6, painIndex: 3, resourceConsumption: 4, contagionRisk: 0, behavioralRisk: 8, deteriorationRate: 4 },
    { name: 'Acute Psychosis',                 category: 'Psychiatric',   ctas: 2, vulnerability: 3, painIndex: 1, resourceConsumption: 5, contagionRisk: 0, behavioralRisk: 9, deteriorationRate: 3 },
    { name: 'Alcohol Intoxication',            category: 'Psychiatric',   ctas: 4, vulnerability: 2, painIndex: 1, resourceConsumption: 3, contagionRisk: 0, behavioralRisk: 6, deteriorationRate: 2 },
    // ── Other Common ──
    { name: 'Diabetic Emergency (DKA/Hypo)',   category: 'Metabolic',     ctas: 2, vulnerability: 5, painIndex: 3, resourceConsumption: 7, contagionRisk: 0, behavioralRisk: 2, deteriorationRate: 8 },
    { name: 'Anaphylaxis',                     category: 'Allergic',      ctas: 1, vulnerability: 5, painIndex: 4, resourceConsumption: 7, contagionRisk: 0, behavioralRisk: 1, deteriorationRate: 10 },
    { name: 'Snake / Animal Bite',             category: 'Toxicology',    ctas: 2, vulnerability: 3, painIndex: 6, resourceConsumption: 6, contagionRisk: 0, behavioralRisk: 2, deteriorationRate: 6 },
    { name: 'Drug Overdose',                   category: 'Toxicology',    ctas: 1, vulnerability: 4, painIndex: 2, resourceConsumption: 8, contagionRisk: 0, behavioralRisk: 5, deteriorationRate: 8 },
    { name: 'Kidney Stone / Renal Colic',      category: 'Urological',    ctas: 3, vulnerability: 2, painIndex: 9, resourceConsumption: 4, contagionRisk: 0, behavioralRisk: 1, deteriorationRate: 2 },
    { name: 'Urinary Tract Infection (UTI)',   category: 'Urological',    ctas: 4, vulnerability: 2, painIndex: 3, resourceConsumption: 2, contagionRisk: 0, behavioralRisk: 0, deteriorationRate: 1 },
    { name: 'Pregnancy Complication',          category: 'Obstetric',     ctas: 2, vulnerability: 7, painIndex: 5, resourceConsumption: 7, contagionRisk: 0, behavioralRisk: 1, deteriorationRate: 6 },
    { name: 'High Fever (Adult)',              category: 'General',       ctas: 3, vulnerability: 3, painIndex: 4, resourceConsumption: 4, contagionRisk: 3, behavioralRisk: 0, deteriorationRate: 3 },
    { name: 'Back Pain (Acute)',               category: 'General',       ctas: 4, vulnerability: 1, painIndex: 6, resourceConsumption: 3, contagionRisk: 0, behavioralRisk: 0, deteriorationRate: 1 },
    { name: 'Eye Injury / Foreign Body',       category: 'Ophthalmic',    ctas: 3, vulnerability: 2, painIndex: 6, resourceConsumption: 3, contagionRisk: 0, behavioralRisk: 0, deteriorationRate: 2 },
];

// ─────────────────────────────────────────────────────────────
// AGE → VULNERABILITY (V) CALCULATOR
// Clinical rationale:
//   Neonates (<28d): V=8  |  Infants (<1y): V=7  |  1–4: V=6
//   5–14: V=3  |  15–64: V=2  |  65–74: V=5  |  75–84: V=7
//   85+: V=9
// The nurse can still manually override after auto-set.
// ─────────────────────────────────────────────────────────────
function calculateVulnerabilityFromDob(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    const ageMs = today.getTime() - birthDate.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const ageYears = ageDays / 365.25;

    if (ageDays < 28)   return 8;  // Neonate
    if (ageYears < 1)   return 7;  // Infant
    if (ageYears < 5)   return 6;  // Toddler/preschool
    if (ageYears < 15)  return 3;  // Child/adolescent
    if (ageYears < 65)  return 2;  // Adult (baseline)
    if (ageYears < 75)  return 5;  // Senior
    if (ageYears < 85)  return 7;  // Elderly
    return 9;                       // Very elderly
}

function getAgeLabel(dob: string): string {
    const birthDate = new Date(dob);
    const today = new Date();
    const ageMs = today.getTime() - birthDate.getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const ageYears = Math.floor(ageDays / 365.25);
    const ageMonths = Math.floor(ageDays / 30.44);

    if (ageDays < 28)   return `${ageDays}d — Neonate`;
    if (ageYears < 1)   return `${ageMonths}mo — Infant`;
    if (ageYears < 5)   return `${ageYears}y — Toddler`;
    if (ageYears < 15)  return `${ageYears}y — Child`;
    if (ageYears < 65)  return `${ageYears}y — Adult`;
    if (ageYears < 75)  return `${ageYears}y — Senior`;
    if (ageYears < 85)  return `${ageYears}y — Elderly`;
    return `${ageYears}y — Very Elderly`;
}

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

    // Preset search state
    const [presetSearch, setPresetSearch] = useState('');
    const [showPresets, setShowPresets] = useState(false);
    const [presetApplied, setPresetApplied] = useState<string | null>(null);
    const [dobAutoV, setDobAutoV] = useState<number | null>(null);
    const presetRef = useRef<HTMLDivElement>(null);

    const acuityValue = CTAS_LEVELS.find(l => l.level === ctasLevel)?.acuityValue ?? 6;

    // ── DOB → Auto Vulnerability ──
    const handleDobChange = useCallback((dob: string) => {
        setDateOfBirth(dob);
        if (dob) {
            const autoV = calculateVulnerabilityFromDob(dob);
            setVulnerability(autoV);
            setDobAutoV(autoV);
        } else {
            setDobAutoV(null);
        }
    }, []);

    // ── Apply a disease preset ──
    function applyPreset(preset: DiseasePreset) {
        setChiefComplaint(preset.name);
        setCtasLevel(preset.ctas);
        // If DOB was set, use the higher of DOB-based V or preset V
        const dobV = dateOfBirth ? calculateVulnerabilityFromDob(dateOfBirth) : 0;
        setVulnerability(Math.max(preset.vulnerability, dobV));
        setPainIndex(preset.painIndex);
        setResourceConsumption(preset.resourceConsumption);
        setContagionRisk(preset.contagionRisk);
        setBehavioralRisk(preset.behavioralRisk);
        setDeteriorationRate(preset.deteriorationRate);
        setShowPresets(false);
        setPresetSearch('');
        setPresetApplied(preset.name);
        setTimeout(() => setPresetApplied(null), 3000);
    }

    // ── Filter presets ──
    const filteredPresets = presetSearch.trim()
        ? DISEASE_PRESETS.filter(p =>
            p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
            p.category.toLowerCase().includes(presetSearch.toLowerCase())
        )
        : DISEASE_PRESETS;

    // Group by category
    const grouped = filteredPresets.reduce<Record<string, DiseasePreset[]>>((acc, p) => {
        (acc[p.category] = acc[p.category] || []).push(p);
        return acc;
    }, {});

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (presetRef.current && !presetRef.current.contains(e.target as Node)) {
                setShowPresets(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

                            {/* Preset applied banner */}
                            {presetApplied && (
                                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md p-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <Zap className="h-4 w-4" />
                                    <span>Preset applied: <strong>{presetApplied}</strong> — All triage variables updated. You can still adjust any value.</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="full_name" className="text-sm font-medium">Full name *</label>
                                    <input id="full_name" placeholder="e.g. Yuvraj Chopra" value={fullName} onChange={e => setFullName(e.target.value)} required
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="date_of_birth" className="text-sm font-medium">Date of birth *</label>
                                    <input id="date_of_birth" type="date" value={dateOfBirth} onChange={e => handleDobChange(e.target.value)} required
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                    {dateOfBirth && (
                                        <div className="flex items-center gap-1.5 text-xs">
                                            <Info className="h-3 w-3 text-indigo-500" />
                                            <span className="text-muted-foreground">
                                                {getAgeLabel(dateOfBirth)} →
                                            </span>
                                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                                V auto-set to {dobAutoV ?? vulnerability}
                                            </span>
                                        </div>
                                    )}
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

                            {/* ── Chief Complaint + Preset Selector ── */}
                            <div className="space-y-1.5" ref={presetRef}>
                                <label htmlFor="chief_complaint" className="text-sm font-medium">Chief complaint *</label>
                                <div className="flex gap-2">
                                    <input id="chief_complaint" placeholder="Why did the patient come to the ED?" value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} required
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                                    <button
                                        type="button"
                                        onClick={() => setShowPresets(!showPresets)}
                                        className={`shrink-0 inline-flex items-center gap-1.5 h-10 px-3 rounded-md text-sm font-medium border transition-all ${
                                            showPresets
                                                ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                                                : 'bg-background border-input text-foreground hover:bg-accent'
                                        }`}
                                        title="Apply disease preset — auto-fills all triage values"
                                    >
                                        <Zap className="h-4 w-4" />
                                        <span className="hidden sm:inline">Presets</span>
                                    </button>
                                </div>

                                {/* Preset Dropdown */}
                                {showPresets && (
                                    <div className="relative z-50">
                                        <div className="absolute top-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-xl max-h-80 overflow-hidden flex flex-col">
                                            {/* Search */}
                                            <div className="p-2 border-b border-border">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                    <input
                                                        type="text"
                                                        value={presetSearch}
                                                        onChange={e => setPresetSearch(e.target.value)}
                                                        placeholder="Search diseases..."
                                                        autoFocus
                                                        className="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                    />
                                                </div>
                                            </div>

                                            {/* Results */}
                                            <div className="overflow-y-auto flex-1">
                                                {Object.keys(grouped).length === 0 ? (
                                                    <p className="p-3 text-sm text-muted-foreground text-center">No matching conditions</p>
                                                ) : (
                                                    Object.entries(grouped).map(([category, presets]) => (
                                                        <div key={category}>
                                                            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{category}</p>
                                                            {presets.map(preset => {
                                                                const ctasInfo = CTAS_LEVELS.find(l => l.level === preset.ctas);
                                                                return (
                                                                    <button
                                                                        key={preset.name}
                                                                        type="button"
                                                                        onClick={() => applyPreset(preset)}
                                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between gap-2"
                                                                    >
                                                                        <span className="truncate">{preset.name}</span>
                                                                        <span
                                                                            className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                                            style={{ backgroundColor: ctasInfo?.bgColor, color: ctasInfo?.color }}
                                                                        >
                                                                            CTAS {preset.ctas}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            <div className="p-2 border-t border-border bg-muted/50">
                                                <p className="text-[10px] text-muted-foreground text-center">
                                                    {DISEASE_PRESETS.length} conditions available · Values are starting points, adjust as needed
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
