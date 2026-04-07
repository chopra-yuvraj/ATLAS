// src/app/(dashboard)/tokens/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { KeyRound, Copy, Check, RefreshCw, Clock, User, AlertCircle, Loader2, Search } from 'lucide-react';

interface Token {
    id: string;
    token_code: string;
    is_used: boolean;
    expires_at: string;
    created_at: string;
    patients: { full_name: string; mrn: string } | null;
}

interface Patient {
    id: string;
    mrn: string;
    full_name: string;
    status: string;
}

export default function TokensPage() {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [generatedToken, setGeneratedToken] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch tokens and patients
    useEffect(() => {
        fetchTokens();
        fetchPatients();
    }, []);

    async function fetchTokens() {
        try {
            const res = await fetch('/api/patient-tokens?limit=30');
            const json = await res.json();
            if (json.data) setTokens(json.data);
        } catch { /* ignore */ }
        finally { setIsLoading(false); }
    }

    async function fetchPatients() {
        try {
            const res = await fetch('/api/patients?status=waiting&per_page=100');
            const json = await res.json();
            if (json.data) setPatients(json.data);
        } catch { /* ignore */ }
    }

    async function generateToken() {
        if (!selectedPatient) return;
        setIsGenerating(true);
        setError(null);
        setGeneratedToken(null);

        try {
            const res = await fetch('/api/patient-tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_id: selectedPatient }),
            });

            const json = await res.json();
            if (!res.ok || json.error) {
                setError(json.error || 'Failed to generate token');
                return;
            }

            setGeneratedToken(json.data.token_code);
            fetchTokens(); // Refresh list
        } catch {
            setError('Network error');
        } finally {
            setIsGenerating(false);
        }
    }

    function copyToken(code: string) {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function isExpired(expiresAt: string) {
        return new Date(expiresAt) < new Date();
    }

    const filteredPatients = patients.filter(p =>
        p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.mrn.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <KeyRound className="h-6 w-6" />
                <div>
                    <h1 className="text-2xl font-bold">Patient Access Tokens</h1>
                    <p className="text-sm text-muted-foreground">
                        Generate login codes for patients to use the AI chatbot intake system
                    </p>
                </div>
            </div>

            {/* Generate Token Card */}
            <div className="bg-card rounded-lg border shadow-sm">
                <div className="p-6 pb-4">
                    <h2 className="text-base font-semibold">Generate New Token</h2>
                    <p className="text-sm text-muted-foreground">
                        Select a patient and generate a one-time access code
                    </p>
                </div>
                <div className="px-6 pb-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Patient</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by name or MRN..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                        {searchQuery && (
                            <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                                {filteredPatients.length === 0 ? (
                                    <p className="p-3 text-sm text-muted-foreground">No patients found</p>
                                ) : (
                                    filteredPatients.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => { setSelectedPatient(p.id); setSearchQuery(p.full_name); }}
                                            className={`w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors ${
                                                selectedPatient === p.id ? 'bg-accent' : ''
                                            }`}
                                        >
                                            <span className="font-medium">{p.full_name}</span>
                                            <span className="text-muted-foreground ml-2">MRN: {p.mrn}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={generateToken}
                        disabled={!selectedPatient || isGenerating}
                        className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        {isGenerating ? 'Generating...' : 'Generate Token'}
                    </button>

                    {/* Generated Token Display */}
                    {generatedToken && (
                        <div className="mt-4 p-6 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-3">
                            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                                Token generated successfully! Provide this to the patient:
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <code className="text-3xl font-bold font-mono tracking-[0.3em] text-emerald-800 dark:text-emerald-200">
                                    {generatedToken}
                                </code>
                                <button
                                    onClick={() => copyToken(generatedToken)}
                                    className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-md transition-colors"
                                >
                                    {copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5 text-emerald-600" />}
                                </button>
                            </div>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                Patient will also need their date of birth to log in. Token expires in 24 hours.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Tokens Table */}
            <div className="bg-card rounded-lg border shadow-sm">
                <div className="p-6 pb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold">Recent Tokens</h2>
                        <p className="text-sm text-muted-foreground">History of generated access codes</p>
                    </div>
                    <button
                        onClick={fetchTokens}
                        className="p-2 hover:bg-accent rounded-md transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
                <div className="px-6 pb-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : tokens.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No tokens generated yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-3 font-medium text-muted-foreground">Token</th>
                                        <th className="pb-3 font-medium text-muted-foreground">Patient</th>
                                        <th className="pb-3 font-medium text-muted-foreground">Status</th>
                                        <th className="pb-3 font-medium text-muted-foreground">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {tokens.map(token => (
                                        <tr key={token.id} className="hover:bg-accent/50 transition-colors">
                                            <td className="py-3">
                                                <code className="font-mono font-semibold tracking-wider">
                                                    {token.token_code}
                                                </code>
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <span>{token.patients?.full_name || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                {token.is_used ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                        <Check className="h-3 w-3" />
                                                        Used
                                                    </span>
                                                ) : isExpired(token.expires_at) ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                        <Clock className="h-3 w-3" />
                                                        Expired
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                                        <KeyRound className="h-3 w-3" />
                                                        Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(token.created_at).toLocaleDateString()} {new Date(token.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
