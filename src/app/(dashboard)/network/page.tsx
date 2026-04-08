// src/app/(dashboard)/network/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
    Building2, Bed, Wind, Search, ArrowRightLeft, AlertTriangle,
    MapPin, Phone, Loader2, Filter, Send, CheckCircle, Clock, XCircle,
    Stethoscope, Scan, Activity
} from 'lucide-react';
import { PageGuard } from '@/components/layout/PageGuard';

interface HospitalResource {
    id: string;
    resource_type: string;
    resource_name: string;
    total_count: number;
    available_count: number;
    status: string;
}

interface Hospital {
    id: string;
    name: string;
    code: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    distance_km: number;
    hospital_type: string;
    total_beds: number;
    available_beds: number;
    icu_total: number;
    icu_available: number;
    ventilators_total: number;
    ventilators_available: number;
    hospital_resources: HospitalResource[];
}

interface Referral {
    id: string;
    reason: string;
    urgency: string;
    status: string;
    created_at: string;
    patients?: { full_name: string; mrn: string };
    from_hospital?: { name: string; city: string };
    to_hospital?: { name: string; city: string };
}

interface Patient {
    id: string;
    mrn: string;
    full_name: string;
}

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
    icu_bed: <Bed className="h-4 w-4" />,
    ventilator: <Wind className="h-4 w-4" />,
    operation_theater: <Activity className="h-4 w-4" />,
    mri: <Scan className="h-4 w-4" />,
    ct_scan: <Scan className="h-4 w-4" />,
    specialist: <Stethoscope className="h-4 w-4" />,
};

const URGENCY_COLORS: Record<string, string> = {
    critical: 'text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300',
    urgent: 'text-orange-700 bg-orange-100 dark:bg-orange-900 dark:text-orange-300',
    routine: 'text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-300',
};

const REFERRAL_STATUS_ICONS: Record<string, React.ReactNode> = {
    pending: <Clock className="h-4 w-4 text-yellow-500" />,
    accepted: <CheckCircle className="h-4 w-4 text-green-500" />,
    rejected: <XCircle className="h-4 w-4 text-red-500" />,
    completed: <CheckCircle className="h-4 w-4 text-blue-500" />,
};

export default function NetworkPage() {
    return <PageGuard><NetworkContent /></PageGuard>;
}

