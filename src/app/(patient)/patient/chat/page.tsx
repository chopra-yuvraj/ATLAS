// src/app/(patient)/patient/chat/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import {
    Mic, MicOff, Send, Volume2, VolumeX, Activity,
    CheckCircle2, Loader2, AlertCircle, ClipboardCheck,
    User, Bot, ChevronDown, Stethoscope, Pill, Heart,
    Phone, UserCircle, FileText,
} from 'lucide-react';

interface SessionData {
    session_id: string;
    patient_id: string;
    patient_name: string;
    language_code: string;
    form_id: string | null;
    form?: IntakeForm;
}

interface ChatMessage {
    id: string;
    sender: 'patient' | 'ai' | 'system';
    text: string;
    input_method: 'speech' | 'typed' | 'system';
    timestamp: Date;
}

interface IntakeForm {
    id?: string;
    full_name_regional?: string | null;
    full_name_english?: string | null;
    age?: number | null;
    gender?: string | null;
    symptoms_regional?: string | null;
    symptoms_english?: string | null;
    allergies_regional?: string | null;
    allergies_english?: string | null;
    medications_regional?: string | null;
    medications_english?: string | null;
    medical_history_regional?: string | null;
    medical_history_english?: string | null;
    pain_level?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    patient_verified?: boolean;
    form_status?: string;
}

// i18n labels for the chat UI
const UI_LABELS: Record<string, Record<string, string>> = {
    'en-US': { typeMessage: 'Type your message...', send: 'Send', holdToSpeak: 'Hold to speak', formTitle: 'Your Information', submit: 'Verify & Submit', submitting: 'Submitting...', submitted: 'Submitted!', name: 'Name', age: 'Age', gender: 'Gender', symptoms: 'Symptoms', allergies: 'Allergies', medications: 'Medications', history: 'Medical History', pain: 'Pain Level', ecName: 'Emergency Contact', ecPhone: 'Contact Phone', greeting: 'Hello! I\'m your hospital intake assistant. How can I help you today?', complete: 'Form is complete! Please review and submit.', thankYou: 'Thank you! Your information has been submitted. A nurse will be with you shortly.' },
    'hi-IN': { typeMessage: 'अपना संदेश लिखें...', send: 'भेजें', holdToSpeak: 'बोलने के लिए दबाएं', formTitle: 'आपकी जानकारी', submit: 'सत्यापित करें और जमा करें', submitting: 'जमा हो रहा है...', submitted: 'जमा हो गया!', name: 'नाम', age: 'उम्र', gender: 'लिंग', symptoms: 'लक्षण', allergies: 'एलर्जी', medications: 'दवाइयां', history: 'चिकित्सा इतिहास', pain: 'दर्द स्तर', ecName: 'आपातकालीन संपर्क', ecPhone: 'संपर्क फ़ोन', greeting: 'नमस्ते! मैं आपका अस्पताल सहायक हूँ। आज मैं आपकी कैसे मदद कर सकता हूँ?', complete: 'फॉर्म पूरा है! कृपया समीक्षा करें और जमा करें।', thankYou: 'धन्यवाद! आपकी जानकारी जमा कर दी गई है। एक नर्स जल्द ही आपके पास आएगी।' },
    'ta-IN': { typeMessage: 'உங்கள் செய்தியை தட்டச்சு செய்யவும்...', send: 'அனுப்பு', holdToSpeak: 'பேச அழுத்தவும்', formTitle: 'உங்கள் தகவல்', submit: 'சரிபார்த்து சமர்ப்பிக்கவும்', submitting: 'சமர்ப்பிக்கிறது...', submitted: 'சமர்ப்பிக்கப்பட்டது!', name: 'பெயர்', age: 'வயது', gender: 'பாலினம்', symptoms: 'அறிகுறிகள்', allergies: 'ஒவ்வாமை', medications: 'மருந்துகள்', history: 'மருத்துவ வரலாறு', pain: 'வலி நிலை', ecName: 'அவசர தொடர்பு', ecPhone: 'தொடர்பு எண்', greeting: 'வணக்கம்! நான் உங்கள் மருத்துவமனை உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?', complete: 'படிவம் முழுமையாக உள்ளது! தயவுசெய்து மதிப்பாய்வு செய்து சமர்ப்பிக்கவும்.', thankYou: 'நன்றி! உங்கள் தகவல் சமர்ப்பிக்கப்பட்டது. ஒரு செவிலியர் விரைவில் உங்களிடம் வருவார்.' },
    'te-IN': { typeMessage: 'మీ సందేశాన్ని టైప్ చేయండి...', send: 'పంపు', holdToSpeak: 'మాట్లాడటానికి నొక్కండి', formTitle: 'మీ సమాచారం', submit: 'ధృవీకరించి సమర్పించండి', submitting: 'సమర్పిస్తోంది...', submitted: 'సమర్పించబడింది!', name: 'పేరు', age: 'వయసు', gender: 'లింగం', symptoms: 'లక్షణాలు', allergies: 'అలెర్జీలు', medications: 'మందులు', history: 'వైద్య చరిత్ర', pain: 'నొప్పి స్థాయి', ecName: 'అత్యవసర సంప్రదింపు', ecPhone: 'సంప్రదింపు ఫోన్', greeting: 'నమస్కారం! నేను మీ ఆసుపత్రి సహాయకుడిని. ఈ రోజు నేను మీకు ఎలా సహాయం చేయగలను?', complete: 'ఫారమ్ పూర్తయింది! దయచేసి సమీక్షించి సమర్పించండి.', thankYou: 'ధన్యవాదాలు! మీ సమాచారం సమర్పించబడింది. ఒక నర్సు త్వరలో మీ వద్దకు వస్తారు.' },
};

