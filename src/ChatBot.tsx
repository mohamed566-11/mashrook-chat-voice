import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Bot, Sparkles, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isError?: boolean;
}

const API_BASE = `http://${window.location.hostname}:3001`;

interface ChatBotProps {
  token: string;
  user: any;
  conversationId: string;
  onBack?: () => void;
  onMessageSent?: () => void;
}

// Smart quick replies based on conversation stage
const INITIAL_QUICK_REPLIES = [
  { text: 'ما هي خدمات مشروعك؟', icon: '🏢' },
  { text: 'أريد دراسة جدوى لمشروعي', icon: '📊' },
  { text: 'كيف أحجز استشارة؟', icon: '📅' },
  { text: 'ما هي فروع الشركة؟', icon: '🌍' },
  { text: 'طرق التمويل المتاحة', icon: '💰' },
  { text: 'قطاعات دراسات الجدوى', icon: '🔍' },
];

// Contextual follow-up suggestions based on last bot response keywords
const getContextualSuggestions = (lastBotText: string): { text: string; icon: string }[] => {
  const text = lastBotText.toLowerCase();
  
  if (text.includes('جدوى') || text.includes('دراسة')) {
    return [
      { text: 'ما هي تكلفة دراسة الجدوى؟', icon: '💰' },
      { text: 'كم تستغرق الدراسة؟', icon: '⏱️' },
      { text: 'أريد معرفة قطاعات دراسات الجدوى', icon: '📋' },
    ];
  }
  if (text.includes('تمويل') || text.includes('بنك')) {
    return [
      { text: 'ما هي شروط التمويل؟', icon: '📄' },
      { text: 'كيف أجهز ملف التمويل؟', icon: '📁' },
      { text: 'جهات التمويل الشريكة', icon: '🤝' },
    ];
  }
  if (text.includes('تواصل') || text.includes('تليفون') || text.includes('موقع')) {
    return [
      { text: 'احجز استشارة الآن', icon: '📅' },
      { text: 'ما هي طرق الدفع؟', icon: '💳' },
      { text: 'فروع الشركة', icon: '🌍' },
    ];
  }
  if (text.includes('خدم') || text.includes('استشار')) {
    return [
      { text: 'خدمات التسويق والسوق', icon: '📈' },
      { text: 'خدمات إدارة المشاريع', icon: '🎯' },
      { text: 'خدمات توريد المعدات', icon: '⚙️' },
    ];
  }
  return [];
};