function NetworkContent() {
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [resourceFilter, setResourceFilter] = useState('all');
    const [showReferral, setShowReferral] = useState(false);
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'hospitals' | 'referrals'>('hospitals');

    const [refForm, setRefForm] = useState({
        patient_id: '', reason: '', urgency: 'routine', required_resource: '', notes: '',
    });

    useEffect(() => {
        fetchAll();
    }, []);

    async function fetchAll() {
        setIsLoading(true);
        try {
            const [hospRes, refRes, patRes] = await Promise.all([
                fetch('/api/network/hospitals'),
                fetch('/api/network/referrals'),
                fetch('/api/patients?per_page=200'),
            ]);
            const [hospJson, refJson, patJson] = await Promise.all([hospRes.json(), refRes.json(), patRes.json()]);
            if (hospJson.data) setHospitals(hospJson.data);
            if (refJson.data) setReferrals(refJson.data);
            if (patJson.data) setPatients(patJson.data);
        } catch { /* ignore */ }
        finally { setIsLoading(false); }
    }

    async function handleReferral(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedHospital) return;
        setIsSubmitting(true);
        try {
            const ownHospital = hospitals[0]; // First hospital is "ours" (nearest)
            const res = await fetch('/api/network/referrals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...refForm,
                    from_hospital_id: ownHospital?.id,
                    to_hospital_id: selectedHospital.id,
                }),
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                setMessage({ type: 'error', text: json.error ?? 'Referral failed' });
            } else {
                setMessage({ type: 'success', text: `Patient referred to ${selectedHospital.name}` });
                setShowReferral(false);
                setSelectedHospital(null);
                setRefForm({ patient_id: '', reason: '', urgency: 'routine', required_resource: '', notes: '' });
                fetchAll();
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error' });
        } finally { setIsSubmitting(false); }
    }

    function getUtilizationColor(available: number, total: number) {
        if (total === 0) return 'bg-slate-200 dark:bg-slate-700';
        const ratio = available / total;
        if (ratio > 0.5) return 'bg-emerald-500';
        if (ratio > 0.2) return 'bg-amber-500';
        return 'bg-red-500';
    }

    const filteredHospitals = hospitals.filter(h => {
        if (search && !h.name.toLowerCase().includes(search.toLowerCase()) && !h.city.toLowerCase().includes(search.toLowerCase())) return false;
        if (resourceFilter !== 'all') {
            return h.hospital_resources?.some(r => r.resource_type === resourceFilter && r.available_count > 0);
        }
        return true;
    });

    const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Building2 className="h-6 w-6" />
                    <div>
                        <h1 className="text-2xl font-bold">Hospital Network</h1>
                        <p className="text-sm text-muted-foreground">Real-time resource availability & patient referral</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('hospitals')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'hospitals' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
                        Hospitals
                    </button>
                    <button onClick={() => setActiveTab('referrals')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'referrals' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
                        Referrals ({referrals.length})
                    </button>
                </div>
            </div>

            {message && (
                <div className={`text-sm rounded-md p-3 border ${message.type === 'error' ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-600 bg-green-50 border-green-200'}`}>
                    {message.text}
                </div>
            )}

            {activeTab === 'hospitals' && (
                <>
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input placeholder="Search hospitals..." value={search} onChange={e => setSearch(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm" />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <select value={resourceFilter} onChange={e => setResourceFilter(e.target.value)}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                                <option value="all">All Resources</option>
                                <option value="icu_bed">ICU Beds</option>
                                <option value="ventilator">Ventilators</option>
                                <option value="operation_theater">Operation Theaters</option>
                                <option value="mri">MRI</option>
                                <option value="ct_scan">CT Scan</option>
                                <option value="dialysis_unit">Dialysis</option>
                                <option value="blood_bank">Blood Bank</option>
                                <option value="ambulance">Ambulance</option>
                            </select>
                        </div>
                    </div>

                    {/* Hospital Grid */}
                    {isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredHospitals.map(h => (
                                <div key={h.id} className="bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="font-semibold text-base">{h.name}</h3>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                    <MapPin className="h-3 w-3" /> {h.city}, {h.state}
                                                    {h.distance_km > 0 && <span className="ml-1">· {h.distance_km} km</span>}
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-semibold px-2 py-1 rounded bg-secondary text-secondary-foreground uppercase">
                                                {h.hospital_type.replace('_', ' ')}
                                            </span>
                                        </div>

                                        {/* Key metrics */}
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="text-center p-2 bg-secondary/50 rounded">
                                                <p className="text-lg font-bold">{h.available_beds}</p>
                                                <p className="text-[10px] text-muted-foreground">Beds Free</p>
                                                <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
                                                    <div className={`h-1.5 rounded-full ${getUtilizationColor(h.available_beds, h.total_beds)}`}
                                                        style={{ width: `${h.total_beds > 0 ? (h.available_beds / h.total_beds) * 100 : 0}%` }} />
                                                </div>
                                            </div>
                                            <div className="text-center p-2 bg-secondary/50 rounded">
                                                <p className="text-lg font-bold">{h.icu_available}</p>
                                                <p className="text-[10px] text-muted-foreground">ICU Free</p>
                                                <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
                                                    <div className={`h-1.5 rounded-full ${getUtilizationColor(h.icu_available, h.icu_total)}`}
                                                        style={{ width: `${h.icu_total > 0 ? (h.icu_available / h.icu_total) * 100 : 0}%` }} />
                                                </div>
                                            </div>
                                            <div className="text-center p-2 bg-secondary/50 rounded">
                                                <p className="text-lg font-bold">{h.ventilators_available}</p>
                                                <p className="text-[10px] text-muted-foreground">Ventilators</p>
                                                <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
                                                    <div className={`h-1.5 rounded-full ${getUtilizationColor(h.ventilators_available, h.ventilators_total)}`}
                                                        style={{ width: `${h.ventilators_total > 0 ? (h.ventilators_available / h.ventilators_total) * 100 : 0}%` }} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Resources grid */}
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {h.hospital_resources?.filter(r => r.total_count > 0).map(r => (
                                                <span key={r.id} className={`text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1 ${r.available_count > 0
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                                    }`}>
                                                    {RESOURCE_ICONS[r.resource_type] || <Activity className="h-3 w-3" />}
                                                    {r.resource_name}: {r.available_count}/{r.total_count}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {h.phone && (
                                                <a href={`tel:${h.phone}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                                    <Phone className="h-3 w-3" /> {h.phone}
                                                </a>
                                            )}
                                            <div className="flex-1" />
                                            <button onClick={() => { setSelectedHospital(h); setShowReferral(true); }}
                                                className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md">
                                                <Send className="h-3 w-3" /> Refer Patient
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'referrals' && (
                <div className="bg-card rounded-lg border shadow-sm">
                    <div className="p-6 pb-4">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4" /> Referral History
                        </h2>
                    </div>
                    <div className="px-6 pb-6">
                        {referrals.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No referrals yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {referrals.map(ref => (
                                    <div key={ref.id} className="flex items-center gap-3 p-3 rounded-lg border">
                                        {REFERRAL_STATUS_ICONS[ref.status] || REFERRAL_STATUS_ICONS.pending}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold">{ref.patients?.full_name ?? 'Unknown'}</p>
                                            <p className="text-xs text-muted-foreground">{ref.from_hospital?.name} → {ref.to_hospital?.name}</p>
                                            <p className="text-xs text-muted-foreground">{ref.reason}</p>
                                        </div>
                                        <span className={`text-[10px] font-semibold px-2 py-1 rounded ${URGENCY_COLORS[ref.urgency] ?? ''}`}>
                                            {ref.urgency}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{new Date(ref.created_at).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Referral Modal */}
            {showReferral && selectedHospital && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-card rounded-xl border shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold mb-1">Refer Patient to {selectedHospital.name}</h2>
                            <p className="text-sm text-muted-foreground mb-4">{selectedHospital.city}, {selectedHospital.state}</p>
                            <form onSubmit={handleReferral} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Patient *</label>
                                    <select value={refForm.patient_id} onChange={e => setRefForm({ ...refForm, patient_id: e.target.value })} required className={inputClass}>
                                        <option value="">Select patient...</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.full_name} ({p.mrn})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Reason *</label>
                                    <input value={refForm.reason} onChange={e => setRefForm({ ...refForm, reason: e.target.value })} required placeholder="Reason for referral..." className={inputClass} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Urgency</label>
                                        <select value={refForm.urgency} onChange={e => setRefForm({ ...refForm, urgency: e.target.value })} className={inputClass}>
                                            <option value="routine">Routine</option>
                                            <option value="urgent">Urgent</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Required Resource</label>
                                        <input value={refForm.required_resource} onChange={e => setRefForm({ ...refForm, required_resource: e.target.value })} placeholder="e.g. ICU bed" className={inputClass} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Notes</label>
                                    <input value={refForm.notes} onChange={e => setRefForm({ ...refForm, notes: e.target.value })} placeholder="Additional notes..." className={inputClass} />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => { setShowReferral(false); setSelectedHospital(null); }}
                                        className="flex-1 h-10 rounded-md border border-input bg-background hover:bg-accent text-sm font-medium">Cancel</button>
                                    <button type="submit" disabled={isSubmitting}
                                        className="flex-1 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium disabled:opacity-50">
                                        {isSubmitting ? 'Referring...' : 'Confirm Referral'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
