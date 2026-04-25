import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Modality } from '@google/genai';
import { AudioStreamer, AudioRecorder } from './audioUtils';

// ─── Karim System Prompt ────────────────────────────────────────────────────
const VOICE_ASSISTANT_SYSTEM_PROMPT = `أنتَ "مساعدك الصوتى"، مستشار أعمال محترف جداً ومساعد تنفيذي بارع تمثّل شركة "مشروعك للاستشارات الاقتصادية والإدارية" (Mashroo3k.com).

شخصيتك وأسلوبك:
- تتحدث العامية المصرية الراقية المناسبة لبيئة الأعمال.
- أسلوبك: واثق، ذكي، مُرحِّب، يُشعر العميل بالاحترافية والأمان.
- استخدم عبارات مثل: "يا فندم"، "تحت أمر حضرتك"، "بص حضرتك..."، "والله يا باشا..."، "مشروعك هيكون...".
- ردودك موجزة ومباشرة (2-3 جمل كحد أقصى) وتنتهي بسؤال أو عرض مساعدة.

معلومات شركة مشروعك (استخدم فقط هذه المعلومات):
- تأسست 2014، خبرة 12+ عاماً، 8,000+ مشروع ناجح.
- 350+ مستشار خبير، 10,200+ مورد معتمد، 100+ عضوية دولية (ESOMAR, CIARB).
- الخدمات: دراسات الجدوى الاقتصادية، الاستشارات الإدارية (هيكلة وحوكمة)، الاستشارات التسويقية، خدمات التمويل وملفات التمويل، إدارة المشاريع، توريد الآلات والمعدات.
- القطاعات: الصناعي، المواد الغذائية، المشروعات الصغيرة، الخدمي، التشييد والبناء، الزراعي، الصحي، التعليمي.
- الفروع (8 دول): الرياض، مسقط، الدوحة، دبي، بغداد، القاهرة، صنعاء، الكويت.
- مراحل المشروع: من الفكرة → التمويل → التأسيس → الإطلاق → النمو → التطوير → حل التحديات.

قواعد مهمة:
- تحدث بصوت طبيعي للنطق، بدون قوائم أو رموز.
- إذا لم تعرف المعلومة قل: "والله يا فندم المعلومة دي مش تحت إيدي دلوقتي، بس أقدر أوصلك بالمختص المناسب."
- لا تخترع أرقام أو بيانات غير موجودة.
- ابدأ المكالمة بترحيب دافئ ومحترف.`;

