import React, { useState, useEffect, useRef } from 'react';
import {
  Code2,
  Play,
  Eye,
  Download,
  Copy,
  Check,
  Trash2,
  Loader2,
  Sparkles,
  ExternalLink,
  Layers,
  ChevronRight,
  Maximize2,
  X,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { GeneratedApp, Language, UserProfile } from '../types';
import { storageService } from '../services/storage';
import { networkManager } from '../services/networkManager';
import { generateAppDirect } from '../services/geminiDirect';

interface AppsTabProps {
  user: UserProfile;
  language: Language;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AppsTab: React.FC<AppsTabProps> = ({ user, language, onShowToast }) => {
  const isAr = language === 'ar';

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingAppJob, setPendingAppJob] = useState<string | null>(null);

  // References for asynchronous network events
  const isGeneratingRef = useRef(isGenerating);
  isGeneratingRef.current = isGenerating;
  const pendingAppJobRef = useRef(pendingAppJob);
  pendingAppJobRef.current = pendingAppJob;

  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [copiedCode, setCopiedCode] = useState(false);
  const [fullScreenPreview, setFullScreenPreview] = useState(false);

  // App history
  const [apps, setApps] = useState<GeneratedApp[]>(() => storageService.getApps(user.uid));
  const [activeApp, setActiveApp] = useState<GeneratedApp | null>(() => {
    const list = storageService.getApps(user.uid);
    return list.length > 0 ? list[0] : null;
  });

  // Auto-reconnect trigger: resume queued app creation
  useEffect(() => {
    const unsubscribe = networkManager.registerOnReconnect(() => {
      const pendingPrompt = pendingAppJobRef.current;
      if (pendingPrompt && !isGeneratingRef.current) {
        onShowToast(
          isAr
            ? '⚡ عادت شبكة الإنترنت! جاري استئناف بناء التطبيق تلقائياً...'
            : '⚡ Internet restored! Auto-resuming app build...',
          'success'
        );
        handleGenerateApp(pendingPrompt);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAr]);

  const sampleAppIdeas = [
    isAr
      ? 'لوحة مهام كانبان تفاعلية مع إمكانية سحب وإفلات البطاقات وتصنيف الألوان'
      : 'Interactive Kanban board with drag-and-drop cards and local storage',
    isAr
      ? 'آلة حاسبة مالية ذكية للتمويل والميزانية مع جداول ورسوم بيانية'
      : 'Financial loan & mortgage calculator with repayment breakdown charts',
    isAr
      ? 'مؤقت بومودورو فخم مع قائمة مهام وحفظ إحصائيات التركيز محلياً'
      : 'Minimalist Pomodoro timer with task list and daily focus stats',
    isAr
      ? 'عداد تسبيح وأذكار تفاعلي مع خلفيات مهدئة وتأثيرات صوتية خفيفة'
      : 'Digital tasbih and remembrance counter with soothing sound cues',
    isAr
      ? 'تطبيق تدوين ملاحظات تفاعلي سريع مع بحث وتصنيفات ملونة'
      : 'Instant interactive notes app with search and colored categories',
  ];

  const handleGenerateApp = async (targetPrompt?: string) => {
    const p = (targetPrompt || prompt).trim();
    if (!p || isGenerating) return;

    // Check network status before fetching
    // Proceed directly with generation


    setIsGenerating(true);
    try {
      const customKey = storageService.getCustomApiKey();
      let data: { appName?: string; description?: string; html: string } | null = null;

      try {
        const response = await fetch('/api/gemini/app', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(customKey ? { 'x-gemini-key': customKey } : {}),
          },
          body: JSON.stringify({ prompt: p }),
        });
        if (response.ok) {
          data = await response.json();
        }
      } catch (fetchErr) {
        console.warn('Backend app generation failed, falling back to direct API:', fetchErr);
      }

      // If backend was 404 or unreachable, generate directly using user's Gemini key
      if (!data && customKey) {
        data = await generateAppDirect(customKey, p);
      }

      if (!data || !data.html) {
        throw new Error('تعذر بناء التطبيق. تأكد من تفعيل مفتاحك الخاص في الإعدادات أو الاتصال بالإنترنت.');
      }

      networkManager.reportSuccess();
      const newApp: GeneratedApp = {
        id: `app_${Date.now()}`,
        name: data.appName || p.slice(0, 24),
        description: data.description || p,
        html: data.html,
        createdAt: Date.now(),
      };

      storageService.saveApp(user.uid, newApp);
      const updated = [newApp, ...apps];
      setApps(updated);
      setActiveApp(newApp);
      setViewMode('preview');
      setPendingAppJob(null);

      onShowToast(isAr ? 'تم بناء التطبيق بنجاح!' : 'App built successfully!', 'success');
    } catch (err: any) {
      console.error('App generation error:', err);
      networkManager.reportFailure();
      // Queue in pending so user can retry or auto-resume on reconnect
      setPendingAppJob(p);
      onShowToast(
        isAr
          ? 'انقطع الاتصال أثناء بناء التطبيق - تم حفظ الطلب وسيستأنف فور عودة الشبكة'
          : 'Connection lost during app build - saved for auto-resume',
        'info'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadApp = (app: GeneratedApp) => {
    const blob = new Blob([app.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = app.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
    link.download = `${safeName || 'app'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast(isAr ? 'تم تنزيل ملف التطبيق (.html)' : 'Downloaded .html file', 'success');
  };

  const handleCopyCode = (html: string) => {
    navigator.clipboard.writeText(html);
    setCopiedCode(true);
    onShowToast(isAr ? 'تم نسخ الكود بالكامل!' : 'Code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDeleteApp = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    storageService.deleteApp(user.uid, id);
    const updated = apps.filter((a) => a.id !== id);
    setApps(updated);
    if (activeApp?.id === id) {
      setActiveApp(updated[0] || null);
    }
    onShowToast(isAr ? 'تم حذف التطبيق' : 'App deleted', 'info');
  };

  return (
    <div id="apps-tab-container" className="flex-1 min-h-0 flex flex-col bg-slate-900 overflow-y-auto overscroll-contain touch-pan-y pb-20">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100">
              {isAr ? 'بناء التطبيقات بالذكاء الاصطناعي' : 'AI App Generator'}
            </h1>
            <p className="text-[10px] text-slate-400">
              {isAr ? 'تطبيقات ويب متكاملة HTML/CSS/JS جاهزة للتشغيل' : 'Single-file interactive HTML apps'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/60">
          <Layers className="w-3.5 h-3.5 text-teal-400" />
          <span>{apps.length}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Pending App Job Card */}
        {pendingAppJob && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {isAr
                    ? 'طلب بناء التطبيق محفوظ وفي الانتظار (سيُبنى تلقائياً فور توفر الإنترنت)'
                    : 'App generation queued (will auto-run when online)'}
                </span>
              </div>
              <button
                onClick={() => setPendingAppJob(null)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded cursor-pointer"
                title={isAr ? 'إلغاء الطلب' : 'Cancel'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-xl line-clamp-2 border border-white/5">
              "{pendingAppJob}"
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleGenerateApp(pendingAppJob)}
                disabled={isGenerating}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'بدء بناء التطبيق الآن' : 'Build Now'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Input Box */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3.5 space-y-3 shadow-md">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              {isAr ? 'فكرة التطبيق المطلوب' : 'App Idea'}
            </label>
            <textarea
              id="app-prompt-input"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                isAr
                  ? 'اشرح فكرة التطبيق، وظائفه، وتصميمه بالتفصيل (مثال: تطبيق لإدارة الميزانية الشخصية بالريال...)'
                  : 'Describe your app idea, interactions, and design features in detail...'
              }
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-teal-500/70 resize-none transition-colors"
            />
          </div>

          {/* Quick inspiration ideas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {sampleAppIdeas.map((idea, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(idea)}
                className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-teal-300 border border-slate-750 transition cursor-pointer shrink-0"
              >
                ⚡ {idea.slice(0, 30)}...
              </button>
            ))}
          </div>

          {/* Generate Button */}
          <button
            id="generate-app-btn"
            type="button"
            onClick={() => handleGenerateApp()}
            disabled={!prompt.trim() || isGenerating}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                <span>{isAr ? 'جاري برمجة وتجهيز التطبيق...' : 'Building application code...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>{isAr ? 'إنشاء التطبيق الآن' : 'Generate Application'}</span>
              </>
            )}
          </button>
        </div>

        {/* Loading Skeleton */}
        {isGenerating && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center animate-pulse min-h-[280px]">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400 mb-3">
              <Code2 className="w-7 h-7 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              {isAr ? 'يقوم Gemini بكتابة كود HTML والـ CSS وجافاسكريبت...' : 'Gemini is writing the complete HTML, CSS & JS...'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? 'بناء الواجهات التفاعلية وحفظ البيانات محلياً' : 'Creating interactive components and styling'}
            </p>
          </div>
        )}

        {/* Active Generated App View */}
        {!isGenerating && activeApp && (
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
            {/* Top Toolbar */}
            <div className="p-3 bg-slate-850 border-b border-slate-700 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-100 truncate">{activeApp.name}</h3>
                <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                  {activeApp.description}
                </p>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                    viewMode === 'preview'
                      ? 'bg-teal-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isAr ? 'معاينة' : 'Preview'}</span>
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                    viewMode === 'code'
                      ? 'bg-teal-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'الكود' : 'Code'}</span>
                </button>
              </div>
            </div>

            {/* Viewer Content */}
            <div className="h-[380px] bg-slate-950 relative overflow-hidden">
              {viewMode === 'preview' ? (
                <iframe
                  title={activeApp.name}
                  srcDoc={activeApp.html}
                  sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                  className="w-full h-full border-none bg-white"
                />
              ) : (
                <div className="w-full h-full overflow-auto p-3 text-xs font-mono text-teal-300 bg-slate-950 selection:bg-teal-500/30">
                  <pre className="whitespace-pre-wrap break-all">{activeApp.html}</pre>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-2.5 bg-slate-800 border-t border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setFullScreenPreview(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                  title={isAr ? 'معاينة ملء الشاشة' : 'Full Screen'}
                >
                  <Maximize2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>{isAr ? 'تكبير' : 'Fullscreen'}</span>
                </button>

                <button
                  onClick={() => handleCopyCode(activeApp.html)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedCode ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ الكود' : 'Copy')}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleDownloadApp(activeApp)}
                  className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تحميل HTML' : 'Download'}</span>
                </button>
                <button
                  onClick={() => handleDeleteApp(activeApp.id)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition cursor-pointer"
                  title={isAr ? 'حذف التطبيق' : 'Delete'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Previously Generated Apps List */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300">
              {isAr ? 'التطبيقات السابقة المحفوظة' : 'Saved Applications'}
            </h3>
            <span className="text-[11px] text-slate-500">
              {apps.length} {isAr ? 'تطبيقات' : 'apps'}
            </span>
          </div>

          {apps.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
              <Code2 className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">
                {isAr ? 'لم تنشئ أي تطبيقات بعد' : 'No generated apps yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {apps.map((app) => (
                <div
                  key={app.id}
                  onClick={() => {
                    setActiveApp(app);
                    setViewMode('preview');
                  }}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                    activeApp?.id === app.id
                      ? 'bg-teal-500/10 border-teal-500/40 text-teal-300 shadow-sm'
                      : 'bg-slate-800/60 border-slate-750 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0 font-bold text-xs">
                      HTML
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-100 truncate">{app.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{app.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadApp(app);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-400 hover:text-teal-300 transition"
                      title={isAr ? 'تحميل' : 'Download'}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteApp(app.id, e)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                      title={isAr ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Iframe Preview Modal */}
      {fullScreenPreview && activeApp && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between backdrop-blur-md animate-in fade-in duration-200">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-100 truncate max-w-[240px]">
              {activeApp.name}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadApp(activeApp)}
                className="px-3 py-1 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تحميل' : 'Download'}</span>
              </button>
              <button
                onClick={() => setFullScreenPreview(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 w-full bg-white">
            <iframe
              title={activeApp.name}
              srcDoc={activeApp.html}
              sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
              className="w-full h-full border-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
