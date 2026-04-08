// src/app/(auth)/login/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Activity, Eye, EyeOff, ArrowRight, Stethoscope, Users, Shield } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const redirectPath = searchParams.get('redirect') || '/dashboard';

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

        if (authError) {
            setError(authError.message);
            setIsLoading(false);
            return;
        }

        router.push(redirectPath);
        router.refresh();
    }

    return (
        <div className="glass-card rounded-2xl shadow-2xl">
            <div className="p-8 pb-6">
                <h2 className="text-xl font-bold">Staff Login</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Sign in with your hospital credentials
                </p>
            </div>
            <div className="px-8 pb-8">
                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                            <Shield className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label htmlFor="email" className="text-sm font-medium">Email address</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="yourname@hospital.org"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-shadow"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="password" className="text-sm font-medium">Password</label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-10 transition-shadow"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full h-11 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center justify-center gap-2"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>Sign in <ArrowRight className="h-4 w-4" /></>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{
                background: 'linear-gradient(135deg, hsl(224 71% 4%) 0%, hsl(215 50% 8%) 40%, hsl(220 60% 6%) 100%)',
            }}
        >
            {/* Background decoration */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/8 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />

            <div className="w-full max-w-md space-y-8 relative z-10 animate-fade-in">
                {/* Logo */}
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl glass">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                                <Activity className="h-6 w-6 text-white animate-heartbeat" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-white tracking-wider text-lg">A.T.L.A.S.</p>
                                <p className="text-[10px] text-slate-400 leading-tight">Algorithmic Triage & Life Assessment System</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Role indicators */}
                <div className="flex justify-center gap-6 text-slate-400">
                    <div className="flex flex-col items-center gap-1">
                        <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                            <Stethoscope className="h-4 w-4" />
                        </div>
                        <span className="text-[10px]">Doctors</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                            <Users className="h-4 w-4" />
                        </div>
                        <span className="text-[10px]">Nurses</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                            <Shield className="h-4 w-4" />
                        </div>
                        <span className="text-[10px]">Admin</span>
                    </div>
                </div>

                {/* Login Form */}
                <Suspense fallback={<div className="glass-card rounded-2xl shadow-2xl p-8 text-center text-slate-400">Loading...</div>}>
                    <LoginForm />
                </Suspense>

                {/* Patient redirect */}
                <div className="glass rounded-xl p-4 text-center space-y-2">
                    <p className="text-sm text-slate-300">Are you a patient?</p>
                    <Link
                        href="/patient/login"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                        Go to Patient Check-in <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <p className="text-[11px] text-center text-slate-500">
                    For account issues, contact your system administrator.
                </p>
            </div>
        </div>
    );
}
