// src/app/(auth)/login/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Activity, Eye, EyeOff } from 'lucide-react';

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
        <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-6 pb-4">
                <h2 className="text-lg font-semibold">Staff Login</h2>
                <p className="text-sm text-muted-foreground">
                    Sign in with your hospital credentials
                </p>
            </div>
            <div className="px-6 pb-6">
                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
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
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl">
                            <Activity className="h-5 w-5 text-red-400" />
                            <span className="font-semibold">ED Triage System</span>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Emergency Department Priority Queue
                    </p>
                </div>

                <Suspense fallback={<div className="bg-card rounded-lg border shadow-sm p-6 text-center">Loading...</div>}>
                    <LoginForm />
                </Suspense>

                <p className="text-xs text-center text-muted-foreground">
                    For account issues, contact your system administrator.
                </p>
            </div>
        </div>
    );
}
