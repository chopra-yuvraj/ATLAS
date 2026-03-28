// src/components/queue/PatientDrawer.tsx
'use client';

import { useState } from 'react';
import { SeverityBadge } from './SeverityBadge';
import { VariableSlider } from '@/components/triage/VariableSlider';
import { ScorePreview } from '@/components/triage/ScorePreview';
import { formatWaitTime, formatDateTime } from '@/lib/utils';
import type { QueueEntry } from '@/types/database';
import { X, Pencil, CheckCircle } from 'lucide-react';

interface PatientDrawerProps {
    patient: QueueEntry;
    onClose: () => void;
    onUpdate: () => void;
}

export function PatientDrawer({ patient, onClose, onUpdate }: PatientDrawerProps) {
    const [acuity, setAcuity] = useState(patient.acuity);
    const [vulnerability, setVulnerability] = useState(patient.vulnerability);
    const [painIndex, setPainIndex] = useState(patient.pain_index);
    const [resourceConsumption, setResourceConsumption] = useState(patient.resource_consumption);
    const [contagionRisk, setContagionRisk] = useState(patient.contagion_risk);
    const [behavioralRisk, setBehavioralRisk] = useState(patient.behavioral_risk);
    const [deteriorationRate, setDeteriorationRate] = useState(patient.deterioration_rate);

    const [isSaving, setIsSaving] = useState(false);
    const [isMovingToTreatment, setIsMovingToTreatment] = useState(false);
    const [activeTab, setActiveTab] = useState<'triage' | 'info'>('triage');
    const [error, setError] = useState<string | null>(null);

    const isDirty =
        acuity !== patient.acuity ||
        vulnerability !== patient.vulnerability ||
        painIndex !== patient.pain_index ||
        resourceConsumption !== patient.resource_consumption ||
        contagionRisk !== patient.contagion_risk ||
        behavioralRisk !== patient.behavioral_risk ||
        deteriorationRate !== patient.deterioration_rate;

    async function handleSaveTriage() {
        setIsSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/patients/${patient.patient_id}/triage`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acuity, vulnerability,
                    pain_index: painIndex,
                    resource_consumption: resourceConsumption,
                    contagion_risk: contagionRisk,
                    behavioral_risk: behavioralRisk,
                    deterioration_rate: deteriorationRate,
                }),
            });
            if (!res.ok) throw new Error('Failed to update');
            onUpdate();
        } catch {
            setError('Failed to save triage update');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleMoveToTreatment() {
        setIsMovingToTreatment(true);
        try {
            const res = await fetch(`/api/patients/${patient.patient_id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'in_treatment' }),
            });
            if (!res.ok) throw new Error('Failed to update');
            onUpdate();
        } catch {
            setError('Failed to move patient to treatment');
        } finally {
            setIsMovingToTreatment(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-background shadow-xl overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-background border-b p-4 z-10">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">{patient.full_name}</h2>
                            <p className="text-sm text-muted-foreground font-mono">{patient.mrn}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end gap-1">
                                <SeverityBadge tier={patient.severity_tier} />
                                <span className="text-2xl font-bold text-muted-foreground">
                                    #{patient.queue_rank}
                                </span>
                            </div>
                            <button onClick={onClose} className="p-1 hover:bg-muted rounded">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Key stats */}
                    <div className="grid grid-cols-3 gap-3 mt-3">
                        <div className="bg-muted rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold tabular-nums">{patient.s_final?.toFixed(1) ?? '—'}</p>
                            <p className="text-xs text-muted-foreground">Priority score</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold tabular-nums">{formatWaitTime(patient.wait_minutes)}</p>
                            <p className="text-xs text-muted-foreground">Wait time</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold tabular-nums text-red-600">{patient.deterioration_rate}</p>
                            <p className="text-xs text-muted-foreground">Deterioration</p>
                        </div>
                    </div>
                </div>

                <div className="p-4">
                    {error && (
                        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                            {error}
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1">
                        {(['triage', 'info'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 text-sm py-1.5 rounded-md transition-colors capitalize ${activeTab === tab ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
                                    }`}
                            >
                                {tab === 'info' ? 'Patient info' : tab}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'triage' && (
                        <div className="space-y-4">
                            <ScorePreview
                                acuity={acuity}
                                vulnerability={vulnerability}
                                painIndex={painIndex}
                                resourceConsumption={resourceConsumption}
                                contagionRisk={contagionRisk}
                                behavioralRisk={behavioralRisk}
                                deteriorationRate={deteriorationRate}
                            />

                            <div className="space-y-4">
                                <VariableSlider id="d-acuity" label="Acuity (A)" description="Clinical severity"
                                    value={acuity} onChange={setAcuity} hints={{ low: 'Low', high: 'Critical' }} />
                                <VariableSlider id="d-pain" label="Pain index (P)" description="Patient-reported pain"
                                    value={painIndex} onChange={setPainIndex} hints={{ low: 'No pain', high: 'Severe' }} />
                                <VariableSlider id="d-detn" label="Deterioration rate (D)" description="Rate of worsening"
                                    value={deteriorationRate} onChange={setDeteriorationRate} hints={{ low: 'Stable', high: 'Rapid' }} />
                                <VariableSlider id="d-vuln" label="Vulnerability (V)" description="Patient risk factors"
                                    value={vulnerability} onChange={setVulnerability} hints={{ low: 'Low', high: 'High' }} />
                                <VariableSlider id="d-res" label="Resource consumption (R)" description="ED resources needed"
                                    value={resourceConsumption} onChange={setResourceConsumption} inverted
                                    hints={{ low: 'Minimal', high: 'Heavy (lowers priority)' }} />
                                <VariableSlider id="d-con" label="Contagion risk (C)" description="Infection spread risk"
                                    value={contagionRisk} onChange={setContagionRisk} hints={{ low: 'None', high: 'High' }} />
                                <VariableSlider id="d-beh" label="Behavioral risk (B)" description="Safety/agitation"
                                    value={behavioralRisk} onChange={setBehavioralRisk} hints={{ low: 'Calm', high: 'High risk' }} />
                            </div>

                            {isDirty && (
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleSaveTriage}
                                        disabled={isSaving}
                                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50"
                                    >
                                        <Pencil className="h-4 w-4" />
                                        {isSaving ? 'Saving…' : 'Save & rescore'}
                                    </button>
                                    <button
                                        className="rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                                        onClick={() => {
                                            setAcuity(patient.acuity);
                                            setVulnerability(patient.vulnerability);
                                            setPainIndex(patient.pain_index);
                                            setResourceConsumption(patient.resource_consumption);
                                            setContagionRisk(patient.contagion_risk);
                                            setBehavioralRisk(patient.behavioral_risk);
                                            setDeteriorationRate(patient.deterioration_rate);
                                        }}
                                    >
                                        Reset
                                    </button>
                                </div>
                            )}

                            <hr className="border-border" />

                            <button
                                onClick={handleMoveToTreatment}
                                disabled={isMovingToTreatment}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 h-10 px-4 py-2 disabled:opacity-50"
                            >
                                <CheckCircle className="h-4 w-4" />
                                {isMovingToTreatment ? 'Moving…' : 'Move to treatment'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'info' && (
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Age', value: patient.age ? `${patient.age} yrs` : '—' },
                                    { label: 'Gender', value: patient.gender },
                                    { label: 'Chief complaint', value: patient.chief_complaint },
                                    { label: 'Arrived', value: formatDateTime(patient.arrived_at) },
                                    { label: 'Bed', value: patient.bed_label ?? 'Unassigned' },
                                    { label: 'Status', value: patient.status },
                                ].map(({ label, value }) => (
                                    <div key={label} className="space-y-0.5">
                                        <p className="text-xs text-muted-foreground">{label}</p>
                                        <p className="font-medium capitalize">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
