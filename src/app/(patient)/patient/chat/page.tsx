// src/app/(patient)/patient/chat/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import {
    Mic, MicOff, Send, Volume2, VolumeX, Activity,
    Loader2, AlertCircle, Bot, BarChart3, Clock,
    Stethoscope, MapPin, Pill, HelpCircle, Heart,
    Bell, BedDouble, UserCheck,
} from 'lucide-react';

interface SessionData {
    session_id: string;
    patient_id: string;
    patient_name: string;
    language_code: string;
    form_id: string | null;
}

interface ChatMessage {
    id: string;
    sender: 'patient' | 'ai' | 'system';
    text: string;
    input_method: 'speech' | 'typed' | 'system';
    timestamp: Date;
    isNotification?: boolean;
}

interface ProgressData {
    status: string;
    severity_tier: string;
    wait_minutes: number;
    wait_estimate: string;
    chief_complaint: string;
    bed: string | null;
    doctor: string | null;
    arrived_at: string;
}

// ─── i18n ────────────────────────────────────────────────────
const UI: Record<string, Record<string, string>> = {
    'en-US': {
        placeholder: 'Ask me anything about your visit...',
        holdToSpeak: 'Hold the mic button and speak',
        progressBtn: 'My Status',
        progressLoading: 'Checking your status...',
        chipWait: 'How much longer is my wait?',
        chipCondition: 'Can you explain my condition?',
        chipExpect: 'What happens next for me?',
        chipDoctor: 'Who is my doctor?',
        chipKids: 'Where can I keep my child?',
        chipPharmacy: 'Where is the pharmacy?',
        chipFood: 'Where can I get food or water?',
        chipPain: 'My pain is getting worse',
        welcome: `Hello {{name}} -- welcome to the hospital. I'm your personal assistant for while you're here. I know your medical file, so I can give you real answers -- not generic ones. Ask me about your condition, your wait time, what to expect, where to find things, or anything else on your mind. I'm here for you.`,
        // Status change notifications
        statusWaiting: '{{name}}, you are currently in the queue. The medical team is aware you are here and will call you as soon as they can.',
        statusInTreatment: '{{name}}, great news -- you are now being seen by the medical team. Your treatment has started.',
        statusBedAssigned: '{{name}}, you have been assigned to bed {{bed}}. A nurse will guide you there shortly.',
        statusDoctorAssigned: '{{name}}, Dr. {{doctor}} has been assigned to your case. They will be with you soon.',
        statusReferred: '{{name}}, you are being referred to another facility for specialized care. More details will follow shortly.',
        // Progress report
        progressTitle: 'Here is your latest update --',
        statusLabel: 'Current status',
        waitLabel: 'Time waited',
        severityLabel: 'Priority level',
        bedLabel: 'Bed',
        doctorLabel: 'Doctor',
        complaintLabel: 'Your visit reason',
        waitMinutes: '{{mins}} minutes',
        notAssigned: 'Not yet assigned',
        estNextUp: 'You should be called in very soon.',
        estVerySoon: 'Almost there -- just a few more patients ahead.',
        estModerate: 'A few patients are being seen first, but your turn is approaching.',
        estLonger: 'There is a wait, but you are in the queue and the team knows you are here.',
        estInTreatment: 'You are currently being treated.',
        sevCritical: 'Critical -- highest priority',
        sevUrgent: 'Urgent',
        sevModerate: 'Moderate',
        sevMinor: 'Minor',
        sevNonurgent: 'Non-urgent',
    },
    'hi-IN': {
        placeholder: 'अपनी विज़िट के बारे में कुछ भी पूछें...',
        holdToSpeak: 'माइक बटन दबाकर बोलें',
        progressBtn: 'मेरी स्थिति',
        progressLoading: 'आपकी स्थिति देख रहा हूँ...',
        chipWait: 'मुझे और कितना इंतज़ार करना होगा?',
        chipCondition: 'क्या आप मेरी स्थिति समझा सकते हैं?',
        chipExpect: 'मेरे साथ आगे क्या होगा?',
        chipDoctor: 'मेरे डॉक्टर कौन हैं?',
        chipKids: 'मेरे बच्चे को कहाँ रख सकता हूँ?',
        chipPharmacy: 'फार्मेसी कहाँ है?',
        chipFood: 'खाना या पानी कहाँ मिलेगा?',
        chipPain: 'मेरा दर्द बढ़ रहा है',
        welcome: `नमस्ते {{name}} -- अस्पताल में आपका स्वागत है। मैं आपका निजी सहायक हूँ। मुझे आपकी पूरी मेडिकल फ़ाइल की जानकारी है, इसलिए मैं आपको सटीक जवाब दे सकता हूँ। अपनी स्थिति, इंतज़ार का समय, आगे क्या होगा, कहाँ क्या है -- कुछ भी पूछें। मैं यहीं हूँ आपके लिए।`,
        statusWaiting: '{{name}}, आप अभी कतार में हैं। मेडिकल टीम को पता है कि आप यहाँ हैं।',
        statusInTreatment: '{{name}}, बहुत अच्छी ख़बर -- अब आपका इलाज शुरू हो गया है।',
        statusBedAssigned: '{{name}}, आपको बेड {{bed}} दिया गया है। नर्स आपको वहाँ ले जाएंगी।',
        statusDoctorAssigned: '{{name}}, डॉ. {{doctor}} आपके केस पर हैं। वे जल्द ही आपके पास आएंगे।',
        statusReferred: '{{name}}, विशेष देखभाल के लिए आपको दूसरे अस्पताल भेजा जा रहा है।',
        progressTitle: 'आपकी ताज़ा जानकारी --',
        statusLabel: 'अभी की स्थिति',
        waitLabel: 'इंतज़ार का समय',
        severityLabel: 'प्राथमिकता',
        bedLabel: 'बेड',
        doctorLabel: 'डॉक्टर',
        complaintLabel: 'आने का कारण',
        waitMinutes: '{{mins}} मिनट',
        notAssigned: 'अभी तक नहीं',
        estNextUp: 'आपकी बारी बहुत जल्द आने वाली है।',
        estVerySoon: 'लगभग आ गई -- बस कुछ ही मरीज़ बाकी हैं।',
        estModerate: 'कुछ मरीज़ पहले देखे जा रहे हैं, लेकिन आपकी बारी आ रही है।',
        estLonger: 'इंतज़ार है, लेकिन आप कतार में हैं और टीम को पता है।',
        estInTreatment: 'आपका इलाज चल रहा है।',
        sevCritical: 'गंभीर -- सर्वोच्च प्राथमिकता',
        sevUrgent: 'ज़रूरी',
        sevModerate: 'मध्यम',
        sevMinor: 'मामूली',
        sevNonurgent: 'गैर-ज़रूरी',
    },
    'ta-IN': {
        placeholder: 'உங்கள் வருகை பற்றி எதையும் கேளுங்கள்...',
        holdToSpeak: 'மைக் பட்டனை அழுத்தி பேசுங்கள்',
        progressBtn: 'என் நிலை',
        progressLoading: 'உங்கள் நிலையை சரிபார்க்கிறேன்...',
        chipWait: 'இன்னும் எவ்வளவு நேரம் காத்திருக்க வேண்டும்?',
        chipCondition: 'என் நிலையை விளக்க முடியுமா?',
        chipExpect: 'எனக்கு அடுத்து என்ன நடக்கும்?',
        chipDoctor: 'என் மருத்துவர் யார்?',
        chipKids: 'என் குழந்தையை எங்கே விடலாம்?',
        chipPharmacy: 'மருந்தகம் எங்கே?',
        chipFood: 'உணவு அல்லது தண்ணீர் எங்கே?',
        chipPain: 'என் வலி அதிகரிக்கிறது',
        welcome: `வணக்கம் {{name}} -- மருத்துவமனைக்கு வரவேற்கிறோம். நான் உங்கள் தனிப்பட்ட உதவியாளர். உங்கள் முழு மருத்துவ கோப்பு எனக்குத் தெரியும். உங்கள் நிலை, காத்திருப்பு நேரம், அடுத்து என்ன நடக்கும் -- எதையும் கேளுங்கள்.`,
        statusWaiting: '{{name}}, நீங்கள் தற்போது வரிசையில் உள்ளீர்கள்.',
        statusInTreatment: '{{name}}, நல்ல செய்தி -- உங்கள் சிகிச்சை தொடங்கிவிட்டது.',
        statusBedAssigned: '{{name}}, உங்களுக்கு படுக்கை {{bed}} ஒதுக்கப்பட்டுள்ளது.',
        statusDoctorAssigned: '{{name}}, டாக்டர் {{doctor}} உங்கள் வழக்கில் நியமிக்கப்பட்டுள்ளார்.',
        statusReferred: '{{name}}, சிறப்பு சிகிச்சைக்காக நீங்கள் மற்றொரு மருத்துவமனைக்கு பரிந்துரைக்கப்படுகிறீர்கள்.',
        progressTitle: 'உங்கள் புதுப்பித்த தகவல் --',
        statusLabel: 'தற்போதைய நிலை', waitLabel: 'காத்திருந்த நேரம்', severityLabel: 'முன்னுரிமை',
        bedLabel: 'படுக்கை', doctorLabel: 'மருத்துவர்', complaintLabel: 'வருகை காரணம்',
        waitMinutes: '{{mins}} நிமிடங்கள்', notAssigned: 'இன்னும் நியமிக்கப்படவில்லை',
        estNextUp: 'விரைவில் அழைக்கப்படுவீர்கள்.', estVerySoon: 'கிட்டத்தட்ட வந்துவிட்டது.',
        estModerate: 'சில நோயாளிகள் முதலில் பார்க்கப்படுகிறார்கள்.', estLonger: 'காத்திருப்பு உள்ளது, ஆனால் நீங்கள் வரிசையில் உள்ளீர்கள்.',
        estInTreatment: 'சிகிச்சை நடைபெறுகிறது.',
        sevCritical: 'தீவிரமான', sevUrgent: 'அவசரமான', sevModerate: 'மிதமான', sevMinor: 'சிறிய', sevNonurgent: 'அவசரமற்ற',
    },
    'te-IN': {
        placeholder: 'మీ సందర్శన గురించి ఏదైనా అడగండి...',
        holdToSpeak: 'మైక్ బటన్ నొక్కి మాట్లాడండి',
        progressBtn: 'నా స్థితి',
        progressLoading: 'మీ స్థితిని చూస్తున్నాను...',
        chipWait: 'ఇంకా ఎంత సేపు వేచి ఉండాలి?',
        chipCondition: 'నా పరిస్థితిని వివరించగలరా?',
        chipExpect: 'నాకు తర్వాత ఏమి జరుగుతుంది?',
        chipDoctor: 'నా డాక్టర్ ఎవరు?',
        chipKids: 'నా పిల్లలని ఎక్కడ ఉంచగలను?',
        chipPharmacy: 'ఫార్మసీ ఎక్కడ?',
        chipFood: 'ఆహారం లేదా నీరు ఎక్కడ?',
        chipPain: 'నా నొప్పి పెరుగుతోంది',
        welcome: `నమస్కారం {{name}} -- హాస్పిటల్‌కు స్వాగతం. నేను మీ వ్యక్తిగత సహాయకుడిని. మీ పూర్తి మెడికల్ ఫైల్ నాకు తెలుసు. మీ పరిస్థితి, వేచి ఉండే సమయం, తర్వాత ఏమి జరుగుతుంది -- ఏదైనా అడగండి.`,
        statusWaiting: '{{name}}, మీరు ప్రస్తుతం క్యూలో ఉన్నారు.',
        statusInTreatment: '{{name}}, మంచి వార్త -- మీ చికిత్స ప్రారంభమైంది.',
        statusBedAssigned: '{{name}}, మీకు బెడ్ {{bed}} కేటాయించబడింది.',
        statusDoctorAssigned: '{{name}}, డాక్టర్ {{doctor}} మీ కేసుకు నియమించబడ్డారు.',
        statusReferred: '{{name}}, ప్రత్యేక చికిత్స కోసం మీరు మరొక హాస్పిటల్‌కు రిఫర్ చేయబడుతున్నారు.',
        progressTitle: 'మీ తాజా సమాచారం --',
        statusLabel: 'ప్రస్తుత స్థితి', waitLabel: 'వేచి ఉన్న సమయం', severityLabel: 'ప్రాధాన్యత',
        bedLabel: 'బెడ్', doctorLabel: 'డాక్టర్', complaintLabel: 'వచ్చిన కారణం',
        waitMinutes: '{{mins}} నిమిషాలు', notAssigned: 'ఇంకా కేటాయించబడలేదు',
        estNextUp: 'త్వరలో పిలవబడతారు.', estVerySoon: 'దాదాపు వచ్చేసింది.',
        estModerate: 'కొందరు రోగులు ముందు చూడబడుతున్నారు.', estLonger: 'వేచి ఉండాలి, కానీ మీరు క్యూలో ఉన్నారు.',
        estInTreatment: 'చికిత్స జరుగుతోంది.',
        sevCritical: 'తీవ్రమైన', sevUrgent: 'అత్యవసరం', sevModerate: 'మధ్యస్థం', sevMinor: 'చిన్నది', sevNonurgent: 'అత్యవసరం కాదు',
    },
};