function getLabels(lang: string) {
    return UI_LABELS[lang] || UI_LABELS['en-US'];
}

export default function PatientChatPage() {
    const router = useRouter();
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [textInput, setTextInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [form, setForm] = useState<IntakeForm>({});
    const [showForm, setShowForm] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const languageCode = sessionData?.language_code || 'en-US';
    const labels = getLabels(languageCode);

    const {
        transcript,
        interimTranscript,
        isListening,
        isSupported: sttSupported,
        start: startListening,
        stop: stopListening,
        reset: resetStt,
    } = useSpeechRecognition({ language: languageCode });

    const {
        speak,
        stop: stopSpeaking,
        isSpeaking,
        isSupported: ttsSupported,
    } = useSpeechSynthesis({ language: languageCode });

    // Load session on mount
    useEffect(() => {
        const stored = sessionStorage.getItem('patient_session');
        if (!stored) {
            router.push('/patient/login');
            return;
        }
        try {
            const data = JSON.parse(stored) as SessionData;
            setSessionData(data);
            if (data.form) {
                setForm(data.form);
            }

            // Add greeting message
            const greetingLabels = getLabels(data.language_code);
            setMessages([{
                id: 'greeting',
                sender: 'ai',
                text: greetingLabels.greeting,
                input_method: 'system',
                timestamp: new Date(),
            }]);
        } catch {
            router.push('/patient/login');
        }
    }, [router]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle completed speech transcript
    useEffect(() => {
        if (transcript && !isListening) {
            sendMessage(transcript, 'speech');
            resetStt();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transcript, isListening]);

    const sendMessage = useCallback(async (text: string, method: 'speech' | 'typed') => {
        if (!text.trim() || !sessionData || isProcessing) return;

        setError(null);
        setIsProcessing(true);

        // Add patient message
        const patientMsg: ChatMessage = {
            id: `patient-${Date.now()}`,
            sender: 'patient',
            text: text.trim(),
            input_method: method,
            timestamp: new Date(),
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

            if (!res.ok || json.error) {
                setError(json.error || 'Failed to send message');
                return;
            }

            const { ai_response, form: updatedForm } = json.data;

            // Add AI message
            const aiMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                sender: 'ai',
                text: ai_response,
                input_method: 'system',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiMsg]);

            // Update form
            if (updatedForm) setForm(updatedForm);

            // Auto-speak AI response
            if (autoSpeak && ttsSupported) {
                speak(ai_response);
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    }, [sessionData, isProcessing, languageCode, autoSpeak, ttsSupported, speak]);

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (textInput.trim()) {
            sendMessage(textInput, 'typed');
        }
    };

    const handleSubmitForm = async () => {
        if (!sessionData || !form.id) return;
        setIsProcessing(true);

        try {
            const res = await fetch('/api/patient-chat/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionData.session_id,
                    form_id: form.id,
                    verification_method: 'on_screen',
                }),
            });

            const json = await res.json();
            if (res.ok && !json.error) {
                setIsSubmitted(true);
                setMessages(prev => [...prev, {
                    id: `system-${Date.now()}`,
                    sender: 'system',
                    text: labels.thankYou,
                    input_method: 'system',
                    timestamp: new Date(),
                }]);

                if (autoSpeak && ttsSupported) {
                    speak(labels.thankYou);
                }
            }
        } catch {
            setError('Submission failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Count filled fields
    const filledCount = [
        form.full_name_english, form.age, form.gender,
        form.symptoms_english, form.allergies_english,
        form.medications_english, form.medical_history_english,
        form.pain_level, form.emergency_contact_name, form.emergency_contact_phone,
    ].filter(v => v !== null && v !== undefined && v !== '').length;

    const isFormComplete = filledCount >= 7; // At minimum: name, age, gender, symptoms, pain_level + 2 more

    if (!sessionData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col lg:flex-row">
            {/* Chat Panel */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="bg-white/5 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                            <Activity className="h-4 w-4 text-red-400" />
                            <span className="font-semibold text-sm">ATLAS</span>
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-medium">{sessionData.patient_name}</p>
                            <p className="text-[11px] text-slate-400">{languageCode}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Form toggle button */}
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className={`lg:hidden relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                                showForm ? 'bg-indigo-500/30 text-white' : 'bg-white/10 text-slate-300'
                            }`}
                        >
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">{labels.formTitle}</span>
                            {filledCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                    {filledCount}
                                </span>
                            )}
                        </button>

                        {/* TTS toggle */}
                        <button
                            onClick={() => {
                                setAutoSpeak(!autoSpeak);
                                if (isSpeaking) stopSpeaking();
                            }}
                            className={`p-2 rounded-lg transition-all ${
                                autoSpeak ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-400'
                            }`}
                            title={autoSpeak ? 'Auto-speak ON' : 'Auto-speak OFF'}
                        >
                            {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                    {messages.map(msg => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] sm:max-w-[75%] ${
                                msg.sender === 'patient'
                                    ? 'order-1'
                                    : 'flex gap-2'
                            }`}>
                                {msg.sender !== 'patient' && (
                                    <div className="shrink-0 mt-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                            msg.sender === 'ai'
                                                ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                                : 'bg-slate-600'
                                        }`}>
                                            {msg.sender === 'ai' ? <Bot className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                        </div>
                                    </div>
                                )}
                                <div className={`rounded-2xl px-4 py-3 ${
                                    msg.sender === 'patient'
                                        ? 'bg-indigo-600/80 text-white rounded-br-md'
                                        : msg.sender === 'ai'
                                            ? 'bg-white/10 backdrop-blur-sm text-slate-100 rounded-bl-md border border-white/5'
                                            : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/20'
                                }`}>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[10px] opacity-50">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {msg.sender === 'patient' && msg.input_method === 'speech' && (
                                            <Mic className="h-3 w-3 opacity-50" />
                                        )}
                                        {msg.sender === 'ai' && ttsSupported && (
                                            <button
                                                onClick={() => speak(msg.text)}
                                                className="opacity-50 hover:opacity-100 transition-opacity"
                                            >
                                                <Volume2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {isProcessing && (
                        <div className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                                <Bot className="h-4 w-4" />
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl rounded-bl-md px-4 py-3 border border-white/5">
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Interim speech text */}
                    {interimTranscript && (
                        <div className="flex justify-end">
                            <div className="bg-indigo-600/40 text-white/70 rounded-2xl rounded-br-md px-4 py-3 max-w-[75%] italic text-sm">
                                {interimTranscript}...
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Error bar */}
                {error && (
                    <div className="mx-4 mb-2 flex items-center gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">✕</button>
                    </div>
                )}

                {/* Input Bar */}
                {!isSubmitted && (
                    <div className="shrink-0 bg-white/5 backdrop-blur-md border-t border-white/10 p-3">
                        <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
                            {/* Microphone Button */}
                            {sttSupported && (
                                <button
                                    type="button"
                                    onMouseDown={startListening}
                                    onMouseUp={stopListening}
                                    onTouchStart={startListening}
                                    onTouchEnd={stopListening}
                                    disabled={isProcessing}
                                    className={`relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                                        isListening
                                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 scale-110'
                                            : 'bg-white/10 text-slate-300 hover:bg-white/20'
                                    } disabled:opacity-40`}
                                >
                                    {isListening && (
                                        <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                                    )}
                                    {isListening ? <Mic className="h-5 w-5 relative z-10" /> : <MicOff className="h-5 w-5" />}
                                </button>
                            )}

                            {/* Text Input */}
                            <input
                                type="text"
                                value={textInput}
                                onChange={e => setTextInput(e.target.value)}
                                placeholder={isListening ? '🎙️ Listening...' : labels.typeMessage}
                                disabled={isProcessing || isListening}
                                className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-40 transition-all"
                            />

                            {/* Send Button */}
                            <button
                                type="submit"
                                disabled={!textInput.trim() || isProcessing}
                                className="shrink-0 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </form>

                        {sttSupported && (
                            <p className="text-[11px] text-slate-500 text-center mt-2">
                                {labels.holdToSpeak}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Form Preview Panel */}
            <div className={`
                ${showForm ? 'block' : 'hidden'} lg:block
                w-full lg:w-80 xl:w-96 border-l border-white/10 bg-white/[0.03] backdrop-blur-sm
                overflow-y-auto shrink-0
                absolute lg:relative inset-0 lg:inset-auto z-20 lg:z-auto
            `}>
                <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
                    <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-indigo-400" />
                        <h2 className="font-semibold text-sm">{labels.formTitle}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{filledCount}/10</span>
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${(filledCount / 10) * 100}%` }}
                            />
                        </div>
                        <button onClick={() => setShowForm(false)} className="lg:hidden p-1 hover:bg-white/10 rounded">
                            <ChevronDown className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-3">
                    <FormField icon={<UserCircle className="h-4 w-4" />} label={labels.name} value={form.full_name_english} regional={form.full_name_regional} />
                    <FormField icon={<User className="h-4 w-4" />} label={labels.age} value={form.age?.toString()} />
                    <FormField icon={<User className="h-4 w-4" />} label={labels.gender} value={form.gender} />
                    <FormField icon={<Stethoscope className="h-4 w-4" />} label={labels.symptoms} value={form.symptoms_english} regional={form.symptoms_regional} />
                    <FormField icon={<AlertCircle className="h-4 w-4" />} label={labels.allergies} value={form.allergies_english} regional={form.allergies_regional} />
                    <FormField icon={<Pill className="h-4 w-4" />} label={labels.medications} value={form.medications_english} regional={form.medications_regional} />
                    <FormField icon={<Heart className="h-4 w-4" />} label={labels.history} value={form.medical_history_english} regional={form.medical_history_regional} />
                    <FormField icon={<Activity className="h-4 w-4" />} label={labels.pain} value={form.pain_level ? `${form.pain_level}/10` : undefined} pain={form.pain_level} />
                    <FormField icon={<Phone className="h-4 w-4" />} label={labels.ecName} value={form.emergency_contact_name} />
                    <FormField icon={<Phone className="h-4 w-4" />} label={labels.ecPhone} value={form.emergency_contact_phone} />

                    {/* Submit Button */}
                    {!isSubmitted ? (
                        <button
                            onClick={handleSubmitForm}
                            disabled={!isFormComplete || isProcessing}
                            className={`w-full mt-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                                isFormComplete
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/25'
                                    : 'bg-white/5 text-slate-500 cursor-not-allowed'
                            }`}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {labels.submitting}
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    {labels.submit}
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-emerald-300">{labels.submitted}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Form field component
function FormField({
    icon,
    label,
    value,
    regional,
    pain,
}: {
    icon: React.ReactNode;
    label: string;
    value?: string | null;
    regional?: string | null;
    pain?: string | null;
}) {
    const filled = value !== null && value !== undefined && value !== '';

    return (
        <div className={`p-3 rounded-xl border transition-all duration-300 ${
            filled
                ? 'bg-indigo-500/10 border-indigo-500/20'
                : 'bg-white/[0.02] border-white/5'
        }`}>
            <div className="flex items-center gap-2 mb-1">
                <span className={filled ? 'text-indigo-400' : 'text-slate-500'}>{icon}</span>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
                {filled && <CheckCircle2 className="h-3 w-3 text-emerald-400 ml-auto" />}
            </div>
            {filled ? (
                <div>
                    <p className="text-sm text-white">{value}</p>
                    {regional && regional !== value && (
                        <p className="text-xs text-slate-400 mt-0.5">{regional}</p>
                    )}
                    {pain && (
                        <div className="mt-1.5 flex gap-0.5">
                            {Array.from({ length: 10 }, (_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full ${
                                        i < parseInt(pain)
                                            ? parseInt(pain) >= 7 ? 'bg-red-500' : parseInt(pain) >= 4 ? 'bg-yellow-500' : 'bg-emerald-500'
                                            : 'bg-white/10'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-xs text-slate-600 italic">—</p>
            )}
        </div>
    );
}
