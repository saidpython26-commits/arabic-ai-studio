import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Download,
  Maximize2,
  Trash2,
  X,
  Loader2,
  Copy,
  Check,
  Ratio,
  Palette,
  Image as ImageIcon,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { GeneratedImage, Language, UserProfile } from '../types';
import { storageService } from '../services/storage';
import { networkManager } from '../services/networkManager';

interface ImagesTabProps {
  user: UserProfile;
  language: Language;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ImagesTab: React.FC<ImagesTabProps> = ({ user, language, onShowToast }) => {
  const isAr = language === 'ar';

  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [selectedStyle, setSelectedStyle] = useState<string>('واقعي');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingJob, setPendingJob] = useState<{
    prompt: string;
    aspectRatio: '1:1' | '16:9' | '9:16';
    style: string;
  } | null>(null);

  // References for asynchronous network events
  const isGeneratingRef = useRef(isGenerating);
  isGeneratingRef.current = isGenerating;
  const pendingJobRef = useRef(pendingJob);
  pendingJobRef.current = pendingJob;

  // History state
  const [images, setImages] = useState<GeneratedImage[]>(() =>
    storageService.getImages(user.uid)
  );
  const [activeImage, setActiveImage] = useState<GeneratedImage | null>(() => {
    const list = storageService.getImages(user.uid);
    return list.length > 0 ? list[0] : null;
  });