function getUI(lang: string) { return UI[lang] || UI['en-US']; }

function buildProgressMsg(data: ProgressData, l: Record<string, string>): string {
    const lines: string[] = [l.progressTitle, ''];

    // Estimate
    const estMap: Record<string, string> = {
        in_treatment: l.estInTreatment, next_up: l.estNextUp,
        very_soon: l.estVerySoon, moderate_wait: l.estModerate, longer_wait: l.estLonger,
    };
    lines.push(estMap[data.wait_estimate] || l.estModerate);
    lines.push('');

    if (data.chief_complaint) lines.push(`${l.complaintLabel}: ${data.chief_complaint}`);
    lines.push(`${l.waitLabel}: ${l.waitMinutes.replace('{{mins}}', String(data.wait_minutes))}`);

    const sevMap: Record<string, string> = {
        critical: l.sevCritical, urgent: l.sevUrgent, moderate: l.sevModerate,
        minor: l.sevMinor, nonurgent: l.sevNonurgent,
    };
    lines.push(`${l.severityLabel}: ${sevMap[data.severity_tier] || data.severity_tier}`);

    if (data.doctor) lines.push(`${l.doctorLabel}: Dr. ${data.doctor}`);
    if (data.bed) lines.push(`${l.bedLabel}: ${data.bed}`);

    return lines.join('\n');
}

