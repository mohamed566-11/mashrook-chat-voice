import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

interface MobileMainLandingProps {
  onStart: () => void;
}

export const MobileMainLanding: React.FC<MobileMainLandingProps> = ({ onStart }) => {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-6 relative bg-gradient-to-b from-gray-50 to-white overflow-hidden" dir="rtl">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#3a9d47]/5 rounded-full blur-3xl -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FFD700]/5 rounded-full blur-3xl -ml-20 -mb-20" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center z-10 w-full max-w-sm"
      >
        <div className="mx-auto w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center mb-8 relative border border-gray-100">
          <img src="/file.png" alt="Logo" className="w-16 object-contain" />
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight leading-snug">
          مشروعك <span className="text-[#3a9d47]">للاستشارات</span> <br /> الاقتصـادية
        </h1>
        <p className="text-sm text-gray-500 font-medium mb-12 px-2 leading-relaxed opacity-90">
          اكتشف قوة الذكاء الاصطناعي في إعداد دراسات الجدوى والاستشارات بلمسة واحدة.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="w-full bg-[#3a9d47] text-white py-4 rounded-2xl shadow-xl shadow-[#3a9d47]/20 flex items-center justify-center gap-2 font-bold text-lg"
        >
          <span>ابدأ رحلتك مجاناً</span>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </div>
  );
};
