// src/hooks/useSpeechSynthesis.ts
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseSpeechSynthesisOptions {
    language: string;  // BCP-47 code
    rate?: number;
    pitch?: number;
}

interface UseSpeechSynthesisReturn {
    speak: (text: string) => void;
    stop: () => void;
    isSpeaking: boolean;
    isSupported: boolean;
    voices: SpeechSynthesisVoice[];
}

export function useSpeechSynthesis({
    language,
    rate = 0.9,
    pitch = 1,
}: UseSpeechSynthesisOptions): UseSpeechSynthesisReturn {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    // Load available voices
    useEffect(() => {
        if (!isSupported) return;

        function loadVoices() {
            const available = window.speechSynthesis.getVoices();
            setVoices(available);
        }

        loadVoices();
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
        return () => {
            window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        };
    }, [isSupported]);

    // Find the best voice for the language
    const getBestVoice = useCallback(
        (lang: string): SpeechSynthesisVoice | null => {
            if (voices.length === 0) return null;

            // Exact match first
            const exact = voices.find(v => v.lang === lang);
            if (exact) return exact;

            // Prefix match (e.g. 'hi' matches 'hi-IN')
            const prefix = lang.split('-')[0];
            const prefixMatch = voices.find(v => v.lang.startsWith(prefix));
            if (prefixMatch) return prefixMatch;

            // Fall back to Google voice if available
            const googleVoice = voices.find(
                v => v.lang.startsWith(prefix) && v.name.includes('Google')
            );
            if (googleVoice) return googleVoice;

            return null;
        },
        [voices]
    );

    const speak = useCallback(
        (text: string) => {
            if (!isSupported || !text.trim()) return;

            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = language;
            utterance.rate = rate;
            utterance.pitch = pitch;

            const voice = getBestVoice(language);
            if (voice) utterance.voice = voice;

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);

            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
        },
        [isSupported, language, rate, pitch, getBestVoice]
    );

    const stop = useCallback(() => {
        if (!isSupported) return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, [isSupported]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isSupported) {
                window.speechSynthesis.cancel();
            }
        };
    }, [isSupported]);

    return {
        speak,
        stop,
        isSpeaking,
        isSupported,
        voices,
    };
}
