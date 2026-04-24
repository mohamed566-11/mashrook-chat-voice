import React from 'react';
import { motion } from 'framer-motion';
import { Home, MessageSquareText, Mic, LogOut, User } from 'lucide-react';

interface MobileLayoutProps {
  user: any;
  currentView: 'landing' | 'chat' | 'voice';
  onNavigate: (view: 'landing' | 'chat' | 'voice') => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  user,
  currentView,
  onNavigate,
  onLogout,
  children
}) => {
  return (
    <div className="flex flex-col h-[100dvh] w-full bg-gray-50 relative overflow-hidden" dir="rtl">
      {/* Mobile Top Header (Glassmorphism) */}
      <header className="absolute top-0 w-full h-16 bg-white/70 backdrop-blur-md z-50 border-b border-gray-200/50 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#3a9d47] to-[#2b7a35] flex items-center justify-center text-white font-bold shadow-md">
            {user?.name?.charAt(0)?.toUpperCase() || <User size={18} />}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">مرحباً بك</p>
            <p className="text-sm font-bold text-gray-800 leading-tight truncate max-w-[120px]">
              {user?.name || 'مستخدم'}
            </p>
          </div>
        </div>
        <img src="/file.png" alt="Mashroo3k" className="h-8 object-contain" />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full h-full pt-16 pb-20 relative overflow-hidden">
        {children}
      </main>

      {/* Floating Bottom Navigation */}
      <nav className="absolute bottom-0 w-full h-20 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 px-6">
        <div className="flex items-center justify-between h-full max-w-sm mx-auto">
          {/* Home */}
          <NavButton 
            active={currentView === 'landing'} 
            icon={<Home size={22} />} 
            label="الرئيسية" 
            onClick={() => onNavigate('landing')} 
          />
          
          {/* Chat */}
          <NavButton 
            active={currentView === 'chat'} 
            icon={<MessageSquareText size={22} />} 
            label="محادثة" 
            onClick={() => onNavigate('chat')} 
          />
          
          {/* Voice Chat (Center Prominent Button) */}
          <div className="relative -top-3">
            <button
              onClick={() => onNavigate('voice')}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 transform active:scale-95 ${
                currentView === 'voice' 
                  ? 'bg-gradient-to-tr from-[#FFD700] to-[#FDB931] text-[#0A1A2F] shadow-[#FFD700]/40' 
                  : 'bg-[#0A1A2F] text-white shadow-[#0A1A2F]/40'
              }`}
            >
              <Mic size={24} className={currentView === 'voice' ? 'animate-pulse' : ''} />
            </button>
          </div>

          {/* Profile / Logout */}
          <NavButton 
            active={false} 
            icon={<LogOut size={22} />} 
            label="خروج" 
            onClick={onLogout}
            isDanger
          />
        </div>
      </nav>
    </div>
  );
};

const NavButton = ({ active, icon, label, onClick, isDanger = false }: any) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 w-16 transition-all duration-300 ${
        active ? 'text-[#3a9d47] scale-110' : isDanger ? 'text-red-400 hover:text-red-500' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <div className={`relative ${active ? 'drop-shadow-md' : ''}`}>
        {icon}
        {active && (
          <motion.div 
            layoutId="nav-indicator"
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#3a9d47]"
          />
        )}
      </div>
      <span className={`text-[10px] font-bold ${active ? 'opacity-100' : 'opacity-70'}`}>
        {label}
      </span>
    </button>
  );
};
