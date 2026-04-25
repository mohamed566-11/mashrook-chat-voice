import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquareText, Mic, Sparkles } from 'lucide-react';

interface MobileLandingProps {
  user: any;
  onNavigate: (view: 'chat' | 'voice') => void;
}

export const MobileLanding: React.FC<MobileLandingProps> = ({ user, onNavigate }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6 relative bg-gradient-to-b from-gray-50 to-white">
      {/* Decorative Background Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-[#3a9d47]/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#FFD700]/10 rounded-full blur-3xl animate-pulse" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center z-10 w-full"
      >
        <div className="mx-auto w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-6 relative">
          <Sparkles className="absolute -top-2 -right-2 text-[#FFD700] w-5 h-5 animate-spin-slow" />
          <img src="/file.png" alt="Logo" className="w-10 object-contain" />
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tight">
          كيف يمكنني مساعدتك <br />
          <span className="text-[#3a9d47]">اليوم؟</span>
        </h1>
        <p className="text-sm text-gray-500 font-medium mb-10 px-4 leading-relaxed">
          اختر الطريقة الأنسب لك للتواصل مع مستشارك الذكي
        </p>

        <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
          {/* Text Chat Card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('chat')}
            className="group relative flex items-center p-3.5 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#3a9d47]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-10 h-10 rounded-full bg-[#3a9d47]/10 flex items-center justify-center text-[#3a9d47] ml-4 shrink-0">
              <MessageSquareText size={20} />
            </div>
            <div className="text-right">
              <h3 className="font-bold text-gray-800 text-sm mb-0.5">محادثة نصية</h3>
              <p className="text-[11px] text-gray-500">اكتب استفساراتك بالتفصيل</p>
            </div>
          </motion.button>

          {/* Voice Chat Card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('voice')}
            className="group relative flex items-center p-3.5 bg-gradient-to-br from-[#0A1A2F] to-[#112a4c] rounded-2xl shadow-lg border border-[#112a4c] overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl -mr-10 -mt-10" />
            <div className="w-10 h-10 rounded-full bg-[#FFD700]/20 flex items-center justify-center text-[#FFD700] ml-4 shrink-0 shadow-[0_0_15px_rgba(255,215,0,0.2)]">
              <Mic size={20} />
            </div>
            <div className="text-right relative z-10">
              <h3 className="font-bold text-white text-sm mb-0.5">محادثة صوتية</h3>
              <p className="text-[11px] text-gray-300">تحدث مباشرة مع مستشارك</p>
            </div>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
