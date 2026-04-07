// src/hooks/useSpeechRecognition.ts
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition: new () => SpeechRecognitionInstance;
    }
}

interface UseSpeechRecognitionOptions {
    language: string;
    continuous?: boolean;
    interimResults?: boolean;
}

interface UseSpeechRecognitionReturn {
    transcript: string;
    interimTranscript: string;
    isListening: boolean;
    isSupported: boolean;
    start: () => void;
    stop: () => void;
    reset: () => void;
    error: string | null;
}

export function useSpeechRecognition({
    language,
    continuous = false,
    interimResults = true,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

    const isSupported = typeof window !== 'undefined' && (
        'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    );

    const createRecognition = useCallback(() => {
        if (!isSupported) return null;

        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = language;
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    final += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            if (final) {
                setTranscript((prev: string) => prev + final);
                setInterimTranscript('');
            } else {
                setInterimTranscript(interim);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            setError(`Speech recognition error: ${event.error}`);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
            setInterimTranscript('');
        };

        return recognition;
    }, [isSupported, language, continuous, interimResults]);

    const start = useCallback(() => {
        setError(null);
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* ignore */ }
        }

        const recognition = createRecognition();
        if (!recognition) {
            setError('Speech recognition is not supported in this browser.');
            return;
        }

        recognitionRef.current = recognition;
        setTranscript('');
        setInterimTranscript('');

        try {
            recognition.start();
            setIsListening(true);
        } catch (err) {
            setError(`Failed to start: ${err}`);
        }
    }, [createRecognition]);

    const stop = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* ignore */ }
        }
        setIsListening(false);
    }, []);

    const reset = useCallback(() => {
        stop();
        setTranscript('');
        setInterimTranscript('');
        setError(null);
    }, [stop]);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch { /* ignore */ }
            }
        };
    }, []);

    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.lang = language;
        }
    }, [language]);

    return {
        transcript,
        interimTranscript,
        isListening,
        isSupported,
        start,
        stop,
        reset,
        error,
    };
}