export default function ChatBot({ token, user, conversationId, onBack, onMessageSent }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [streamingBotId, setStreamingBotId] = useState<string | null>(null);
  const [contextualSuggestions, setContextualSuggestions] = useState<{ text: string; icon: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamQueueRef = useRef('');
  const displayedStreamTextRef = useRef('');
  const streamDoneRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  const stopStreamAnimator = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const updateBotMessageText = useCallback((botMessageId: string, text: string) => {
    setMessages(prev => prev.map((m) => m.id === botMessageId ? { ...m, text } : m));
  }, []);

  const startStreamAnimator = useCallback((botMessageId: string) => {
    stopStreamAnimator();

    let lastRenderAt = 0;
    const minFrameGap = 28; // ~35fps

    const tick = (now: number) => {
      if (now - lastRenderAt >= minFrameGap && streamQueueRef.current.length > 0) {
        const queueLength = streamQueueRef.current.length;
        // Adaptive speed: faster when buffer is large
        const charsPerTick = queueLength > 200 ? 14 : queueLength > 80 ? 8 : queueLength > 30 ? 5 : 3;
        const nextPiece = streamQueueRef.current.slice(0, charsPerTick);
        streamQueueRef.current = streamQueueRef.current.slice(charsPerTick);
        displayedStreamTextRef.current += nextPiece;
        updateBotMessageText(botMessageId, displayedStreamTextRef.current);
        lastRenderAt = now;
      }

      if (streamQueueRef.current.length > 0 || !streamDoneRef.current) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      animationFrameRef.current = null;
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [updateBotMessageText]);

  useEffect(() => {
    loadConversation();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

  useEffect(() => {
    return () => { stopStreamAnimator(); };
  }, []);

  // Update contextual suggestions after bot responds
  useEffect(() => {
    const lastBotMsg = [...messages].reverse().find(m => m.sender === 'bot' && !m.isError);
    if (lastBotMsg && lastBotMsg.id !== 'welcome' && messages.length > 2) {
      const suggestions = getContextualSuggestions(lastBotMsg.text);
      setContextualSuggestions(suggestions);
    }
  }, [messages]);

  const loadConversation = async () => {
    const welcomeMsg: Message = {
      id: 'welcome',
      text: `أهلاً وسهلاً يا **${user.fullname}** 👋\n\nأنا **مودي**، مساعدك الذكي من شركة **مشروعك للاستشارات**.\n\nكيف يمكنني مساعدتك اليوم؟ 😊`,
      sender: 'bot',
      timestamp: new Date(),
    };

    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const loaded: Message[] = data.messages.map((m: any, idx: number) => ({
            id: `${m.role}_${idx}_${Date.now()}`,
            text: m.text,
            sender: m.role === 'user' ? 'user' : 'bot',
            timestamp: new Date(m.createdAt || Date.now()),
          }));
          setMessages(loaded);
          setIsLoadingHistory(false);
          return;
        }
      }
    } catch { }

    setMessages([welcomeMsg]);
    setIsLoadingHistory(false);
  };

  const sendMessage = async (directText?: string | React.MouseEvent) => {
    const textToSend = typeof directText === 'string' ? directText : input;
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setContextualSuggestions([]);

    const botMessageId = `bot_${Date.now()}`;
    streamQueueRef.current = '';
    displayedStreamTextRef.current = '';
    streamDoneRef.current = false;
    setStreamingBotId(botMessageId);
    setMessages(prev => [
      ...prev,
      { id: botMessageId, text: '', sender: 'bot', timestamp: new Date() },
    ]);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: trimmed, conversationId, stream: true }),
      });

      if (!res.ok) throw new Error('Server error');
      if (!res.body) {
        const data = await res.json();
        updateBotMessageText(botMessageId, data.message);
        onMessageSent?.();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      startStreamAnimator(botMessageId);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        streamQueueRef.current += chunk;
      }

      const trailing = decoder.decode();
      if (trailing) streamQueueRef.current += trailing;
      streamDoneRef.current = true;

      await new Promise<void>((resolve) => {
        const waitDrain = () => {
          if (animationFrameRef.current === null && streamQueueRef.current.length === 0) {
            resolve();
            return;
          }
          requestAnimationFrame(waitDrain);
        };
        waitDrain();
      });

      if (!displayedStreamTextRef.current.trim()) throw new Error('Empty streamed response');
      onMessageSent?.();
    } catch {
      stopStreamAnimator();
      streamQueueRef.current = '';
      streamDoneRef.current = true;
      setMessages(prev => prev.map((m) => (
        m.id === botMessageId
          ? {
            ...m,
            text: '⚠️ عذراً، حدث خطأ في الاتصال. تأكد أن الخادم يعمل وحاول مرة أخرى.',
            isError: true,
            timestamp: new Date(),
          }
          : m
      )));
    } finally {
      stopStreamAnimator();
      streamQueueRef.current = '';
      streamDoneRef.current = true;
      setStreamingBotId(null);
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
    if (lastUserMsg) {
      setMessages(prev => prev.filter(m => !m.isError));
      sendMessage(lastUserMsg.text);
    }
  };

  const showInitialReplies = messages.length <= 1 && !isLoadingHistory;
  const showContextualSuggestions = !isLoading && !isLoadingHistory && contextualSuggestions.length > 0 && messages.length > 2;
  const hasError = messages.some(m => m.isError);

  return (
    <div className="flex flex-col h-full relative" style={{ background: 'linear-gradient(160deg, #f0f9f1 0%, #f5f7fa 50%, #eef2ff 100%)' }}>
      {/* Header */}
      {onBack && (
        <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 p-4 shrink-0 flex items-center justify-between z-10 sticky top-0 shadow-sm" dir="rtl">
          <div className="flex items-center gap-3">
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-red-50 border border-gray-100 rounded-full shadow-sm hover:shadow hover:border-red-100 transition-all text-sm font-bold text-gray-500 hover:text-red-500 group"
              title="خروج"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 transition-transform group-hover:translate-x-0.5 rotate-180">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span>خروج</span>
            </motion.button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-bold text-sm text-gray-800 leading-tight">مودي — مساعد مشروعك الذكي</p>
              <p className="text-[10px] text-[#3a9d47] font-semibold flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 bg-[#3a9d47] rounded-full animate-pulse inline-block" />
                متاح الآن
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a9d47] to-[#2d7e38] flex items-center justify-center shadow-md shadow-[#3a9d47]/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-hide" dir="rtl">
        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <div className="w-12 h-12 rounded-2xl bg-[#3a9d47]/10 flex items-center justify-center mb-4">
              <Loader2 className="w-6 h-6 animate-spin text-[#3a9d47]" />
            </div>
            <p className="text-sm text-gray-400 font-bold">جاري تحميل المحادثة...</p>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  {/* Bot avatar */}
                  {msg.sender === 'bot' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3a9d47] to-[#2d7e38] flex items-center justify-center ml-2 mt-1 shrink-0 shadow-sm">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] px-5 py-3.5 rounded-2xl text-[14.5px] leading-relaxed transition-all duration-300 ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-br from-[#3a9d47] to-[#2d8c3e] text-white rounded-tl-sm shadow-md shadow-[#3a9d47]/20 select-text'
                        : msg.isError
                          ? 'bg-red-50 text-red-700 rounded-tr-sm border border-red-100 select-text'
                          : 'bg-white text-[#1e2d3d] rounded-tr-sm border border-gray-100/80 shadow-sm hover:shadow select-text'
                    }`}
                  >
                    <div className="prose prose-sm max-w-none text-inherit [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mt-1 [&_li]:my-0.5 [&_strong]:font-bold">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                      {msg.id === streamingBotId && (
                        <span className="inline-block w-2 h-[1.1em] mr-0.5 align-middle bg-[#3a9d47] opacity-70 animate-pulse rounded-sm" />
                      )}
                    </div>
                    <div className={`text-[10px] mt-2 font-medium opacity-40 ${msg.sender === 'user' ? 'text-white' : 'text-gray-500'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isLoading && !streamingBotId && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3a9d47] to-[#2d7e38] flex items-center justify-center ml-2 shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white text-[#3a9d47] px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-sm border border-gray-100 flex items-center gap-2.5">
                  <span className="text-xs text-gray-400 font-semibold">مودي يفكر</span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#3a9d47] rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-[#3a9d47] rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-[#3a9d47] rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Retry button on error */}
            {hasError && !isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#3a9d47] transition-colors py-2 px-4 rounded-full hover:bg-[#3a9d47]/5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  إعادة المحاولة
                </button>
              </motion.div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies & Input Area */}
      <div className="p-4 bg-white/95 backdrop-blur border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]" dir="rtl">
        
        {/* Initial Quick Replies */}
        <AnimatePresence>
          {showInitialReplies && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3"
            >
              <p className="text-[11px] text-gray-400 font-bold mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#3a9d47]" />
                اسألني عن:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {INITIAL_QUICK_REPLIES.map((q) => (
                  <button
                    key={q.text}
                    onClick={() => sendMessage(q.text)}
                    className="text-xs font-semibold px-3 py-1.5 bg-[#3a9d47]/5 border border-[#3a9d47]/10 text-[#2d7e38] rounded-xl hover:bg-[#3a9d47] hover:text-white hover:shadow-md hover:shadow-[#3a9d47]/20 hover:border-transparent transition-all duration-200 flex items-center gap-1"
                  >
                    <span>{q.icon}</span>
                    <span>{q.text}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contextual Follow-up Suggestions */}
        <AnimatePresence>
          {showContextualSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="mb-3"
            >
              <p className="text-[11px] text-gray-400 font-bold mb-2 flex items-center gap-1.5">
                <span className="text-[#3a9d47]">💡</span>
                قد يهمك أيضاً:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {contextualSuggestions.map((q) => (
                  <button
                    key={q.text}
                    onClick={() => sendMessage(q.text)}
                    className="text-xs font-semibold px-3 py-1.5 bg-indigo-50/70 border border-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-600 hover:text-white hover:shadow-md hover:border-transparent transition-all duration-200 flex items-center gap-1"
                  >
                    <span>{q.icon}</span>
                    <span>{q.text}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Row */}
        <div className="relative flex items-center gap-2.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="اكتب سؤالك هنا..."
            className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[14.5px] text-[#1e2d3d] placeholder-gray-400 outline-none focus:ring-3 focus:ring-[#3a9d47]/15 focus:border-[#3a9d47]/40 transition-all shadow-inner"
            disabled={isLoading || isLoadingHistory}
          />
          <motion.button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim() || isLoadingHistory}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            className="w-12 h-12 bg-gradient-to-tr from-[#3a9d47] to-[#4caf50] text-white rounded-2xl flex items-center justify-center hover:shadow-lg hover:shadow-[#3a9d47]/30 transition-all disabled:opacity-40 disabled:grayscale disabled:scale-100 disabled:shadow-none shrink-0"
          >
            {isLoading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <Send className="w-5 h-5 rotate-180" />
            }
          </motion.button>
        </div>

        <p className="text-center text-[10px] text-gray-300 mt-2 font-medium">
          مودي AI · مشروعك للاستشارات · mashroo3k.com
        </p>
      </div>
    </div>
  );
}
