// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatWaitTime(minutes: number): string {
    if (minutes < 1) return 'Just arrived';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

export function formatDateTime(isoString: string): string {
    return format(new Date(isoString), 'dd MMM yyyy HH:mm');
}

export function formatTimeAgo(isoString: string): string {
    return formatDistanceToNow(new Date(isoString), { addSuffix: true });
}

export function round(n: number, decimals = 2): number {
    return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

export const SEVERITY_COLORS = {
    critical: {
        bg: 'bg-red-50 dark:bg-red-950',
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-200 dark:border-red-800',
        badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        dot: 'bg-red-500',
        row: 'bg-red-50/50 dark:bg-red-950/20',
    },
    urgent: {
        bg: 'bg-orange-50 dark:bg-orange-950',
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-200 dark:border-orange-800',
        badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        dot: 'bg-orange-500',
        row: 'bg-orange-50/50 dark:bg-orange-950/20',
    },
    moderate: {
        bg: 'bg-yellow-50 dark:bg-yellow-950',
        text: 'text-yellow-700 dark:text-yellow-300',
        border: 'border-yellow-200 dark:border-yellow-800',
        badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        dot: 'bg-yellow-500',
        row: 'bg-yellow-50/30 dark:bg-yellow-950/10',
    },
    minor: {
        bg: 'bg-green-50 dark:bg-green-950',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800',
        badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        dot: 'bg-green-500',
        row: '',
    },
    nonurgent: {
        bg: 'bg-blue-50 dark:bg-blue-950',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        dot: 'bg-blue-400',
        row: '',
    },
} as const;

export function apiError(message: string, status = 500) {
    return Response.json({ data: null, error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
    return Response.json({ data, error: null }, { status });
}
