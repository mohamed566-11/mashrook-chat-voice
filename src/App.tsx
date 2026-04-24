import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatBot from './ChatBot';
import { AuthModal } from './components/AuthModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import VoiceChat from './VoiceChat';
import { DashboardLayout } from './components/DashboardLayout';
import { ChevronLeft, ShieldCheck, Globe, Star } from 'lucide-react';

type View = 'landing' | 'chat' | 'voice';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('mashrouak_token'));
  const [user, setUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState<View>('landing');
  const [showAuth, setShowAuth] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (token) validateToken(token);
    else setIsInitializing(false);
  }, [token]);

  const validateToken = async (t: string) => {
    try {
      const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.hostname}:3001`
        : '';
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${t}` }
      });
      if (res.ok) setUser(await res.json());
      else handleLogout();
    } catch (err) {
      console.error('Token validation failed');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLoginSuccess = (newToken: string, userData: any) => {
    localStorage.setItem('mashrouak_token', newToken);
    setToken(newToken);
    setUser(userData);
    setShowAuth(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('mashrouak_token');
    setToken(null);
    setUser(null);
    setCurrentView('landing');
    setActiveConversationId(null);
  };

  // Create a new chat with a fresh conversationId
  const handleNewChat = useCallback(() => {
    const newId = `conv_${user?.id || 'anon'}_${Date.now()}`;
    setActiveConversationId(newId);
    setCurrentView('chat');
  }, [user]);

  // Open an existing conversation from the sidebar
  const handleSelectConversation = useCallback((convId: string) => {
    setActiveConversationId(convId);
    setCurrentView('chat');
  }, []);

  // Called by ChatBot after each message exchange to refresh sidebar
  const handleMessageSent = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 border-4 border-[#3a9d47]/20 border-t-[#3a9d47] rounded-full" />
        <p className="mt-4 text-sm font-bold text-gray-400 uppercase tracking-widest">Mashrouak Consulting</p>
      </div>
    );
  }

  const renderContent = () => {
    if (!token || !user) {
      return (
        <div className="relative min-h-screen w-full flex flex-col items-center overflow-x-hidden overflow-y-auto bg-white pt-20 pb-20" dir="rtl">
          <div className="mesh-bg" />

          <div className="max-w-6xl w-full px-8 py-12 flex flex-col items-center text-center z-10">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }} className="mb-8 relative mt-8">
              <img src="/file.png" alt="Logo" className="h-32 w-auto object-contain z-10 relative drop-shadow-sm transition-transform hover:scale-105 duration-500" />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="max-w-3xl mb-12">
              <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-[-0.05em] leading-[1.05] mb-6">
                مشروعك <span className="text-[#3a9d47] drop-shadow-sm">للاستشارات</span> <br /> الاقتصـادية المتقدمـة
              </h1>
              <p className="text-lg md:text-xl text-gray-500 font-medium leading-relaxed max-w-2xl mx-auto opacity-80 px-4">
                اكتشف قوة الذكاء الاصطناعي في إعداد دراسات الجدوى والاستشارات المالية بلمسة واحدة وباللهجة المصرية.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-col md:flex-row justify-center gap-6 mb-16">
              <button
                onClick={() => setShowAuth(true)}
                className="group relative bg-[#3a9d47] text-white px-16 py-5 rounded-full font-bold text-xl shadow-[0_15px_40px_rgba(58,157,71,0.3)] hover:shadow-[0_20px_50px_rgba(58,157,71,0.4)] transform hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-150" />
                <span>ابدأ رحلتك مجاناً</span>
                <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>
        </div>
      );
    }

    return (
      <DashboardLayout
        user={user}
        token={token}
        onLogout={handleLogout}
        onGoHome={() => setCurrentView('landing')}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        activeConversationId={activeConversationId}
        currentView={currentView}
        refreshKey={refreshKey}
      >
        <AnimatePresence mode="wait">
          {currentView === 'chat' && activeConversationId && (
            <motion.div
              key={`chat-${activeConversationId}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full h-full absolute inset-0"
            >
              <ChatBot
                token={token}
                user={user}
                conversationId={activeConversationId}
                onBack={() => setCurrentView('landing')}
                onMessageSent={handleMessageSent}
              />
            </motion.div>
          )}
          {currentView === 'voice' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full h-full absolute inset-0"
            >
              <VoiceChat onBack={() => setCurrentView('landing')} />
            </motion.div>
          )}
          {currentView === 'landing' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full h-full absolute inset-0"
            >
              <WelcomeScreen user={user} onSelect={(view) => {
                if (view === 'chat') {
                  handleNewChat();
                } else {
                  setCurrentView(view);
                }
              }} onLogout={handleLogout} />
            </motion.div>
          )}
        </AnimatePresence>
      </DashboardLayout>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {renderContent()}
      <AnimatePresence>
        {showAuth && <AuthModal onSuccess={handleLoginSuccess} onClose={() => setShowAuth(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default App;