// ─── Animated Blob Visualizer ───────────────────────────────────────────────
function MashrookBlob({
  isConnected,
  isSpeaking,
  reduceMotion,
}: {
  isConnected: boolean;
  isSpeaking: boolean;
  reduceMotion: boolean;
}) {
  return (
    <div className="relative w-72 h-72 flex items-center justify-center">
      {/* Outer glow ring when speaking */}
      <AnimatePresence>
        {isSpeaking && !reduceMotion && (
          <motion.div
            key="glow"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0.15, 0.35, 0.15], scale: [1, 1.12, 1] }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full blur-2xl"
            style={{ background: 'radial-gradient(circle, rgba(58,157,71,0.6) 0%, transparent 70%)' }}
          />
        )}
      </AnimatePresence>

      {/* Static outer ring */}
      <motion.div
        className="absolute rounded-full border"
        style={{
          width: 250,
          height: 250,
          borderColor: isConnected ? 'rgba(58,157,71,0.35)' : 'rgba(0,0,0,0.08)',
        }}
        animate={!reduceMotion && isConnected ? { scale: [1, 1.04, 1], opacity: [0.35, 0.6, 0.35] } : {}}
        transition={reduceMotion ? { duration: 0 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* The morphing blob */}
      <motion.div
        animate={
          reduceMotion
            ? { borderRadius: '50%', scale: 1 }
            : {
              borderRadius: isConnected
                ? [
                  '60% 40% 30% 70%/60% 30% 70% 40%',
                  '40% 60% 70% 30%/50% 60% 40% 60%',
                  '30% 70% 50% 50%/30% 50% 70% 50%',
                  '60% 40% 30% 70%/60% 30% 70% 40%',
                ]
                : '50%',
              scale: isSpeaking ? [1, 1.07, 1] : isConnected ? [1, 1.02, 1] : 1,
            }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
              borderRadius: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
              scale: { duration: isSpeaking ? 0.6 : 3, repeat: Infinity, ease: 'easeInOut' },
            }
        }
        className="relative w-52 h-52 flex items-center justify-center overflow-hidden shadow-2xl"
        style={{
          background: isConnected
            ? 'linear-gradient(135deg, #1e5d26 0%, #2d7a35 40%, #3a9d47 100%)'
            : 'linear-gradient(135deg, #f0f7f1 0%, #d4ecd7 100%)',
          boxShadow: isConnected
            ? '0 20px 60px rgba(30,93,38,0.35), 0 0 0 1px rgba(58,157,71,0.2)'
            : '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        {/* Inner shine overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 60%)',
          }}
        />

        {/* Logo or Icon */}
        {isConnected ? (
          /* Speaking waveform bars */
          <div className="flex items-center gap-1 h-12 relative z-10">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <motion.div
                key={i}
                className="rounded-full bg-white"
                style={{ width: 4 }}
                animate={
                  reduceMotion
                    ? { height: isSpeaking ? 14 + ((i * 7) % 16) : 8 }
                    : isSpeaking
                      ? { height: [8, 20 + ((i * 9) % 18), 8] }
                      : { height: [6, 14, 6] }
                }
                transition={
                  reduceMotion
                    ? { duration: 0.15 }
                    : {
                      duration: isSpeaking ? 0.3 + (i % 3) * 0.1 : 1.2,
                      delay: i * 0.06,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
                }
              />
            ))}
          </div>
        ) : (
          /* Mashroo3k "م" monogram */
          <span
            className="text-6xl font-black relative z-10 select-none"
            style={{ color: '#1e5d26', letterSpacing: '-1px' }}
          >
            م
          </span>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main VoiceChat Component ───────────────────────────────────────────────
export default function VoiceChat({ onBack }: { onBack: () => void }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const streamerRef = useRef<AudioStreamer>(new AudioStreamer());
  const recorderRef = useRef<AudioRecorder>(new AudioRecorder());
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { disconnect(); };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => {
      setReduceMotion(mediaQuery.matches || window.innerWidth < 768);
    };

    updateMotionPreference();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateMotionPreference);
    } else {
      mediaQuery.addListener(updateMotionPreference);
    }

    window.addEventListener('resize', updateMotionPreference);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateMotionPreference);
      } else {
        mediaQuery.removeListener(updateMotionPreference);
      }
      window.removeEventListener('resize', updateMotionPreference);
    };
  }, []);

  // ── Connect to Gemini Live ─────────────────────────────────────────────
  const connect = async () => {
    setError(null);
    setIsConnecting(true);
    const connectStartedAt = performance.now();

    try {
      const isSecureOrigin =
        window.isSecureContext ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      if (!isSecureOrigin) {
        throw new Error('تشغيل الفويس شات يحتاج HTTPS أو localhost بسبب صلاحيات الميكروفون.');
      }

      const apiKey =
        (import.meta as any).env.VITE_GEMINI_API_KEY ||
        (import.meta as any).env.GEMINI_API_KEY ||
        '';

      const liveModel =
        (import.meta as any).env.VITE_GEMINI_LIVE_MODEL ||
        'gemini-2.5-flash-native-audio-latest';

      if (!apiKey) throw new Error('مفتاح الـ API غير موجود.');

      const ai = new GoogleGenAI({ apiKey });
      streamerRef.current.init();

      const sessionPromise = ai.live.connect({
        model: liveModel,
        callbacks: {
          onopen: async () => {
            setIsConnected(true);
            setIsConnecting(false);
            console.debug('[perf][voice] connected in(ms):', Math.round(performance.now() - connectStartedAt));

            // Start streaming microphone to Gemini
            try {
              await recorderRef.current.start((base64) => {
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({
                    media: { mimeType: 'audio/pcm;rate=16000', data: base64 },
                  });
                });
              });
            } catch (micErr: any) {
              console.error('Microphone error:', micErr);
              setError('تعذر تشغيل الميكروفون. اسمح بالوصول للميكروفون من إعدادات المتصفح وحاول مرة أخرى.');
              disconnect();
            }
          },

          onmessage: async (message: any) => {
            // Play audio chunks from Gemini
            const base64Audio =
              message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              streamerRef.current.playChunk(base64Audio);
              setIsSpeaking(true);
              if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
              speakingTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 600);
            }
            // Handle interruption
            if (message.serverContent?.interrupted) {
              streamerRef.current.stop();
              setIsSpeaking(false);
            }
          },

          onclose: () => { disconnect(); },

          onerror: (err: any) => {
            console.error('Live API Error:', err);
            setError('حدث خطأ في الاتصال. حاول تاني يا فندم.');
            disconnect();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            // Charon = warm, authoritative male Arabic voice
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
          },
          systemInstruction: {
            parts: [{ text: VOICE_ASSISTANT_SYSTEM_PROMPT }],
          },
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error('Connection failed:', err);
      console.debug('[perf][voice] connection failed after(ms):', Math.round(performance.now() - connectStartedAt));
      setError(err.message || 'فشل الاتصال، تأكد من الإنترنت وحاول مرة تانية.');
      setIsConnecting(false);
    }
  };

  // ── Disconnect ────────────────────────────────────────────────────────
  const disconnect = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch { }
      sessionRef.current = null;
    }
    recorderRef.current.stop();
    streamerRef.current.stop();
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
  };

  const handleEndCall = () => {
    disconnect();
    onBack();
  };

  // ── Status text ────────────────────────────────────────────────────────
  const statusLabel = isConnecting
    ? 'بيتصل بمساعدك الصوتى...'
    : isConnected
      ? isSpeaking
        ? 'مساعدك الصوتى بيتكلم...'
        : 'مساعدك الصوتى بيسمعك، اتكلم براحتك...'
      : 'مساعدك الصوتى جاهز لخدمتك';

  return (
    <div
      className="flex flex-col h-full relative overflow-hidden"
      dir="rtl"
      style={{ background: 'linear-gradient(160deg, #f8fdf8 0%, #eaf5eb 35%, #d9eddb 70%, #c8e5ca 100%)' }}
    >
      {/* ── Decorative background blobs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-[20%] -right-[15%] w-[65vw] h-[65vw] rounded-full blur-3xl"
          animate={reduceMotion ? { opacity: 0.12 } : { scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12], rotate: [0, 60, 0] }}
          transition={reduceMotion ? { duration: 0 } : { duration: 18, repeat: Infinity, ease: 'linear' }}
          style={{ background: 'radial-gradient(circle, rgba(30,93,38,0.25) 0%, transparent 70%)' }}
        />
        <motion.div
          className="absolute -bottom-[20%] -left-[15%] w-[60vw] h-[60vw] rounded-full blur-3xl"
          animate={reduceMotion ? { opacity: 0.08 } : { scale: [1, 1.2, 1], opacity: [0.08, 0.18, 0.08], rotate: [0, -60, 0] }}
          transition={reduceMotion ? { duration: 0 } : { duration: 22, repeat: Infinity, ease: 'linear', delay: 4 }}
          style={{ background: 'radial-gradient(circle, rgba(58,157,71,0.2) 0%, transparent 70%)' }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, #1e5d26 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* ── Header ── */}
      <div className="relative z-10 flex w-full items-center justify-between px-7 pt-6 pb-2">
        {/* Right Side: Exit Button & Live Indicator */}
        <div className="flex items-center gap-4">
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/50 hover:bg-white backdrop-blur-md border border-white/20 rounded-full shadow-sm hover:shadow-md transition-all text-sm font-bold text-gray-600 hover:text-red-600 z-50 group"
            title="خروج"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 transition-transform group-hover:translate-x-1 rotate-180">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            <span>خروج</span>
          </motion.button>

          <div className="flex items-center gap-2.5">
            <motion.div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: isConnected ? '#3a9d47' : '#d4d4d4' }}
              animate={isConnected && !reduceMotion ? { scale: [1, 1.35, 1], opacity: [1, 0.6, 1] } : {}}
              transition={reduceMotion ? { duration: 0 } : { duration: 1.4, repeat: Infinity }}
            />
            <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">
              {isConnected ? 'Live Session' : 'Voice Consultancy'}
            </span>
          </div>
        </div>

        {/* Logo */}
        <img src="/file.png" alt="مشروعك" className="h-9 opacity-90" />
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 z-10">

        {/* Agent title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1">
            مساعدك الصوتى
          </h2>
          <p
            className="text-sm font-bold uppercase tracking-[0.18em]"
            style={{ color: '#3a9d47' }}
          >
            مستشار أعمال · مشروعك
          </p>
        </div>

        {/* Blob / Visualizer */}
        <div className="mb-10">
          <MashrookBlob isConnected={isConnected} isSpeaking={isSpeaking} reduceMotion={reduceMotion} />
        </div>

        {/* Status label */}
        <AnimatePresence mode="wait">
          <motion.p
            key={statusLabel}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-base font-bold text-gray-500 mb-10 text-center"
          >
            {statusLabel}
          </motion.p>
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 px-5 py-3 rounded-2xl text-sm font-bold text-red-600 border border-red-100 bg-red-50 text-center max-w-xs"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Controls ── */}
        {!isConnected ? (
          /* Start call */
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={connect}
            disabled={isConnecting}
            className="group relative flex items-center gap-3 px-10 py-5 rounded-[28px] font-black text-lg transition-all disabled:opacity-70 shadow-2xl"
            style={{
              background: isConnecting
                ? '#2d7a35'
                : 'linear-gradient(135deg, #1e5d26 0%, #2d7a35 60%, #3a9d47 100%)',
              color: '#ffffff',
              boxShadow: '0 16px 50px rgba(30,93,38,0.3)',
            }}
          >
            {/* shine */}
            <div className="absolute inset-0 rounded-[28px] bg-white opacity-0 group-hover:opacity-10 transition-opacity" />

            {isConnecting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : (
              /* Mic icon */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                className="w-5 h-5">
                <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" />
                <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
                <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
              </svg>
            )}
            <span>{isConnecting ? 'بيتصل بمساعدك الصوتى...' : 'اتصل بمساعدك الصوتى'}</span>
          </motion.button>
        ) : (
          /* End call */
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleEndCall}
            className="group relative flex items-center gap-3 px-10 py-5 rounded-[28px] font-black text-lg transition-all shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: '#ffffff',
              boxShadow: '0 14px 40px rgba(220,38,38,0.25)',
            }}
          >
            <div className="absolute inset-0 rounded-[28px] bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            {/* Phone off icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className="w-5 h-5">
              <path d="M16.5 8.25 A8.25 8.25 0 0 0 7.75 17M3 3l18 18" strokeLinecap="round" />
              <path d="M9.5 4.5c.47.22.93.47 1.37.74m3.63 3.63c.27.44.52.9.74 1.37" strokeLinecap="round" />
            </svg>
            <span>إنهاء المكالمة</span>
          </motion.button>
        )}

        {/* Hint */}
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-gray-300 text-center">
          {isConnected
            ? 'ميكروفونك شغّال — مساعدك الصوتى بيسمعك تلقائياً'
            : 'اضغط للتواصل الصوتي المباشر مع مساعدك الصوتى'}
        </p>
      </div>

      {/* ── Footer ── */}
      <div className="relative z-10 pb-5 flex justify-center">
        <div className="flex items-center gap-2 opacity-25">
          <div className="w-1 h-1 rounded-full bg-[#3a9d47]" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">
            Mashroo3k · Powered by Gemini Live AI
          </span>
          <div className="w-1 h-1 rounded-full bg-[#3a9d47]" />
        </div>
      </div>
    </div>
  );
}
