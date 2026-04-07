// src/app/(patient)/patient/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Globe, Calendar, KeyRound, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface SupportedLanguage {
    id: string;
    code: string;
    name: string;
    native_name: string;
}

export default function PatientLoginPage() {
    const router = useRouter();
    const [tokenCode, setTokenCode] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [languageCode, setLanguageCode] = useState('en-US');
    const [languages, setLanguages] = useState<SupportedLanguage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingLangs, setLoadingLangs] = useState(true);

    useEffect(() => {
        fetch('/api/patient-chat/languages')
            .then(res => res.json())
            .then(json => {
                if (json.data) setLanguages(json.data);
            })
            .catch(() => {})
            .finally(() => setLoadingLangs(false));
    }, []);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/patient-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token_code: tokenCode.toUpperCase().trim(),
                    date_of_birth: dateOfBirth,
                    language_code: languageCode,
                }),
            });

            let json;
            const text = await res.text();
            try {
                json = JSON.parse(text);
            } catch (err) {
                console.error("Server returned non-JSON:", text);
                setError(`Server error: ${res.status}. Please check the server console.`);
                return;
            }

            if (!res.ok || json.error) {
                setError(json.error || 'Login failed');
                return;
            }

            // Store session data in sessionStorage
            sessionStorage.setItem('patient_session', JSON.stringify(json.data));
            router.push('/patient/chat');
        } catch (err: any) {
            console.error("Network Error:", err);
            setError(`Network error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }

    // Get translated UI labels
    const labels = getLabels(languageCode);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                {/* Logo / Branding */}
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse" />
                            <div className="relative flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-2xl">
                                <Activity className="h-7 w-7 text-red-400" />
                                <div className="text-left">
                                    <p className="font-bold text-lg leading-tight tracking-wide">ATLAS</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">Hospital Portal</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{labels.title}</h1>
                        <p className="text-sm text-slate-400 mt-1">{labels.subtitle}</p>
                    </div>
                </div>

                {/* Login Form */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Language Selector — prominently placed at top */}
                    <div className="bg-white/5 border-b border-white/10 p-4">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-2 uppercase tracking-wider">
                            <Globe className="h-3.5 w-3.5" />
                            {labels.selectLanguage}
                        </label>
                        {loadingLangs ? (
                            <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
                        ) : (
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                {languages.map(lang => (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        onClick={() => setLanguageCode(lang.code)}
                                        className={`
                                            text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                                            ${languageCode === lang.code
                                                ? 'bg-indigo-500/30 border border-indigo-400/50 text-white shadow-lg shadow-indigo-500/10'
                                                : 'bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20'
                                            }
                                        `}
                                    >
                                        <span className="font-medium">{lang.native_name}</span>
                                        {lang.native_name !== lang.name && (
                                            <span className="block text-[11px] text-slate-400 mt-0.5">{lang.name}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleLogin} className="p-6 space-y-5">
                        {error && (
                            <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Token Code */}
                        <div className="space-y-2">
                            <label htmlFor="token_code" className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                <KeyRound className="h-3.5 w-3.5" />
                                {labels.tokenCode}
                            </label>
                            <input
                                id="token_code"
                                type="text"
                                placeholder="ATLAS-XXXXXX"
                                value={tokenCode}
                                onChange={e => setTokenCode(e.target.value.toUpperCase())}
                                required
                                autoComplete="off"
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-lg font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 tracking-widest text-center transition-all"
                            />
                        </div>

                        {/* Date of Birth */}
                        <div className="space-y-2">
                            <label htmlFor="dob" className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                <Calendar className="h-3.5 w-3.5" />
                                {labels.dateOfBirth}
                            </label>
                            <input
                                id="dob"
                                type="date"
                                value={dateOfBirth}
                                onChange={e => setDateOfBirth(e.target.value)}
                                required
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !tokenCode || !dateOfBirth}
                            className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    {labels.loginButton}
                                    <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-xs text-center text-slate-500">
                    {labels.helpText}
                </p>
            </div>
        </div>
    );
}

// Minimal i18n for the login page UI labels
function getLabels(lang: string) {
    const labels: Record<string, Record<string, string>> = {
        'en-US': {
            title: 'Patient Check-In',
            subtitle: 'Enter details provided by the nurse to begin',
            selectLanguage: 'Choose your language',
            tokenCode: 'Your Access Code',
            dateOfBirth: 'Date of Birth',
            loginButton: 'Start Check-In',
            helpText: 'Need help? Ask your nurse for assistance.',
        },
        'hi-IN': {
            title: 'रोगी चेक-इन',
            subtitle: 'शुरू करने के लिए नर्स द्वारा दिए गए विवरण दर्ज करें',
            selectLanguage: 'अपनी भाषा चुनें',
            tokenCode: 'आपका एक्सेस कोड',
            dateOfBirth: 'जन्म तिथि',
            loginButton: 'चेक-इन शुरू करें',
            helpText: 'मदद चाहिए? अपनी नर्स से पूछें।',
        },
        'bn-IN': {
            title: 'রোগী চেক-ইন',
            subtitle: 'শুরু করতে নার্সের দেওয়া তথ্য লিখুন',
            selectLanguage: 'আপনার ভাষা নির্বাচন করুন',
            tokenCode: 'আপনার এক্সেস কোড',
            dateOfBirth: 'জন্ম তারিখ',
            loginButton: 'চেক-ইন শুরু করুন',
            helpText: 'সাহায্য দরকার? আপনার নার্সকে জিজ্ঞাসা করুন।',
        },
        'ta-IN': {
            title: 'நோயாளி செக்-இன்',
            subtitle: 'தொடங்க செவிலியர் அளித்த விவரங்களை உள்ளிடவும்',
            selectLanguage: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
            tokenCode: 'உங்கள் அணுகல் குறியீடு',
            dateOfBirth: 'பிறந்த தேதி',
            loginButton: 'செக்-இன் தொடங்கு',
            helpText: 'உதவி தேவையா? உங்கள் செவிலியரிடம் கேளுங்கள்.',
        },
        'te-IN': {
            title: 'రోగి చెక్-ఇన్',
            subtitle: 'ప్రారంభించడానికి నర్సు ఇచ్చిన వివరాలను నమోదు చేయండి',
            selectLanguage: 'మీ భాషను ఎంచుకోండి',
            tokenCode: 'మీ యాక్సెస్ కోడ్',
            dateOfBirth: 'పుట్టిన తేదీ',
            loginButton: 'చెక్-ఇన్ ప్రారంభించండి',
            helpText: 'సహాయం కావాలా? మీ నర్సును అడగండి.',
        },
        'mr-IN': {
            title: 'रुग्ण चेक-इन',
            subtitle: 'सुरू करण्यासाठी नर्सने दिलेले तपशील प्रविष्ट करा',
            selectLanguage: 'तुमची भाषा निवडा',
            tokenCode: 'तुमचा अॅक्सेस कोड',
            dateOfBirth: 'जन्मतारीख',
            loginButton: 'चेक-इन सुरू करा',
            helpText: 'मदत हवी आहे? तुमच्या नर्सला विचारा.',
        },
        'gu-IN': {
            title: 'દર્દી ચેક-ઇન',
            subtitle: 'શરૂ કરવા માટે નર્સ દ્વારા આપેલી વિગતો દાખલ કરો',
            selectLanguage: 'તમારી ભાષા પસંદ કરો',
            tokenCode: 'તમારો ઍક્સેસ કોડ',
            dateOfBirth: 'જન્મ તારીખ',
            loginButton: 'ચેક-ઇન શરૂ કરો',
            helpText: 'મદદ જોઈએ છે? તમારી નર્સને પૂછો.',
        },
        'kn-IN': {
            title: 'ರೋಗಿ ಚೆಕ್-ಇನ್',
            subtitle: 'ಪ್ರಾರಂಭಿಸಲು ನರ್ಸ್ ನೀಡಿದ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ',
            selectLanguage: 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
            tokenCode: 'ನಿಮ್ಮ ಪ್ರವೇಶ ಕೋಡ್',
            dateOfBirth: 'ಹುಟ್ಟಿದ ದಿನಾಂಕ',
            loginButton: 'ಚೆಕ್-ಇನ್ ಪ್ರಾರಂಭಿಸಿ',
            helpText: 'ಸಹಾಯ ಬೇಕೇ? ನಿಮ್ಮ ನರ್ಸ್ ಅನ್ನು ಕೇಳಿ.',
        },
        'ml-IN': {
            title: 'രോഗി ചെക്ക്-ഇൻ',
            subtitle: 'ആരംഭിക്കാൻ നഴ്‌സ് നൽകിയ വിശദാംശങ്ങൾ നൽകുക',
            selectLanguage: 'നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക',
            tokenCode: 'നിങ്ങളുടെ ആക്‌സസ് കോഡ്',
            dateOfBirth: 'ജനനത്തീയതി',
            loginButton: 'ചെക്ക്-ഇൻ ആരംഭിക്കുക',
            helpText: 'സഹായം വേണോ? നിങ്ങളുടെ നഴ്‌സിനോട് ചോദിക്കുക.',
        },
        'pa-IN': {
            title: 'ਮਰੀਜ਼ ਚੈੱਕ-ਇਨ',
            subtitle: 'ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਨਰਸ ਦੁਆਰਾ ਦਿੱਤੀ ਜਾਣਕਾਰੀ ਦਰਜ ਕਰੋ',
            selectLanguage: 'ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ',
            tokenCode: 'ਤੁਹਾਡਾ ਐਕਸੈਸ ਕੋਡ',
            dateOfBirth: 'ਜਨਮ ਮਿਤੀ',
            loginButton: 'ਚੈੱਕ-ਇਨ ਸ਼ੁਰੂ ਕਰੋ',
            helpText: 'ਮਦਦ ਚਾਹੀਦੀ ਹੈ? ਆਪਣੀ ਨਰਸ ਤੋਂ ਪੁੱਛੋ।',
        },
        'ur-IN': {
            title: 'مریض چیک-ان',
            subtitle: 'شروع کرنے کے لیے نرس کی دی گئی تفصیلات درج کریں',
            selectLanguage: 'اپنی زبان منتخب کریں',
            tokenCode: 'آپ کا ایکسیس کوڈ',
            dateOfBirth: 'تاریخ پیدائش',
            loginButton: 'چیک-ان شروع کریں',
            helpText: 'مدد چاہیے؟ اپنی نرس سے پوچھیں۔',
        },
    };

    return labels[lang] || labels['en-US'];
}
