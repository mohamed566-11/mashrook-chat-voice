import React from 'react';
import { MessageSquare, Mic, ShieldCheck, PieChart, Info, LogOut, ArrowLeft, Star, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

interface WelcomeScreenProps {
   user: any;
   onSelect: (view: 'chat' | 'voice') => void;
   onLogout: () => void;
}

// Animation Variants for staggered entrance
const containerVariants = {
   hidden: { opacity: 0 },
   show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
   }
};

const itemVariants: any = {
   hidden: { opacity: 0, y: 30 },
   show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ user, onSelect, onLogout }) => {
   return (
      <motion.div
         initial="hidden"
         animate="show"
         exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
         variants={containerVariants}
         className="relative h-full w-full flex flex-col items-center justify-center p-4 lg:p-8 overflow-y-auto"
      >

         <div className="max-w-4xl w-full text-center z-10 pt-8 pb-12">
            <motion.div variants={itemVariants} className="mb-16">
               <div className="flex justify-center mb-6">
                  <div className="glass-pill px-5 py-2 rounded-full text-[#3a9d47] text-[10px] font-black uppercase tracking-[0.2em] shadow-sm flex items-center gap-2">
                     <ShieldCheck className="w-3.5 h-3.5" /> SECURE CONSULTANCY GATEWAY
                  </div>
               </div>
               <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-[1.2] mb-6 tracking-tight">
                  جاهزون لتطـوير <br /> <span className="text-[#3a9d47]">مشـروعك</span> القادم؟
               </h1>
               <p className="text-gray-500 font-bold text-lg max-w-xl mx-auto opacity-80 leading-relaxed px-4">
                  نضع بين يديك أكثر من ١٢ عاماً من الخبرة في دراسات الجدوى والاستشارات، معززة بأحدث تقنيات المحادثة.
               </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-4">
               {/* Text Chat */}
               <motion.div
                  variants={itemVariants}
                  whileHover={{ y: -10, scale: 1.02 }}
                  onClick={() => onSelect('chat')}
                  className="group cursor-pointer relative bg-white/80 backdrop-blur-xl p-12 rounded-[45px] shadow-[0_20px_60px_rgba(31,38,135,0.06)] border border-white hover:border-[#3a9d47]/30 transition-all text-right overflow-hidden flex flex-col justify-between h-[420px]"
               >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#3a9d47]/5 rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-150" />

                  <div className="w-20 h-20 bg-[#3a9d47] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#3a9d47]/30 group-hover:rotate-6 transition-transform duration-500">
                     <MessageSquare className="w-10 h-10 text-white" />
                  </div>

                  <div className="space-y-4">
                     <h3 className="text-3xl font-black text-gray-900 leading-tight">المحادثه النصيه <br /> <span className="text-gray-300 group-hover:text-[#3a9d47]/40 transition-colors duration-500">عبر البوت</span></h3>
                     <p className="text-gray-400 font-bold text-sm tracking-tight leading-relaxed">استفسارات دقيقة، تقارير منظمة، ومتابعة فورية لكل أرقام مشروعك عبر الدردشة الذكية.</p>
                  </div>

                  <div className="w-full py-4 px-6 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between text-[#3a9d47] font-black group-hover:bg-[#3a9d47] group-hover:text-white transition-all duration-500">
                     <span>ابدأ الآن</span>
                     <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  </div>
               </motion.div>

               {/* Voice Chat */}
               <motion.div
                  variants={itemVariants}
                  whileHover={{ y: -10, scale: 1.02 }}
                  onClick={() => onSelect('voice')}
                  className="group cursor-pointer relative bg-gradient-to-br from-[#1e5d26] to-[#3a9d47] p-12 rounded-[45px] shadow-[0_30px_70px_rgba(58,157,71,0.3)] transition-all text-right overflow-hidden flex flex-col justify-between h-[420px]"
               >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-[60px]" />

                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl group-hover:-rotate-6 transition-transform duration-500">
                     <Mic className="w-10 h-10 text-[#3a9d47]" />
                  </div>

                  <div className="space-y-4 text-white">
                     <h3 className="text-3xl font-black leading-tight">المحادثة الصوتية <br /> <span className="text-white/30 group-hover:text-white/60 transition-colors duration-500">تفاعل حي</span></h3>
                     <p className="text-white/60 font-bold text-sm tracking-tight leading-relaxed">تحدث مباشرة مع مساعدك الرقمي، تجربة تفاعلية مريحة لاستكشاف الأفكار الاستثمارية الكبرى.</p>
                  </div>

                  <div className="w-full py-4 px-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-between text-white font-black group-hover:bg-white group-hover:text-[#3a9d47] transition-all duration-500">
                     <span>تحدث الآن</span>
                     <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  </div>
               </motion.div>
            </div>

            {/* Footer info */}
            <motion.div variants={itemVariants} className="mt-20 flex justify-center gap-12 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity duration-500">
               <div className="flex items-center gap-2">
                  <PieChart className="w-3.5 h-3.5" /> Market Insights 2024
               </div>
               <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5" /> Premium Support
               </div>
               <div className="flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 fill-[#3a9d47] text-[#3a9d47]" /> Made for Growth
               </div>
            </motion.div>
         </div>
      </motion.div>
   );
};
