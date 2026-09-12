import React, { useEffect, useState } from 'react';
import {
  Download,
  X,
  Wifi,
  WifiOff,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { resilientDownloader, DownloadStatus } from '../services/resilientDownloader';

interface ResilientDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAr: boolean;
}

export const ResilientDownloadModal: React.FC<ResilientDownloadModalProps> = ({
  isOpen,
  onClose,
  isAr,
}) => {
  const [status, setStatus] = useState<DownloadStatus>({
    state: 'idle',
    receivedBytes: 0,
    totalBytes: 0,
    percentage: 0,
    speed: '0 KB/s',
    isOnline: true,
    isFromCache: false,
  });

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = resilientDownloader.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    // Auto-start download if idle
    if (status.state === 'idle') {
      resilientDownloader.startDownload();
    }

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartOrResume = () => {
    if (status.state === 'paused') {
      resilientDownloader.resumeDownload();
    } else {
      resilientDownloader.startDownload();
    }
  };

  const handlePause = () => {
    resilientDownloader.pauseDownload();
  };

  const handleSaveAgain = async () => {
    const cached = await resilientDownloader.getCachedZip();
    if (cached) {
      resilientDownloader.triggerBrowserSave(cached);
    } else {
      resilientDownloader.startDownload();
    }
  };

  return (
    <div
      id="resilient-download-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-4 text-slate-100">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Badge */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {isAr ? 'تنزيل الكود الذكي (المقاوم للانقطاع)' : 'Resilient Code Downloader'}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {isAr
                    ? 'محمي ضد انقطاع الإنترنت مع استئناف تلقائي'
                    : 'Auto-resumes on network drops'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Network Status Banner */}
        <div
          className={`px-3 py-2 rounded-2xl text-xs flex items-center justify-between border ${
            status.isOnline
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
          }`}
        >
          <div className="flex items-center gap-2">
            {status.isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-400" />
            )}
            <span className="font-semibold">
              {status.isOnline
                ? isAr
                  ? 'الشبكة متصلة وجاهزة'
                  : 'Internet Connected'
                : isAr
                ? 'انقطع الإنترنت مؤقتاً (التقدم محفوظ)'
                : 'Internet Offline (Progress Safe)'}
            </span>
          </div>
          <span className="text-[11px] opacity-80">
            {status.isFromCache
              ? isAr
                ? 'ذاكرة محلية 100%'
                : 'Cached'
              : status.isOnline
              ? status.speed
              : isAr
              ? 'في انتظار الإشارة...'
              : 'Waiting...'}
          </span>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex justify-between items-baseline text-xs">
            <span className="font-bold text-cyan-400">
              {status.state === 'completed'
                ? isAr
                  ? 'تم التحميل 100%'
                  : 'Completed 100%'
                : `${status.percentage}%`}
            </span>
            <span className="text-slate-400 text-[11px]">
              {resilientDownloader.formatBytes(status.receivedBytes)} /{' '}
              {status.totalBytes > 0
                ? resilientDownloader.formatBytes(status.totalBytes)
                : '~ 2.8 MB'}
            </span>
          </div>

          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                status.state === 'completed'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : status.state === 'paused'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                  : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 animate-pulse'
              }`}
              style={{ width: `${Math.max(5, status.percentage)}%` }}
            />
          </div>

          {/* Explanatory Message */}
          <p className="text-[11px] text-slate-300 leading-relaxed pt-1">
            {status.state === 'completed' ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isAr
                  ? 'تم حفظ ملف الكود المضغوط (ZIP) في هاتفك، وأصبح محفوظاً أيضاً في ذاكرة التطبيق بلا إنترنت!'
                  : 'Full project ZIP saved to your phone & cached offline!'}
              </span>
            ) : status.state === 'paused' ? (
              <span className="text-amber-300 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {isAr
                  ? 'لا تقلق! التنزيل متوقف مؤقتاً ومحفوظ. سيستأنف تلقائياً فور عودة الإنترنت دون إعادة من البداية.'
                  : 'Connection paused. Will auto-resume seamlessly when signal returns.'}
              </span>
            ) : (
              <span className="text-slate-400">
                {isAr
                  ? 'جاري تنزيل كود المشروع كاملاً بنظام المقاطع (Byte Chunks) المقاوم للانقطاع.'
                  : 'Downloading project code with resilient byte-range chunking.'}
              </span>
            )}
          </p>
        </div>

        {/* Actions Controls */}
        <div className="space-y-2 pt-1">
          {status.state === 'completed' ? (
            <button
              type="button"
              onClick={handleSaveAgain}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer"
            >
              <HardDrive className="w-4 h-4" />
              <span>{isAr ? 'حفظ نسخة أخرى في الهاتف مجدداً' : 'Save Another Copy to Phone'}</span>
            </button>
          ) : status.state === 'paused' ? (
            <button
              type="button"
              onClick={handleStartOrResume}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-98 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>{isAr ? 'استئناف التنزيل الآن' : 'Resume Download Now'}</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePause}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Pause className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'إيقاف مؤقت' : 'Pause'}</span>
              </button>
              <button
                type="button"
                onClick={() => resilientDownloader.startDownload()}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-cyan-400" />
                <span>{isAr ? 'إعادة البدء' : 'Restart'}</span>
              </button>
            </div>
          )}

          {/* Direct link fallback */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 px-1">
            <span>{isAr ? 'تواجه صعوبة في التنزيل؟' : 'Alternative options:'}</span>
            <a
              href="/api/export/project-zip"
              download="freegen-ai-standalone-project.zip"
              className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 font-medium"
            >
              <span>{isAr ? 'الرابط المباشر التقليدي' : 'Direct Browser Link'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
