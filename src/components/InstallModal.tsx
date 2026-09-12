import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  X,
  Share2,
  PlusSquare,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Monitor,
} from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAr: boolean;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose, isAr }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('android');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check iframe
      setIsInIframe(window.self !== window.top);

      // Check standalone
      if (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone
      ) {
        setIsStandalone(true);
      }

      // Detect OS
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setPlatform('ios');
      } else if (/android/.test(ua)) {
        setPlatform('android');
      } else {
        setPlatform('desktop');
      }

      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        onClose();
      }
    }
  };

  const appDirectUrl = window.location.origin;

  return (
    <div
      id="install-app-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-emerald-500/20 shrink-0">
            <img
              src="/icon-192.png"
              alt="FreeGen AI"
              className="w-full h-full rounded-[14px] object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-slate-100">
                {isAr ? 'تثبيت تطبيق FreeGen AI' : 'Install FreeGen AI'}
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isAr ? 'تطبيق هاتف مستقل بدون الحاجة لأي منصة' : 'Standalone app for your device'}
            </p>
          </div>
        </div>

        {/* Standalone Status */}
        {isStandalone ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isAr
                ? 'التطبيق مثبت بالفعل على جهازك ويعمل حالياً كبرنامج مستقل بملء الشاشة!'
                : 'App is already installed and running in standalone mode!'}
            </span>
          </div>
        ) : (
          <>
            {/* Native 1-Click Install Button if supported by browser */}
            {deferredPrompt && (
              <button
                type="button"
                onClick={handleNativeInstall}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-98"
              >
                <Smartphone className="w-4 h-4" />
                <span>{isAr ? 'اضغط هنا للتثبيت الفوري الآن' : 'Install Instantly Now'}</span>
              </button>
            )}

            {/* If in iframe, suggest opening standalone */}
            {isInIframe && (
              <div className="p-3.5 bg-cyan-950/40 border border-cyan-500/30 rounded-2xl text-xs text-cyan-200 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-cyan-300">
                  <ExternalLink className="w-4 h-4" />
                  <span>
                    {isAr ? 'نصيحة للتثبيت المباشر على الهاتف:' : 'Tip for Mobile Installation:'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-cyan-200/90">
                  {isAr
                    ? 'أنت تتصفح المعاينة داخل نافذة المنصة. لتثبيت التطبيق بنقرة واحدة على شاشة هاتفك الرئيسية، افتحه في تبويب مستقل خارج المنصة:'
                    : 'You are viewing inside the platform frame. Open directly in a new tab to install:'}
                </p>
                <a
                  href={appDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <span>{isAr ? 'فتح في نافذة مستقلة للتثبيت' : 'Open in New Tab to Install'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Step-by-Step Instructions Tabs */}
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAr ? 'طريقة التثبيت في ثوانٍ معدودة:' : 'Step-by-Step Installation:'}</span>
              </h3>

              {/* Android Steps */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isAr ? 'لهواتف أندرويد (Android / Chrome):' : 'Android (Chrome):'}</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <li>
                    {isAr
                      ? 'اضغط على النقاط الثلاث (⋮) في أعلى زاوية المتصفح.'
                      : 'Tap the 3 dots menu (⋮) in Chrome.'}
                  </li>
                  <li>
                    {isAr
                      ? 'اختر "تثبيت التطبيق" (Install app) أو "إضافة إلى الشاشة الرئيسية".'
                      : 'Tap "Install app" or "Add to Home screen".'}
                  </li>
                  <li>
                    {isAr
                      ? 'اضغط "تثبيت"، وسيظهر التطبيق فوراً كبرنامج مستقل على شاشتك!'
                      : 'Tap "Install" to add the icon to your home screen!'}
                  </li>
                </ol>
              </div>

              {/* iOS Steps */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'لهواتف آيفون (iPhone / Safari):' : 'iPhone (Safari):'}</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <li>
                    {isAr
                      ? 'اضغط على زر المشاركة (أيقونة المربع وسهم لأعلى ⎋) في أسفل المتصفح.'
                      : 'Tap the Share icon at the bottom of Safari.'}
                  </li>
                  <li>
                    {isAr
                      ? 'مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية" (+ Add to Home Screen).'
                      : 'Scroll down and tap "Add to Home Screen".'}
                  </li>
                  <li>
                    {isAr
                      ? 'اضغط على "إضافة" (Add) في الزاوية العلوية.'
                      : 'Tap "Add" in the top right corner.'}
                  </li>
                </ol>
              </div>

              {/* Desktop / PC Steps */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-purple-400 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>{isAr ? 'للكمبيوتر (PC / Chrome / Edge):' : 'Desktop (PC/Mac):'}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isAr
                    ? 'اضغط على أيقونة التثبيت (شاشة صغيرة أو ⊕) بجانب شريط عنوان المتصفح في الأعلى، ثم اضغط "تثبيت".'
                    : 'Click the install icon (⊕) in the browser address bar, then click "Install".'}
                </p>
              </div>
            </div>

            {/* Reassurance banner */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {isAr
                  ? 'بمجرد التثبيت، يفتح التطبيق كبرنامج مستقل بالكامل على جهازك دون أشرطة متصفح وبدون أي حاجة للدخول لأي منصة!'
                  : 'Once installed, the app opens as a standalone program without browser address bars or needing any external platform!'}
              </p>
            </div>
          </>
        )}

        {/* Done button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition cursor-pointer"
        >
          {isAr ? 'إغلاق' : 'Close'}
        </button>
      </div>
    </div>
  );
};
