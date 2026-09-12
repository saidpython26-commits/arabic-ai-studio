import React, { useState, useEffect } from 'react';
import { Smartphone, Download, CheckCircle2, Share2, PlusSquare, ArrowDown, ExternalLink, Code2 } from 'lucide-react';

interface InstallPwaCardProps {
  isAr: boolean;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const InstallPwaCard: React.FC<InstallPwaCardProps> = ({ isAr, onShowToast }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    // Check if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        onShowToast(isAr ? 'تم بدء تثبيت التطبيق بنجاح!' : 'App installation started!', 'success');
        setDeferredPrompt(null);
      }
    } else {
      window.dispatchEvent(new CustomEvent('open-install-modal'));
    }
  };

  if (isStandalone) {
    return (
      <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-emerald-300">
            {isAr ? 'التطبيق مثبت وتعمل في الوضع المستقل' : 'Installed in Standalone Mode'}
          </div>
          <div className="text-[11px] text-emerald-400/80">
            {isAr ? 'أنت تستخدم FreeGen AI كتطبيق هاتف دائم وكامل الميزات' : 'Running as a standalone native-grade app'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-850 border border-emerald-500/30 rounded-2xl p-4 space-y-3 shadow-lg">
      <div className="flex items-center gap-3">
        <img
          src="/icon-192.png"
          alt="FreeGen App Icon"
          className="w-12 h-12 rounded-xl shadow-md border border-slate-700 object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-100">FreeGen AI Studio</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              PWA
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
            {isAr
              ? 'تثبيت التطبيق مباشرة على شاشة هاتفك الرئيسية كبرنامج مستقل'
              : 'Install directly to your home screen as a standalone mobile app'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          id="install-pwa-btn"
          onClick={handleInstallClick}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-500/20 cursor-pointer active:scale-[0.99]"
        >
          <Smartphone className="w-4 h-4" />
          <span>{isAr ? 'تثبيت على الهاتف' : 'Install to Phone'}</span>
        </button>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-download-modal'))}
          id="download-code-zip-btn"
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-blue-500/20 cursor-pointer active:scale-[0.99]"
        >
          <Download className="w-4 h-4" />
          <span>{isAr ? 'تنزيل الكود الذكي (ZIP)' : 'Download Code (ZIP)'}</span>
        </button>
      </div>

      {showInstructions && (
        <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-750 text-[11px] text-slate-300 space-y-2 animate-in fade-in duration-150">
          <div className="font-bold text-emerald-400 flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5" />
            <span>{isAr ? 'طريقة التثبيت السريعة:' : 'Quick Installation Steps:'}</span>
          </div>

          {isIOS ? (
            <ol className="space-y-1.5 pr-4 pl-4 list-decimal text-slate-300 text-[11px] leading-relaxed">
              <li>
                {isAr
                  ? 'اضغط على زر المشاركة (Share) في شريط Safari بالأسفل'
                  : 'Tap the Share button at the bottom of Safari'}
                <Share2 className="w-3 h-3 inline-block mx-1 text-emerald-400" />
              </li>
              <li>
                {isAr
                  ? 'مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية"'
                  : 'Scroll down and tap "Add to Home Screen"'}
                <PlusSquare className="w-3 h-3 inline-block mx-1 text-emerald-400" />
              </li>
              <li>
                {isAr
                  ? 'اضغط "إضافة" (Add) في الزاوية العلوية'
                  : 'Tap "Add" in the top right corner'}
              </li>
            </ol>
          ) : (
            <ol className="space-y-1.5 pr-4 pl-4 list-decimal text-slate-300 text-[11px] leading-relaxed">
              <li>
                {isAr
                  ? 'اضغط على قائمة الثلاث نقاط في أعلى متصفح Chrome'
                  : 'Tap the 3 dots menu in Chrome'}
              </li>
              <li>
                {isAr
                  ? 'اختر "تثبيت التطبيق" (Install app) أو "إضافة إلى الشاشة الرئيسية"'
                  : 'Tap "Install app" or "Add to Home Screen"'}
              </li>
              <li>
                {isAr
                  ? 'اضغط "تثبيت" وسيظهر التطبيق فوراً بين تطبيقات هاتفك'
                  : 'Tap "Install" and it will appear on your phone apps'}
              </li>
            </ol>
          )}

          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
            {isAr
              ? 'يعمل التطبيق بدون الحاجة لفتح المتصفح وبشكل كامل دون انقطاع.'
              : 'The app works completely independently without browser bars.'}
          </div>
        </div>
      )}
    </div>
  );
};
