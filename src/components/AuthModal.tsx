import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  onSuccess: (token: string, user: any) => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ fullname: '', email: '', password: '' });

  const API_URL = `http://${window.location.hostname}:3001/api/auth`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/login' : '/register';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ ما');

      onSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="bg-white rounded-[40px] shadow-[0_30px_80px_rgba(0,0,0,0.2)] w-full max-w-xl overflow-hidden relative border border-white/20"
      >
        <motion.button 
          whileHover={{ scale: 1.1, x: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute top-6 left-6 p-2.5 rounded-full bg-gray-50 hover:bg-gray-100 transition-all z-20 flex items-center justify-center shadow-sm border border-gray-100 text-gray-500 hover:text-gray-900 focus:outline-none"
          title="رجوع"
        >
          <ArrowRight className="w-5 h-5" />
        </motion.button>

        <div className="flex flex-col md:flex-row h-full">
           {/* Visual Side */}
           <div className="md:w-[45%] bg-gradient-to-br from-[#1e5d26] to-[#3a9d47] p-10 text-white flex flex-col justify-between relative overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
               <div className="z-10">
                  <img src="/file.png" alt="Logo" className="h-14 bg-white p-2 rounded-2xl shadow-xl brightness-100" />
               </div>
               <div className="z-10 mt-20">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isLogin ? 'login-text' : 'register-text'}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="min-h-[100px]"
                    >
                      <h2 className="text-3xl font-black mb-3 leading-tight tracking-tight">{isLogin ? 'أهلاً بك مجدداً' : 'انضم إلينا'}</h2>
                      <p className="text-white/80 text-sm font-medium leading-relaxed">
                        {isLogin 
                          ? 'استكمل رحلتك الاستثمارية وابدأ محادثة جديدة مع مستشارك الذكي.'
                          : 'ابدأ رحلتك الاستثمارية مع مستشارينا المعتمدين وجيمناي فلاش.'}
                      </p>
                    </motion.div>
                  </AnimatePresence>
               </div>
               <div className="z-10 flex items-center gap-2 mt-8 text-[10px] font-bold opacity-50 tracking-[0.1em] uppercase">
                  <ShieldCheck className="w-4 h-4" /> Secure Auth Layer
               </div>
           </div>

           {/* Form Side */}
           <div className="md:w-[55%] p-10 bg-white">
              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence>
                  {!isLogin && (
                    <motion.div 
                      key="fullname"
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[11px] font-black text-gray-400 uppercase mr-1 tracking-widest">الاسم الكامل</label>
                        <div className="relative group">
                          <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-[#3a9d47] transition-colors" />
                          <input
                            required
                            type="text"
                            placeholder="رائد أعمال طموح"
                            className="w-full pr-12 pl-4 py-4 bg-gray-50 border-2 border-gray-50 rounded-[20px] focus:bg-white focus:border-[#3a9d47]/20 outline-none text-right transition-all font-bold placeholder-gray-400"
                            value={form.fullname}
                            onChange={e => setForm({ ...form, fullname: e.target.value })}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase mr-1 tracking-widest">البريد الإلكتروني</label>
                  <div className="relative group">
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-[#3a9d47] transition-colors" />
                    <input
                      required
                      type="email"
                      placeholder="business@example.com"
                      className="w-full pr-12 pl-4 py-4 bg-gray-50 border-2 border-gray-50 rounded-[20px] focus:bg-white focus:border-[#3a9d47]/20 outline-none text-right transition-all font-bold placeholder-gray-400 text-left dir-ltr"
                      style={{ textAlign: 'left', direction: 'ltr' }}
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase mr-1 tracking-widest">كلمة المرور</label>
                  <div className="relative group">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-[#3a9d47] transition-colors" />
                    <input
                      required
                      type="password"
                      placeholder="••••••••"
                      className="w-full pr-12 pl-4 py-4 bg-gray-50 border-2 border-gray-50 rounded-[20px] focus:bg-white focus:border-[#3a9d47]/20 outline-none text-right transition-all font-bold placeholder-gray-400 text-left dir-ltr"
                      style={{ textAlign: 'left', direction: 'ltr' }}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-3 bg-red-50 text-red-500 text-[11px] text-center font-black rounded-xl border border-red-100 uppercase tracking-widest">
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  className="w-full bg-[#3a9d47] text-white font-black py-5 rounded-[22px] shadow-2xl shadow-[#3a9d47]/20 hover:bg-[#2d7e38] transition-all flex items-center justify-center gap-3 overflow-hidden relative disabled:opacity-70 mt-2"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                    <div className="flex items-center gap-3">
                      <span>{isLogin ? 'تسجيل الدخول' : 'تفعيل الحساب'}</span>
                      <ArrowLeft className="w-5 h-5 translate-y-0.5" />
                    </div>
                  )}
                </motion.button>

                <p className="text-center text-sm font-bold text-gray-400 mt-8">
                  {isLogin ? 'لا تملك حساباً؟ ' : 'لديك حساب بالفعل؟ '}
                  <button 
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-[#3a9d47] hover:underline hover:text-[#1e5d26]"
                  >
                    {isLogin ? 'سجل اهتمامك' : 'ادخل مجدداً'}
                  </button>
                </p>
              </form>
           </div>
        </div>
      </motion.div>
    </div>
  );
};