// ─── Component ───────────────────────────────────────────────
export default function PatientChatPage() {
    const router = useRouter();
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [textInput, setTextInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isProgressLoading, setIsProgressLoading] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track last known state for change detection
    const lastStatusRef = useRef<string>('');
    const lastBedRef = useRef<string | null>(null);
    const lastDoctorRef = useRef<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const languageCode = sessionData?.language_code || 'en-US';
    const labels = getUI(languageCode);

    const {
        transcript, interimTranscript, isListening, isSupported: sttSupported,
        start: startListening, stop: stopListening, reset: resetStt,
    } = useSpeechRecognition({ language: languageCode });

    const {
        speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported,
    } = useSpeechSynthesis({ language: languageCode });

    // ─── Push a notification into chat ───────────────────────
    const pushNotification = useCallback((text: string) => {
        const msg: ChatMessage = {
            id: `notif-${Date.now()}`,
            sender: 'system',
            text,
            input_method: 'system',
            timestamp: new Date(),
            isNotification: true,
        };
        setMessages(prev => [...prev, msg]);
        if (autoSpeak && ttsSupported) {
            speak(text);
        }
    }, [autoSpeak, ttsSupported, speak]);

    // ─── Poll for status changes every 30s ────────────────────
    useEffect(() => {
        if (!sessionData) return;

        const pollStatus = async () => {
            try {
                const res = await fetch('/api/patient-chat/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: sessionData.session_id }),
                });
                const json = await res.json();
                if (!res.ok || json.error) return;

                const d = json.data as ProgressData;
                const name = sessionData.patient_name.split(' ')[0];
                const l = getUI(sessionData.language_code);

                // Check for status change
                if (lastStatusRef.current && d.status !== lastStatusRef.current) {
                    if (d.status === 'in_treatment') {
                        pushNotification(l.statusInTreatment.replace('{{name}}', name));
                    } else if (d.status === 'waiting') {
                        pushNotification(l.statusWaiting.replace('{{name}}', name));
                    } else if (d.status === 'transferred') {
                        pushNotification(l.statusReferred.replace('{{name}}', name));
                    }
                }

                // Check for new bed assignment
                if (d.bed && d.bed !== lastBedRef.current) {
                    pushNotification(l.statusBedAssigned.replace('{{name}}', name).replace('{{bed}}', d.bed));
                }

                // Check for new doctor assignment
                if (d.doctor && d.doctor !== lastDoctorRef.current) {
                    pushNotification(l.statusDoctorAssigned.replace('{{name}}', name).replace('{{doctor}}', d.doctor));
                }

                lastStatusRef.current = d.status;
                lastBedRef.current = d.bed;
                lastDoctorRef.current = d.doctor;
            } catch { /* silent */ }
        };

        // Initial poll (delayed to avoid racing with welcome)
        const initialTimer = setTimeout(pollStatus, 3000);
        const interval = setInterval(pollStatus, 30000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, [sessionData, pushNotification]);

    // ─── Load session + personalized welcome ─────────────────
    useEffect(() => {
        const stored = sessionStorage.getItem('patient_session');
        if (!stored) { router.push('/patient/login'); return; }
        try {
            const data = JSON.parse(stored) as SessionData;
            setSessionData(data);
            const l = getUI(data.language_code);
            const welcomeText = l.welcome.replace(/\{\{name\}\}/g, data.patient_name.split(' ')[0]);

            setMessages([{
                id: 'welcome',
                sender: 'ai',
                text: welcomeText,
                input_method: 'system',
                timestamp: new Date(),
            }]);

            if (ttsSupported) setTimeout(() => speak(welcomeText), 600);
        } catch { router.push('/patient/login'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle completed speech
    useEffect(() => {
        if (transcript && !isListening) {
            sendMessage(transcript, 'speech');
            resetStt();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transcript, isListening]);

    // ─── Send message — ALWAYS through AI ────────────────────
    const sendMessage = useCallback(async (text: string, method: 'speech' | 'typed') => {
        if (!text.trim() || !sessionData || isProcessing) return;
        setError(null);
        setIsProcessing(true);

        const patientMsg: ChatMessage = {
            id: `p-${Date.now()}`, sender: 'patient', text: text.trim(),
            input_method: method, timestamp: new Date(),
        };
        setMessages(prev => [...prev, patientMsg]);
        setTextInput('');

        try {
            const res = await fetch('/api/patient-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionData.session_id,
                    text: text.trim(),
                    input_method: method,
                    language_code: languageCode,
                }),
            });
            const json = await res.json();
            if (!res.ok || json.error) { setError(json.error || 'Something went wrong'); return; }

            const aiMsg: ChatMessage = {
                id: `ai-${Date.now()}`, sender: 'ai', text: json.data.ai_response,
                input_method: 'system', timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiMsg]);
            if (autoSpeak && ttsSupported) speak(json.data.ai_response);
        } catch { setError('Network error. Please try again.'); }
        finally { setIsProcessing(false); }
    }, [sessionData, isProcessing, languageCode, autoSpeak, ttsSupported, speak]);

    // ─── Fetch Progress ──────────────────────────────────────
    const fetchProgress = useCallback(async () => {
        if (!sessionData || isProgressLoading) return;
        setIsProgressLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/patient-chat/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionData.session_id }),
            });
            const json = await res.json();
            if (!res.ok || json.error) { setError(json.error || 'Could not fetch status'); return; }

            const progressText = buildProgressMsg(json.data as ProgressData, labels);
            setMessages(prev => [...prev, {
                id: `prog-${Date.now()}`, sender: 'ai', text: progressText,
                input_method: 'system', timestamp: new Date(), isNotification: true,
            }]);
            if (autoSpeak && ttsSupported) speak(progressText);

            // Update refs
            const d = json.data as ProgressData;
            lastStatusRef.current = d.status;
            lastBedRef.current = d.bed;
            lastDoctorRef.current = d.doctor;
        } catch { setError('Could not fetch status.'); }
        finally { setIsProgressLoading(false); }
    }, [sessionData, isProgressLoading, labels, autoSpeak, ttsSupported, speak]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (textInput.trim()) sendMessage(textInput, 'typed');
    };

    // Quick chips — practical questions + condition-specific
    const chips = [
        { text: labels.chipWait, icon: <Clock className="h-3.5 w-3.5" /> },
        { text: labels.chipCondition, icon: <Stethoscope className="h-3.5 w-3.5" /> },
        { text: labels.chipExpect, icon: <HelpCircle className="h-3.5 w-3.5" /> },
        { text: labels.chipDoctor, icon: <UserCheck className="h-3.5 w-3.5" /> },
        { text: labels.chipPain, icon: <Heart className="h-3.5 w-3.5" /> },
        { text: labels.chipKids, icon: <Heart className="h-3.5 w-3.5" /> },
        { text: labels.chipPharmacy, icon: <Pill className="h-3.5 w-3.5" /> },
        { text: labels.chipFood, icon: <MapPin className="h-3.5 w-3.5" /> },
    ];

    if (!sessionData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            {/* Header */}
            <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                        <Activity className="h-4 w-4 text-indigo-400" />
                        <span className="font-semibold text-sm text-indigo-300">ATLAS</span>
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-sm font-medium text-white">{sessionData.patient_name}</p>
                        <p className="text-[11px] text-slate-400">{languageCode}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchProgress}
                        disabled={isProgressLoading || isProcessing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-teal-600/25 to-emerald-600/25 border border-teal-500/25 text-teal-300 hover:from-teal-600/40 hover:to-emerald-600/40 transition-all disabled:opacity-40"
                    >
                        {isProgressLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                        <span className="hidden sm:inline">{labels.progressBtn}</span>
                    </button>
                    <button
                        onClick={() => { setAutoSpeak(!autoSpeak); if (isSpeaking) stopSpeaking(); }}
                        className={`p-2 rounded-lg transition-all ${autoSpeak ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-400'}`}
                    >
                        {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                        {/* Notification banner style */}
                        {msg.isNotification && msg.sender === 'system' ? (
                            <div className="w-full max-w-lg mx-auto bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                                <div className="flex items-start gap-2">
                                    <Bell className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-amber-200 leading-relaxed">{msg.text}</p>
                                        <span className="text-[10px] text-amber-400/50 mt-1 block">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`max-w-[85%] sm:max-w-[75%] ${msg.sender === 'patient' ? '' : 'flex gap-2'}`}>
                                {msg.sender !== 'patient' && (
                                    <div className="shrink-0 mt-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                            msg.isNotification
                                                ? 'bg-gradient-to-br from-teal-500 to-emerald-600'
                                                : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                        }`}>
                                            {msg.isNotification ? <BarChart3 className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                                        </div>
                                    </div>
                                )}
                                <div className={`rounded-2xl px-4 py-3 ${
                                    msg.sender === 'patient'
                                        ? 'bg-indigo-600/80 text-white rounded-br-sm'
                                        : msg.isNotification
                                            ? 'bg-teal-500/10 text-slate-100 rounded-bl-sm border border-teal-500/20'
                                            : 'bg-white/8 text-slate-100 rounded-bl-sm border border-white/5'
                                }`}>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[10px] opacity-40">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {msg.sender === 'patient' && msg.input_method === 'speech' && <Mic className="h-3 w-3 opacity-40" />}
                                        {msg.sender === 'ai' && ttsSupported && (
                                            <button onClick={() => speak(msg.text)} className="opacity-40 hover:opacity-100 transition-opacity">
                                                <Volume2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Typing indicator */}
                {isProcessing && (
                    <div className="flex gap-2 animate-in fade-in duration-200">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-white/8 rounded-2xl rounded-bl-sm px-4 py-3 border border-white/5">
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                {isProgressLoading && (
                    <div className="flex gap-2 animate-in fade-in duration-200">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0">
                            <BarChart3 className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-teal-500/10 rounded-2xl rounded-bl-sm px-4 py-3 border border-teal-500/20">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                                <span className="text-sm text-teal-300">{labels.progressLoading}</span>
                            </div>
                        </div>
                    </div>
                )}

                {interimTranscript && (
                    <div className="flex justify-end">
                        <div className="bg-indigo-600/40 text-white/70 rounded-2xl rounded-br-sm px-4 py-3 max-w-[75%] italic text-sm">
                            {interimTranscript}...
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick chips — always visible, horizontally scrollable */}
            <div className="px-3 pb-2 shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {chips.map((chip, i) => (
                        <button
                            key={i}
                            onClick={() => sendMessage(chip.text, 'typed')}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-40 whitespace-nowrap shrink-0"
                        >
                            {chip.icon}
                            {chip.text}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mx-4 mb-2 flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">x</button>
                </div>
            )}

            {/* Input */}
            <div className="shrink-0 bg-white/5 backdrop-blur-xl border-t border-white/10 p-3">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    {sttSupported && (
                        <button
                            type="button"
                            onMouseDown={startListening} onMouseUp={stopListening}
                            onTouchStart={startListening} onTouchEnd={stopListening}
                            disabled={isProcessing}
                            className={`relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                                isListening
                                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 scale-110'
                                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                            } disabled:opacity-40`}
                        >
                            {isListening && <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />}
                            {isListening ? <Mic className="h-5 w-5 relative z-10" /> : <MicOff className="h-5 w-5" />}
                        </button>
                    )}
                    <input
                        type="text"
                        value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                        placeholder={isListening ? 'Listening...' : labels.placeholder}
                        disabled={isProcessing || isListening}
                        className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-40 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!textInput.trim() || isProcessing}
                        className="shrink-0 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </form>
                {sttSupported && (
                    <p className="text-[11px] text-slate-500 text-center mt-1.5">{labels.holdToSpeak}</p>
                )}
            </div>
        </div>
    );
}
