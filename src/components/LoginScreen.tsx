import React, { useState } from 'react';
import { Sparkles, MessageSquare, Image, Code2, ShieldCheck, Loader2, Download, Smartphone } from 'lucide-react';
import { authService } from '../services/auth';
import { UserProfile } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  language: 'ar' | 'en';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, language }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAr = language === 'ar';

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await authService.signInWithGoogle();
      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setError(isAr ? 'تعذر تسجيل الدخول، يرجى المحاولة مرة أخرى.' : 'Failed to sign in, please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="login-screen-container"
      className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-6 relative overflow-hidden select-none"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/2 translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header / Brand */}
      <div className="w-full pt-8 flex flex-col items-center text-center z-10">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-purple-600 p-[2px] shadow-xl shadow-emerald-500/20 mb-5 animate-pulse">
          <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-emerald-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-purple-400 bg-clip-text text-transparent">
          FreeGen AI
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-[300px] leading-relaxed">
          {isAr
            ? 'منصتك الذكية المتكاملة للمحادثة وتوليد الصور وتطوير التطبيقات'
            : 'Your all-in-one AI platform for Chat, Image Generation & App Building'}
        </p>
      </div>

      {/* Feature showcase pill list */}
      <div className="w-full max-w-[340px] space-y-3 z-10 my-6">
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="text-right flex-1">
            <h3 className="text-sm font-semibold text-slate-200">
              {isAr ? 'محادثات ذكية فائقة' : 'Smart Gemini Chat'}
            </h3>
            <p className="text-xs text-slate-400">
              {isAr ? 'إجابات فورية وتحليل للملفات والأكواد' : 'Instant responses with PDF & document analysis'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Image className="w-5 h-5" />
          </div>
          <div className="text-right flex-1">
            <h3 className="text-sm font-semibold text-slate-200">
              {isAr ? 'توليد صور إبداعية' : 'Creative Image Gen'}
            </h3>
            <p className="text-xs text-slate-400">
              {isAr ? 'صور سينمائية وثلاثية الأبعاد بدقة عالية' : 'Cinematic, 3D and cartoon styles in 8K'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm backdrop-blur-sm">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
            <Code2 className="w-5 h-5" />
          </div>
          <div className="text-right flex-1">
            <h3 className="text-sm font-semibold text-slate-200">
              {isAr ? 'إنشاء تطبيقات كاملة' : 'Instant App Generation'}
            </h3>
            <p className="text-xs text-slate-400">
              {isAr ? 'بناء تطبيقات ويب تفاعلية ومعاينتها فورياً' : 'Generate complete single-file interactive apps'}
            </p>
          </div>
        </div>
      </div>

      {/* Action / Google Button */}
      <div className="w-full max-w-[340px] pb-8 z-10 flex flex-col items-center">
        {error && (
          <div className="mb-4 text-xs text-red-400 bg-red-950/50 border border-red-800/60 px-3 py-2 rounded-xl text-center w-full">
            {error}
          </div>
        )}

        <button
          id="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full h-14 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-2xl shadow-lg shadow-white/5 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none cursor-pointer border border-slate-200"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          )}
          <span className="text-base font-medium">
            {isAr ? 'تسجيل الدخول بجوجل' : 'Sign in with Google'}
          </span>
        </button>

        {/* Action Buttons on Login Screen: Install App & Download Code */}
        <div className="mt-3 space-y-2 w-full">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-install-modal'))}
            id="login-install-app-btn"
            className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-emerald-500/20 active:scale-98"
          >
            <Smartphone className="w-4 h-4 text-emerald-200" />
            <span>{isAr ? '📲 تثبيت التطبيق على هاتفك (شاشة كاملة)' : '📲 Install App on Phone'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-download-modal'))}
            id="login-download-zip-btn"
            className="w-full py-2 px-4 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-98"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isAr ? 'تنزيل كود المشروع (ZIP)' : 'Download Full Code (ZIP)'}</span>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-slate-500 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>{isAr ? 'حساب آمن ومحمي بالكامل' : 'Secure & encrypted cloud storage'}</span>
        </div>
      </div>
    </div>
  );
};
