import React, { useState } from 'react';
import { Mail, Lock, User, Loader2, ArrowLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileAuthModalProps {
  onSuccess: (token: string, user: any) => void;
  onClose: () => void;
}

export const MobileAuthModal: React.FC<MobileAuthModalProps> = ({ onSuccess, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ fullname: '', email: '', password: '' });

  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://${window.location.hostname}:3001`
    : '';
  const API_URL = `${API_BASE}/api/auth`;

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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className="bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden relative"
      >
        <div className="p-6 pb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 leading-tight">
                {isLogin ? 'أهلاً بك مجدداً' : 'انضم إلينا'}
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                {isLogin ? 'استكمل رحلتك الاستثمارية' : 'ابدأ رحلتك الاستثمارية الآن'}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative group">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-[#3a9d47] transition-colors" />
                    <input
                      required
                      type="text"
                      placeholder="الاسم الكامل"
                      className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-[#3a9d47]/30 outline-none text-right transition-all font-bold text-sm placeholder-gray-400"
                      value={form.fullname}
                      onChange={e => setForm({ ...form, fullname: e.target.value })}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-[#3a9d47] transition-colors" />
              <input
                required
                type="email"
                placeholder="البريد الإلكتروني"
                className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-[#3a9d47]/30 outline-none transition-all font-bold text-sm placeholder-gray-400 text-left dir-ltr"
                style={{ textAlign: 'left', direction: 'ltr' }}
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="relative group">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-[#3a9d47] transition-colors" />
              <input
                required
                type="password"
                placeholder="كلمة المرور"
                className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-[#3a9d47]/30 outline-none transition-all font-bold text-sm placeholder-gray-400 text-left dir-ltr"
                style={{ textAlign: 'left', direction: 'ltr' }}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="p-2.5 bg-red-50 text-red-500 text-[10px] text-center font-bold rounded-lg border border-red-100">
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="w-full bg-[#3a9d47] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#3a9d47]/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{isLogin ? 'دخول' : 'تسجيل'}</span>
                  <ArrowLeft className="w-4 h-4" />
                </div>
              )}
            </motion.button>

            <p className="text-center text-xs font-bold text-gray-400 mt-4">
              {isLogin ? 'مستخدم جديد؟ ' : 'لديك حساب؟ '}
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#3a9d47] hover:underline"
              >
                {isLogin ? 'إنشاء حساب' : 'سجل دخولك'}
              </button>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
