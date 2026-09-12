import React, { useState, useEffect } from 'react';
import {
  User,
  Globe,
  Moon,
  Sun,
  Database,
  Trash2,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  X,
  MessageSquare,
  Image,
  Code2,
  Wifi,
  WifiOff,
  Activity,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Key,
  Share2,
  Sparkles,
  Smartphone,
  Download,
  Star,
  Send,
} from 'lucide-react';
import { AppSettings, UserProfile } from '../types';
import { storageService } from '../services/storage';
import { authService } from '../services/auth';
import { networkManager } from '../services/networkManager';
import { InstallPwaCard } from './InstallPwaCard';

interface SettingsTabProps {
  user: UserProfile;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onLogout: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  user,
  settings,
  onUpdateSettings,
  onLogout,
  onShowToast,
}) => {
  const isAr = settings.language === 'ar';
  const [showClearModal, setShowClearModal] = useState(false);
  const [isOnline, setIsOnline] = useState(networkManager.isOnline());
  const [isSimulated, setIsSimulated] = useState(networkManager.isSimulatingOffline());
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  // Standalone app URL and key states
  const standaloneUrl = 'https://ais-pre-sostmnvtfdk6ddo6exurom-885794902667.europe-west2.run.app';
  const devUrl = 'https://ais-dev-sostmnvtfdk6ddo6exurom-885794902667.europe-west2.run.app';
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState(() => storageService.getCustomApiKey());
  const [savedKeySuccess, setSavedKeySuccess] = useState(false);

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() && feedbackRating === 0) return;
    try {
      const existing = JSON.parse(localStorage.getItem('freegen_user_feedback') || '[]');
      existing.push({
        rating: feedbackRating,
        text: feedbackText,
        date: new Date().toISOString(),
        userEmail: user.email,
      });
      localStorage.setItem('freegen_user_feedback', JSON.stringify(existing));
    } catch {}
    setFeedbackSent(true);
    onShowToast(
      isAr ? 'شكراً لك! تم استلام تقييمك وملاحظاتك بنجاح ❤️' : 'Thank you! Your feedback has been received ❤️',
      'success'
    );
    setTimeout(() => {
      setFeedbackText('');
      setFeedbackSent(false);
    }, 3000);
  };

  useEffect(() => {
    const unsub = networkManager.subscribe((online) => {
      setIsOnline(online);
      setIsSimulated(networkManager.isSimulatingOffline());
    });
    return () => unsub();
  }, []);

  const handleCopyUrl = (urlToCopy: string) => {
    navigator.clipboard.writeText(urlToCopy);
    setCopiedUrl(true);
    onShowToast(
      isAr ? 'تم نسخ الرابط المستقل المباشر!' : 'Direct standalone link copied!',
      'success'
    );
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleSaveCustomKey = () => {
    storageService.setCustomApiKey(customKeyInput);
    setSavedKeySuccess(true);
    onShowToast(
      customKeyInput.trim()
        ? (isAr ? 'تم حفظ وتفعيل مفتاح Gemini المخصص بنجاح!' : 'Custom Gemini key saved and activated!')
        : (isAr ? 'تم إزالة المفتاح المخصص واستعادة المفاتيح التلقائية' : 'Custom key cleared, default rotation active'),
      'success'
    );
    setTimeout(() => setSavedKeySuccess(false), 2500);
  };

  const handleToggleSimulateOffline = () => {
    const sim = networkManager.toggleSimulatedOffline();
    setIsSimulated(sim);
    setIsOnline(!sim);
    if (sim) {
      onShowToast(
        isAr
          ? 'تم تفعيل وضع محاكاة انقطاع الإنترنت - سيتم تعليق وحفظ طلباتك حتى استئنافها'
          : 'Offline simulation activated - Requests will be queued until resumed',
        'info'
      );
    } else {
      onShowToast(
        isAr
          ? 'تم استعادة الاتصال - جاري استئناف كافة المهام المحفوظة تلقائياً!'
          : 'Connection restored - Auto-resuming all saved requests!',
        'success'
      );
    }
  };

  const handleTestPing = async () => {
    setIsPinging(true);
    const start = performance.now();
    const ok = await networkManager.ping();
    const end = performance.now();
    setIsPinging(false);
    if (ok) {
      const ms = Math.round(end - start);
      setPingLatency(ms);
      onShowToast(
        isAr ? `الاتصال بالخادم ممتاز (${ms}ms)` : `Server connection healthy (${ms}ms)`,
        'success'
      );
    } else {
      setPingLatency(null);
      onShowToast(
        isAr ? 'تعذر الوصول إلى الخادم' : 'Server unreachable',
        'error'
      );
    }
  };

  // Read current stats from storage
  const stats = storageService.getUserStats(user.uid);

  const handleClearAllData = () => {
    storageService.clearAllUserData(user.uid);
    setShowClearModal(false);
    onShowToast(isAr ? 'تم مسح كافة البيانات بنجاح' : 'All data cleared successfully', 'success');
  };

  const handleLogoutClick = async () => {
    await authService.signOut();
    onLogout();
    onShowToast(isAr ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully', 'info');
  };

  return (
    <div id="settings-tab-container" className="flex-1 min-h-0 flex flex-col bg-slate-900 overflow-y-auto overscroll-contain touch-pan-y pb-20">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-10 backdrop-blur-sm">
        <h1 className="text-sm font-bold text-slate-100">
          {isAr ? 'إعدادات الحساب والتطبيق' : 'Settings & Profile'}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-download-modal'))}
            className="flex items-center gap-1 text-[11px] font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition cursor-pointer active:scale-95"
            title={isAr ? 'تنزيل كود المشروع الذكي المقاوم للانقطاع (ZIP)' : 'Resilient Download Project ZIP'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isAr ? 'تنزيل الكود الذكي' : 'Download Code'}</span>
          </button>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isAr ? 'نشط' : 'Active'}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* User Profile Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700/80 rounded-2xl p-4 shadow-md flex items-center gap-3.5">
          <div className="relative">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg">
                <User className="w-6 h-6" />
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-100 truncate">{user.displayName}</h2>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
              <span>{isAr ? 'حساب Google متزامن' : 'Google Account Connected'}</span>
            </div>
          </div>
        </div>

        {/* PWA Mobile Installation Card */}
        <InstallPwaCard isAr={isAr} onShowToast={onShowToast} />

        {/* Preferences Section */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            {isAr ? 'التفضيلات والمظهر' : 'Preferences'}
          </h3>

          {/* Language Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'لغة الواجهة' : 'Interface Language'}</span>
            </div>
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => onUpdateSettings({ language: 'ar' })}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  settings.language === 'ar'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                العربية
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ language: 'en' })}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  settings.language === 'en'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-750">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
              {settings.theme === 'dark' ? (
                <Moon className="w-4 h-4 text-purple-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
              <span>{isAr ? 'المظهر (السمة)' : 'Appearance'}</span>
            </div>
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  settings.theme === 'dark'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-3 h-3" />
                <span>{isAr ? 'داكن' : 'Dark'}</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  settings.theme === 'light'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>{isAr ? 'فاتح' : 'Light'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Standalone Application & Direct Link (Decoupled from Agent) */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-800 to-slate-850 border border-emerald-500/30 rounded-2xl p-4 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'رابط التطبيق المستقل (تشغيل دائم خارج المنصة)' : 'Standalone App Links (Direct Web URL)'}</span>
            </h3>
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Cloud Run</span>
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {isAr
              ? 'تطبيقك مستضاف ومبني ومستقل تماماً، ولا تحتاج إطلاقاً لفتحه من داخل بيئة المطورين أو الدردشة. يمكنك نسخه، فتحه في أي جهاز أو متصفح، أو مشاركته مع أي شخص.'
              : 'Your application is fully hosted on Google Cloud Run and completely independent of any agent session. Open it in any mobile or desktop browser directly.'}
          </p>

          {/* Standalone Live URL (Active Now) */}
          <div className="space-y-2 bg-slate-900/90 p-3.5 rounded-xl border border-emerald-500/40">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{isAr ? 'الرابط المباشر الشغال الآن (Direct App URL):' : 'Active Direct URL (Online Now):'}</span>
              </div>
              <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                جاهز وفوري
              </span>
            </div>

            <div className="text-xs font-mono text-emerald-300 bg-black/50 p-2.5 rounded-lg border border-slate-700/80 break-all select-all">
              {devUrl}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCopyUrl(devUrl)}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تم نسخ الرابط المباشر!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isAr ? 'نسخ الرابط المباشر' : 'Copy Direct Link'}</span>
                  </>
                )}
              </button>

              <a
                href={devUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAr ? 'فتح في نافذة كاملة' : 'Open in New Tab'}</span>
              </a>
            </div>
          </div>

          {/* Public Shared URL Explanation */}
          <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-750">
            <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-blue-400" />
              <span>{isAr ? 'رابط النشر والمشاركة العامة (Public Shared Link):' : 'Public Shared URL:'}</span>
            </div>
            <div className="text-xs font-mono text-slate-400 bg-black/40 p-2 rounded-lg border border-slate-800 break-all select-all">
              {standaloneUrl}
            </div>
            <p className="text-[11px] text-amber-300/90 leading-relaxed bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
              💡 {isAr
                ? 'ملاحظة: هذا الرابط العام يصبح متاحاً للعالم بمجرد ضغطك على زر "Share" (مشاركة) بالأعلى في واجهة Google AI Studio. أما الرابط الأخضر بالأعلى فيعمل معك فوراً الآن!'
                : 'Note: This public link is activated when you click the "Share" button at the top of AI Studio. The green link above is already active right now.'}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-750 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-teal-400" />
              <span>{isAr ? 'تثبيت التطبيق على الشاشة الرئيسية:' : 'Add to Mobile Home Screen:'}</span>
            </div>
            <p>
              {isAr
                ? 'افتح الرابط الأخضر المباشر في متصفح هاتفك (Chrome أو Safari)، ثم اختر من القائمة "إضافة إلى الشاشة الرئيسية" (Add to Home Screen) ليعمل كتطبيق كامل ومستقل على شاشة هاتفك.'
                : 'Open the active link in your mobile browser and select "Add to Home Screen" to install it as an app.'}
            </p>
          </div>

          {/* Download Standalone ZIP Button */}
          <div className="pt-2 border-t border-slate-750/80 space-y-2">
            <a
              href="/api/export/project-zip"
              download="freegen-ai-standalone-project.zip"
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>{isAr ? 'تنزيل كود المشروع كاملاً (ملف ZIP جاهز للتشغيل بأي مكان)' : 'Download Full Standalone Project (ZIP)'}</span>
            </a>
            <p className="text-[10px] text-slate-400 text-center">
              {isAr
                ? 'يتضمن ملف Dockerfile ودليل التشغيل render.yaml لتشغيله بنقرة واحدة على أي استضافة خاصة بك.'
                : 'Includes Dockerfile and render.yaml for 1-click self-hosting anywhere.'}
            </p>
          </div>
        </div>

        {/* AI Key & Multi-Key Cascade Management */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'تخطي قيود الاستهلاك ومفتاح Gemini' : 'AI Quota Bypass & Custom Key'}</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {isAr ? 'تناوب تلقائي نشط' : 'Key Rotation Active'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {isAr
              ? 'يحتوي خادم التطبيق تلقائياً على نظام تعاقب ذكي يدور بين مفاتيح ونماذج Gemini (gemini-3.8-flash و gemini-flash-latest و gemini-3.1-flash-lite) لتخطي أي خطأ استهلاك فوري.'
              : 'The backend automatically cascades across multiple API keys and fallback models (gemini-3.8-flash, gemini-flash-latest, gemini-3.1-flash-lite) to bypass rate limits.'}
          </p>

          <div className="space-y-2 bg-slate-900/80 p-3 rounded-xl border border-slate-750">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{isAr ? 'مفتاح Gemini الخاص بك (اختياري - للاستخدام الخاص الكامل):' : 'Custom Gemini API Key (Optional):'}</span>
              {customKeyInput.trim() && (
                <span className="text-[10px] text-emerald-400 font-bold">{isAr ? 'مُفعّل' : 'Active'}</span>
              )}
            </label>
            <input
              type="password"
              value={customKeyInput}
              onChange={(e) => setCustomKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 outline-none focus:border-amber-400/80 transition"
            />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {isAr
                ? 'إذا أردت ضمان عدم مشاركة سقف الطلبات مع أي شخص، يمكنك استخراج مفتاح مجاني من aistudio.google.com ووضعه هنا.'
                : 'Get a free personal API key from aistudio.google.com and enter it here for dedicated quota.'}
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveCustomKey}
                className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-xs"
              >
                {savedKeySuccess
                  ? (isAr ? 'تم الحفظ والتفعيل!' : 'Saved!')
                  : (isAr ? 'حفظ وتفعيل المفتاح' : 'Save & Activate')}
              </button>
              {customKeyInput.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomKeyInput('');
                    storageService.setCustomApiKey('');
                    onShowToast(isAr ? 'تم مسح المفتاح المخصص' : 'Custom key cleared', 'info');
                  }}
                  className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 border border-slate-700 text-xs font-medium transition cursor-pointer"
                >
                  {isAr ? 'مسح' : 'Clear'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Storage Stats Section */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>{isAr ? 'إحصائيات التخزين' : 'Storage Stats'}</span>
            </h3>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              {isAr ? 'تزامن Firestore' : 'Firestore Synced'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-750 text-center">
              <MessageSquare className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
              <div className="text-base font-bold text-slate-100">{stats.conversationsCount}</div>
              <div className="text-[10px] text-slate-400">
                {isAr ? 'محادثات' : 'Chats'}
              </div>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-750 text-center">
              <Image className="w-4 h-4 mx-auto text-purple-400 mb-1" />
              <div className="text-base font-bold text-slate-100">{stats.imagesCount}</div>
              <div className="text-[10px] text-slate-400">
                {isAr ? 'صور' : 'Images'}
              </div>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-750 text-center">
              <Code2 className="w-4 h-4 mx-auto text-teal-400 mb-1" />
              <div className="text-base font-bold text-slate-100">{stats.appsCount}</div>
              <div className="text-[10px] text-slate-400">
                {isAr ? 'تطبيقات' : 'Apps'}
              </div>
            </div>
          </div>
        </div>

        {/* Network Resilience & Offline Simulation */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'مرونة الشبكة ومواصلة العمل' : 'Network Resilience'}</span>
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                isOnline
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-amber-400 bg-amber-500/10'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{isAr ? 'متصل' : 'Online'}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>{isAr ? 'غير متصل (محفوظ)' : 'Offline (Queued)'}</span>
                </>
              )}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isAr
              ? 'ميزة الصمود أمام انقطاع الإنترنت: عند انقطاع الشبكة أثناء المحادثة أو بناء الأكواد، تُحفظ رسائلك وتُستأنف تلقائياً بمجرد عودة الاتصال دون ضياع بياناتك.'
              : 'Fault tolerance: If internet disconnects during chat or app building, requests are safely cached and auto-resume upon reconnection.'}
          </p>

          <div className="pt-1 flex flex-col gap-2">
            {/* Offline Simulation Toggle */}
            <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-750">
              <div className="flex items-center gap-2 text-xs text-slate-200">
                {isSimulated ? (
                  <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <div>
                  <div className="font-semibold">
                    {isAr ? 'تجربة محاكاة انقطاع الإنترنت' : 'Simulate Offline Mode'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isAr
                      ? 'اختبر إرسال رسائل أو تطبيقات وهي بانتظار العودة'
                      : 'Test queuing & auto-resuming offline'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleSimulateOffline}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                  isSimulated
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {isSimulated
                  ? (isAr ? 'إنهاء المحاكاة (استعادة)' : 'Restore Online')
                  : (isAr ? 'محاكاة الانقطاع' : 'Simulate')}
              </button>
            </div>

            {/* Health Ping Button */}
            <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-750">
              <div className="text-xs text-slate-300 flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isPinging ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'فحص سرعة استجابة الخادم' : 'Server Ping'}</span>
                {pingLatency !== null && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {pingLatency}ms
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleTestPing}
                disabled={isPinging}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 cursor-pointer transition font-medium"
              >
                {isPinging ? (isAr ? 'جاري الفحص...' : 'Checking...') : (isAr ? 'فحص الآن' : 'Ping')}
              </button>
            </div>
          </div>
        </div>

        {/* User Feedback & Rating Section */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'تقييم التطبيق والملاحظات (Feedback)' : 'Feedback & Ratings'}</span>
            </h3>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
              {isAr ? 'مباشر' : 'Direct'}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isAr
              ? 'شاركنا رأيك أو أي فكرة ترغب بإضافتها للتطبيق مستقبلاً لتحسين تجربتك.'
              : 'Share your feedback or suggestions to help us improve your experience.'}
          </p>

          <form onSubmit={handleSubmitFeedback} className="space-y-3 pt-1">
            {/* 5-star rating */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  className="p-1 text-slate-500 hover:text-amber-400 transition cursor-pointer"
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= feedbackRating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-amber-300 ml-2">
                {feedbackRating} / 5
              </span>
            </div>

            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={
                isAr
                  ? 'اكتب ملاحظاتك، استفسارك، أو اقتراحاتك هنا...'
                  : 'Write your thoughts or suggestions here...'
              }
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition resize-none"
            />

            <button
              type="submit"
              disabled={feedbackSent}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {feedbackSent
                  ? (isAr ? 'تم الإرسال بنجاح!' : 'Sent Successfully!')
                  : (isAr ? 'إرسال الملاحظات والتقييم' : 'Submit Feedback')}
              </span>
            </button>
          </form>
        </div>

        {/* Danger Zone & Logout */}
        <div className="space-y-2.5 pt-2">
          
          {/* Force App Update & Refresh Button */}
          <button
            id="force-update-app-btn"
            type="button"
            onClick={async () => {
              try {
                if ('serviceWorker' in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  for (let reg of regs) {
                    await reg.unregister();
                  }
                }
                if ('caches' in window) {
                  const keys = await caches.keys();
                  for (let key of keys) {
                    await caches.delete(key);
                  }
                }
              } catch (e) {}
              window.location.reload();
            }}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{isAr ? 'تحديث التطبيق المثبت لأحدث نسخة فوراً (Refresh & Update)' : 'Update Installed App Now'}</span>
          </button>
          <button
            id="clear-all-data-btn"
            type="button"
            onClick={() => setShowClearModal(true)}
            className="w-full py-3 px-4 rounded-xl bg-slate-800/90 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-slate-700/80 hover:border-red-800/60 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isAr ? 'مسح كل البيانات المحفوظة' : 'Clear All Data'}</span>
          </button>

          <button
            id="logout-btn"
            type="button"
            onClick={handleLogoutClick}
            className="w-full py-3 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{isAr ? 'تسجيل الخروج' : 'Logout'}</span>
          </button>
        </div>

        <div className="text-center pt-4 text-[11px] text-slate-500">
          FreeGen AI • الإصدار 2.5 • مبني بأحدث نماذج Gemini
        </div>
      </div>

      {/* Confirmation Modal for Clearing Data */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-100">
                {isAr ? 'هل أنت متأكد من مسح كافة البيانات؟' : 'Are you sure you want to clear all data?'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isAr
                  ? 'سيتم حذف جميع المحادثات السابقة، والصور المولدة، وتطبيقات الويب نهائياً.'
                  : 'This will permanently remove all your saved conversations, generated images, and apps.'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-xs cursor-pointer transition"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleClearAllData}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer transition shadow-md shadow-red-600/20"
              >
                {isAr ? 'نعم، امسح كل شيء' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
