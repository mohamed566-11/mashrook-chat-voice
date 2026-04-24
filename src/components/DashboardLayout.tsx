import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Menu, LogOut, Trash2, PanelRightClose, PanelRightOpen, Loader2, Bot, ArrowRight } from 'lucide-react';

const API_BASE = `http://${window.location.hostname}:3001`;

interface HistoryItem {
  conversationId: string;
  title: string;
  messageCount: number;
  updatedAt: string;
  createdAt: string;
}

interface DashboardLayoutProps {
  user: any;
  token: string;
  onLogout: () => void;
  onGoHome: () => void;
  children: React.ReactNode;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
  activeConversationId: string | null;
  currentView: 'landing' | 'chat' | 'voice';
  refreshKey: number;
}

function groupByDate(items: HistoryItem[]): { label: string; items: HistoryItem[] }[] {
  const today: HistoryItem[] = [];
  const yesterday: HistoryItem[] = [];
  const thisWeek: HistoryItem[] = [];
  const older: HistoryItem[] = [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart = todayStart - 7 * 86400000;

  items.forEach(item => {
    const t = new Date(item.updatedAt).getTime();
    if (t >= todayStart) today.push(item);
    else if (t >= yesterdayStart) yesterday.push(item);
    else if (t >= weekStart) thisWeek.push(item);
    else older.push(item);
  });

  const groups: { label: string; items: HistoryItem[] }[] = [];
  if (today.length) groups.push({ label: 'اليوم', items: today });
  if (yesterday.length) groups.push({ label: 'أمس', items: yesterday });
  if (thisWeek.length) groups.push({ label: 'هذا الأسبوع', items: thisWeek });
  if (older.length) groups.push({ label: 'سابقاً', items: older });
  return groups;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  user, token, onLogout, onGoHome, children, onNewChat,
  onSelectConversation, activeConversationId, currentView, refreshKey
}) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/chat/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshKey]);

  useEffect(() => {
    // Auto-open sidebar when entering a chat, close when on landing
    if (currentView === 'chat') setSidebarOpen(true);
    else if (currentView === 'landing') setSidebarOpen(false);
  }, [currentView]);

  const handleDelete = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setDeletingId(convId);
    try {
      await fetch(`${API_BASE}/api/chat/${convId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHistory(prev => prev.filter(h => h.conversationId !== convId));
      if (activeConversationId === convId) onNewChat();
    } catch {} finally {
      setDeletingId(null);
    }
  };

  const groups = groupByDate(history);

  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden" dir="rtl">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden" />
        )}
      </AnimatePresence>

      {/* Sidebar - Only mounted/visible if NOT in landing */}
      <AnimatePresence mode="wait">
        {currentView !== 'landing' && (
          <motion.aside
            key="sidebar"
            initial={{ x: 300, opacity: 0 }}
            animate={{ 
              width: isSidebarOpen ? '320px' : '0px', 
              opacity: isSidebarOpen ? 1 : 0,
              x: 0 
            }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed lg:static inset-y-0 right-0 z-50 flex flex-col bg-[#fcfdfe] border-l border-gray-100 shadow-2xl lg:shadow-none overflow-hidden`}
          >
            <div className="flex flex-col h-full w-[320px] shrink-0">
              <div className="p-6">
                 <button
                  onClick={() => { onNewChat(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between gap-3 bg-white border-2 border-gray-100 text-gray-700 px-5 py-4 rounded-[24px] hover:border-[#3a9d47]/30 hover:bg-gray-50 transition-all font-black text-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#3a9d47]/5 flex items-center justify-center group-hover:bg-[#3a9d47]/10 transition-colors">
                       <Plus className="w-5 h-5 text-[#3a9d47]" />
                    </div>
                    <span>محادثة جديدة</span>
                  </div>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 space-y-8 custom-scrollbar">
                {loadingHistory ? (
                  <div className="flex justify-center py-10 opacity-20">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-20 px-8">
                     <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">لا يوجد تاريخ</p>
                  </div>
                ) : (
                  groups.map(group => (
                    <div key={group.label} className="text-right">
                      <h4 className="text-[10px] font-black text-gray-300 mb-4 px-4 uppercase tracking-[0.2em]">{group.label}</h4>
                      <div className="space-y-1.5 px-2">
                        {group.items.map(chat => {
                          const isActive = activeConversationId === chat.conversationId;
                          return (
                            <button
                              key={chat.conversationId}
                              onClick={() => { onSelectConversation(chat.conversationId); setMobileMenuOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-[13px] transition-all text-right relative group
                                ${isActive ? 'bg-[#3a9d47] text-white shadow-lg shadow-[#3a9d47]/20' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                              <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'opacity-30'}`} />
                              <span className="truncate flex-1">{chat.title}</span>
                              
                              <div className={`transition-opacity shrink-0 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                 <Trash2 
                                   onClick={(e) => handleDelete(e, chat.conversationId)}
                                   className={`w-4 h-4 hover:scale-110 transition-all ${isActive ? 'text-white/50 hover:text-white' : 'text-gray-200 hover:text-red-500'}`} 
                                 />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 mt-auto border-t border-gray-50">
                <div className="bg-gray-50 rounded-3xl p-4 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center font-black text-[#3a9d47]">
                         {user?.fullname?.[0]}
                      </div>
                      <div className="flex flex-col">
                         <span className="text-xs font-black text-gray-900">{user?.fullname}</span>
                         <span className="text-[9px] font-bold text-[#3a9d47] uppercase tracking-tighter">Pro member</span>
                      </div>
                   </div>
                   <button onClick={onLogout} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                      <LogOut className="w-5 h-5" />
                   </button>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        <div className="mesh-bg opacity-20 fixed inset-0 pointer-events-none" />

        {/* Header - Height 20 for more premium feel */}


        <div className="flex-1 overflow-hidden relative z-0">
          {children}
        </div>
      </main>
    </div>
  );
};