  // Auto-reconnect trigger: resume queued image generation
  useEffect(() => {
    const unsubscribe = networkManager.registerOnReconnect(() => {
      const job = pendingJobRef.current;
      if (job && !isGeneratingRef.current) {
        onShowToast(
          isAr
            ? '⚡ عادت شبكة الإنترنت! جاري استئناف توليد الصورة تلقائياً...'
            : '⚡ Internet restored! Auto-resuming image generation...',
          'success'
        );
        handleGenerate(job.prompt, job.aspectRatio, job.style);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAr]);

  // Full-screen modal state
  const [fullScreenImage, setFullScreenImage] = useState<GeneratedImage | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const stylePresets = [
    { id: 'واقعي', label: isAr ? 'واقعي' : 'Realistic', desc: '8K Ultra Photo' },
    { id: 'سينمائي', label: isAr ? 'سينمائي' : 'Cinematic', desc: 'Epic Lighting' },
    { id: 'رقمي', label: isAr ? 'رقمي' : 'Digital Art', desc: 'ArtStation Style' },
    { id: 'كرتوني', label: isAr ? 'كرتوني' : 'Cartoon', desc: 'Vibrant & Clean' },
    { id: 'ثلاثي الأبعاد', label: isAr ? 'ثلاثي الأبعاد' : '3D Render', desc: 'Octane / Blender' },
  ];

  const aspectRatios: Array<{ id: '1:1' | '16:9' | '9:16'; label: string; ratioStyle: string }> = [
    { id: '1:1', label: '1:1', ratioStyle: 'aspect-square' },
    { id: '16:9', label: '16:9', ratioStyle: 'aspect-video' },
    { id: '9:16', label: '9:16', ratioStyle: 'aspect-[9/16]' },
  ];

  const samplePrompts = [
    isAr
      ? 'صقر عربي ذهبي بجناحين متوهجين يحلق فوق مدينة دبي المستقبلية ليلاً'
      : 'A majestic golden falcon flying over a futuristic neon Dubai at night',
    isAr
      ? 'واحة نخيل زمردية محاطة بكثبان رملية تحت سماء مرصعة بالنجوم المجرية'
      : 'An emerald oasis surrounded by sand dunes under a starry galaxy sky',
    isAr
      ? 'فنجان قهوة عربية تقليدي يخرج منه بخار على شكل خريطة العالم'
      : 'A traditional Arabic coffee cup with steam forming a world map',
  ];

  const handleGenerate = async (
    targetPrompt?: string,
    targetRatio?: '1:1' | '16:9' | '9:16',
    targetStyle?: string,
    variationOffset: number = 0
  ) => {
    const p = (targetPrompt || prompt).trim();
    const ratio = targetRatio || aspectRatio;
    const style = targetStyle || selectedStyle;

    if (!p || isGenerating) return;

    // If offline: queue request in pendingJob and alert user
    if (!networkManager.isOnline()) {
      setPendingJob({ prompt: p, aspectRatio: ratio, style });
      onShowToast(
        isAr
          ? 'لا يوجد اتصال - تم حفظ طلب توليد الصورة وسيبدأ تلقائياً فور عودة الإنترنت'
          : 'Offline - Request saved, will generate automatically upon reconnect',
        'info'
      );
      return;
    }

    setIsGenerating(true);
    try {
      const customKey = storageService.getCustomApiKey();
      const response = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customKey ? { 'x-gemini-key': customKey } : {}),
        },
        body: JSON.stringify({
          prompt: p,
          aspectRatio: ratio,
          style,
          variation: variationOffset,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل توليد الصورة');
      }

      const data = await response.json();
      networkManager.reportSuccess();
      const newImg: GeneratedImage = {
        id: `img_${Date.now()}`,
        prompt: p,
        enhancedPrompt: data.enhancedPrompt,
        imageUrl: data.imageUrl,
        aspectRatio: ratio,
        style,
        createdAt: Date.now(),
      };

      // Save to persistent storage
      storageService.saveImage(user.uid, newImg);
      const updated = [newImg, ...images];
      setImages(updated);
      setActiveImage(newImg);
      setPendingJob(null);

      onShowToast(
        isAr ? 'تم توليد الصورة الفنية بدقة بنجاح!' : 'Artwork generated successfully!',
        'success'
      );
    } catch (err: any) {
      console.error('Image generation error:', err);
      networkManager.reportFailure();
      // Save in pendingJob so user can resume easily or auto-resume on reconnect
      setPendingJob({ prompt: p, aspectRatio: ratio, style });
      onShowToast(
        isAr
          ? 'انقطع الاتصال أثناء التوليد - طلبك محفوظ وسيستأنف تلقائياً فور عودة الشبكة'
          : 'Network issue during generation - Saved, will auto-resume',
        'info'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = img.imageUrl;
    link.download = `freegen_${img.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast(isAr ? 'بدأ تحميل الصورة' : 'Downloading image...', 'success');
  };

  const handleDeleteImage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    storageService.deleteImage(user.uid, id);
    const updated = images.filter((img) => img.id !== id);
    setImages(updated);
    if (activeImage?.id === id) {
      setActiveImage(updated[0] || null);
    }
    if (fullScreenImage?.id === id) {
      setFullScreenImage(null);
    }
    onShowToast(isAr ? 'تم حذف الصورة' : 'Image deleted', 'info');
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    onShowToast(isAr ? 'تم نسخ وصف الصورة' : 'Prompt copied', 'success');
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div id="images-tab-container" className="flex-1 min-h-0 flex flex-col bg-slate-900 overflow-y-auto overscroll-contain touch-pan-y pb-20">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100">
              {isAr ? 'توليد الصور بالذكاء الاصطناعي' : 'AI Image Generator'}
            </h1>
            <p className="text-[10px] text-slate-400">
              {isAr ? 'نماذج Gemini و Imagen فائقة الجودة' : 'Powered by Imagen & Gemini'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/60">
          <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
          <span>{images.length}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Pending Offline Job Notification Card */}
        {pendingJob && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {isAr
                    ? 'طلب توليد الصورة محفوظ وفي الانتظار (سيُنفّذ تلقائياً فور توفر الإنترنت)'
                    : 'Image generation queued (will auto-run when online)'}
                </span>
              </div>
              <button
                onClick={() => setPendingJob(null)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded cursor-pointer"
                title={isAr ? 'إلغاء الطلب' : 'Cancel'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-xl line-clamp-2 border border-white/5">
              "{pendingJob.prompt}"
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleGenerate(pendingJob.prompt, pendingJob.aspectRatio, pendingJob.style)}
                disabled={isGenerating}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isAr ? 'بدء التوليد الآن' : 'Run Now'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Prompt Input Box */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3.5 space-y-3 shadow-md">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              {isAr ? 'وصف الصورة (Prompt)' : 'Image Description'}
            </label>
            <textarea
              id="image-prompt-input"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                isAr
                  ? 'صف الصورة التي تتخيلها بالتفصيل (مثال: قلعة عربية عائمة في سماء بنفسجية...)'
                  : 'Describe what you want to see in high detail...'
              }
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-purple-500/70 resize-none transition-colors"
            />
          </div>

          {/* Quick suggestions pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {samplePrompts.map((sp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(sp)}
                className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-purple-300 border border-slate-750 transition cursor-pointer shrink-0"
              >
                ✨ {sp.slice(0, 28)}...
              </button>
            ))}
          </div>

          {/* Aspect Ratio Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Ratio className="w-3.5 h-3.5 text-purple-400" />
                {isAr ? 'الأبعاد' : 'Aspect Ratio'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {aspectRatios.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setAspectRatio(r.id)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    aspectRatio === r.id
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-sm'
                      : 'bg-slate-900/70 border-slate-700/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style Presets */}
          <div>
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1.5">
              <Palette className="w-3.5 h-3.5 text-emerald-400" />
              {isAr ? 'النمط الفني' : 'Style Preset'}
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {stylePresets.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStyle(st.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs whitespace-nowrap transition cursor-pointer shrink-0 ${
                    selectedStyle === st.id
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold shadow-sm'
                      : 'bg-slate-900/70 border-slate-700/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            id="generate-image-btn"
            type="button"
            onClick={() => handleGenerate()}
            disabled={!prompt.trim() || isGenerating}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isAr ? 'جاري رسم وتوليد الصورة...' : 'Generating artwork...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isAr ? 'توليد الصورة' : 'Generate Artwork'}</span>
              </>
            )}
          </button>
        </div>

        {/* Featured / Active Image Display */}
        {isGenerating && (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center animate-pulse min-h-[260px]">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              {isAr ? 'يقوم الذكاء الاصطناعي برسم عملك الفني الآن...' : 'AI is painting your artwork...'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? 'تطبيق النمط والإضاءة ودقة التفاصيل' : 'Applying style, lighting and details'}
            </p>
          </div>
        )}

        {!isGenerating && activeImage && (
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
            <div className="relative group bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src={activeImage.imageUrl}
                alt={activeImage.prompt}
                className="w-full h-auto object-cover max-h-[380px] transition-transform duration-300"
              />

              {/* Overlay Actions */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                <button
                  onClick={() => setFullScreenImage(activeImage)}
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md border border-white/10 transition cursor-pointer shadow-md"
                  title={isAr ? 'تكبير كامل للشاشة' : 'Full Screen'}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownload(activeImage)}
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-emerald-400 backdrop-blur-md border border-white/10 transition cursor-pointer shadow-md"
                  title={isAr ? 'تحميل' : 'Download'}
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteImage(activeImage.id)}
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-red-500/80 text-white backdrop-blur-md border border-white/10 transition cursor-pointer shadow-md"
                  title={isAr ? 'حذف' : 'Delete'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-lg bg-slate-900/80 text-[10px] text-slate-300 backdrop-blur-xs border border-white/10">
                {activeImage.style} • {activeImage.aspectRatio}
              </div>
            </div>

            <div className="p-3 bg-slate-800/90 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {activeImage.prompt}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      handleGenerate(
                        activeImage.prompt,
                        activeImage.aspectRatio,
                        activeImage.style,
                        Math.floor(Math.random() * 50) + 1
                      )
                    }
                    disabled={isGenerating}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                    title={isAr ? 'توليد زاوية جديدة لنفس الوصف' : 'Generate variation'}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isAr ? 'تنويع جديد' : 'Variation'}</span>
                  </button>

                  <button
                    onClick={() => handleCopyPrompt(activeImage.prompt)}
                    className="text-slate-400 hover:text-purple-300 p-1 rounded-md cursor-pointer"
                    title={isAr ? 'نسخ الوصف' : 'Copy prompt'}
                  >
                    {copiedPrompt ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Enhanced Prompt Display */}
              {activeImage.enhancedPrompt && (
                <div className="pt-2 border-t border-slate-700/60">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 mb-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>{isAr ? 'الهندسة البصرية الدقيقة (AI Visual Prompt):' : 'Engineered Visual Prompt:'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono leading-relaxed bg-slate-900/80 p-2 rounded-lg border border-slate-750 break-words">
                    {activeImage.enhancedPrompt}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Gallery */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300">
              {isAr ? 'معرض الصور السابقة' : 'Image History'}
            </h3>
            <span className="text-[11px] text-slate-500">
              {images.length} {isAr ? 'صور محفوظة' : 'saved'}
            </span>
          </div>

          {images.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
              <ImageIcon className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">
                {isAr ? 'لم تقم بتوليد أي صور بعد' : 'No generated images yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <div
                  key={img.id}
                  onClick={() => setActiveImage(img)}
                  className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border transition-all ${
                    activeImage?.id === img.id
                      ? 'border-purple-500 ring-2 ring-purple-500/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={img.imageUrl}
                    alt={img.prompt}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullScreenImage(img);
                      }}
                      className="p-1 rounded bg-slate-900/90 text-white hover:text-purple-300"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(img);
                      }}
                      className="p-1 rounded bg-slate-900/90 text-white hover:text-emerald-300"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Modal */}
      {fullScreenImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between z-10">
            <span className="text-xs text-slate-400 max-w-[240px] truncate">
              {fullScreenImage.prompt}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload(fullScreenImage)}
                className="p-2 rounded-xl bg-slate-800/80 text-emerald-400 hover:bg-slate-700 border border-slate-700 cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFullScreenImage(null)}
                className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-2">
            <img
              src={fullScreenImage.imageUrl}
              alt={fullScreenImage.prompt}
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-slate-800"
            />
          </div>

          <div className="text-center p-2 bg-slate-900/80 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-300">{fullScreenImage.prompt}</p>
          </div>
        </div>
      )}
    </div>
  );
};
