// src/hooks/useRealtimeQueue.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { QueueEntry } from '@/types/database';

export function useRealtimeQueue() {
    const [queue, setQueue] = useState<QueueEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const supabase = createClient();
    const prevRanksRef = useRef<Record<string, number>>({});
    const [changedPatients, setChangedPatients] = useState<Set<string>>(new Set());

    const fetchQueue = useCallback(async () => {
        const { data, error: fetchError } = await supabase
            .from('active_queue')
            .select('*');

        if (fetchError) {
            setError(fetchError.message);
            return;
        }

        const newQueue = data ?? [];

        const newRanks: Record<string, number> = {};
        const changed = new Set<string>();

        for (const entry of newQueue) {
            newRanks[entry.patient_id] = entry.queue_rank ?? 999;
            const prevRank = prevRanksRef.current[entry.patient_id];
            if (prevRank !== undefined && prevRank !== newRanks[entry.patient_id]) {
                changed.add(entry.patient_id);
            }
        }

        prevRanksRef.current = newRanks;

        if (changed.size > 0) {
            setChangedPatients(changed);
            setTimeout(() => setChangedPatients(new Set()), 2000);
        }

        setQueue(newQueue);
        setLastUpdated(new Date());
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchQueue();

        const channel = supabase
            .channel('triage-queue-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'triage_scores' },
                () => { fetchQueue(); }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'patients' },
                () => { fetchQueue(); }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchQueue, supabase]);

    return {
        queue,
        isLoading,
        error,
        lastUpdated,
        changedPatients,
        refresh: fetchQueue,
    };
}
