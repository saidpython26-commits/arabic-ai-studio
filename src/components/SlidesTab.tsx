import React, { useState, useEffect, useRef } from 'react';
import {
  Presentation,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Download,
  Share2,
  Video,
  Maximize2,
  Minimize2,
  Lightbulb,
  CheckCircle2,
  Layers,
  BookOpen,
  Send,
  Loader2,
  History,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { GeneratedPresentation, Language, SlideItem, UserProfile } from '../types';
import { storageService } from '../services/storage';
import { generateSlidesDirect } from '../services/geminiDirect';

interface SlidesTabProps {
  user: UserProfile;
  language: Language;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SlidesTab: React.FC<SlidesTabProps> = ({ user, language, onShowToast }) => {
  const isAr = language === 'ar';

  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [presentations, setPresentations] = useState<GeneratedPresentation[]>(() =>
    storageService.getPresentations(user.uid)
  );
  const [activePres, setActivePres] = useState<GeneratedPresentation | null>(() => {
    const list = storageService.getPresentations(user.uid);
    return list.length > 0 ? list[0] : null;
  });

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const autoPlayTimerRef = useRef<any>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const sampleTopics = [
    isAr ? 'الفيزياء الكمية وظاهرة التشابك الكمي' : 'Quantum physics & entanglement',
    isAr ? 'دورة كريبس لإنتاج الطاقة في الخلية' : 'Krebs cycle cellular respiration',
    isAr ? 'الذكاء الاصطناعي وشبكات التعلم العميق' : 'AI & Deep neural networks',
    isAr ? 'النسبية العامة وتحدب الزمكان' : 'General relativity & spacetime curvature',
    isAr ? 'التمويل الشخصي واستراتيجية الاستثمار المركب' : 'Compound interest & financial planning',
  ];

  // Handle auto-play
  useEffect(() => {
    if (isAutoPlaying && activePres && activePres.slides.length > 1) {
      autoPlayTimerRef.current = setInterval(() => {
        setCurrentSlideIndex((prev) => {
          if (prev >= activePres.slides.length - 1) {
            setIsAutoPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 5000);
    } else {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    }
    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, activePres]);

  const handleGenerate = async (targetTopic?: string) => {
    const t = (targetTopic || topic).trim();
    if (!t || isGenerating) return;

    setIsGenerating(true);
    try {
      const customKey = storageService.getCustomApiKey();
      let data: GeneratedPresentation | null = null;

      try {
        const res = await fetch('/api/gemini/slides', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(customKey ? { 'x-gemini-key': customKey } : {}),
          },
          body: JSON.stringify({ topic: t }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.slides) {
            data = {
              id: `pres_${Date.now()}`,
              topic: json.topic || t,
              summary: json.summary || '',
              slides: json.slides,
              createdAt: Date.now(),
            };
          }
        }
      } catch (e) {
        console.warn('Backend slides call failed, using direct client fallback:', e);
      }

      if (!data && customKey) {
        const directJson = await generateSlidesDirect(customKey, t);
        if (directJson && directJson.slides) {
          data = {
            id: `pres_${Date.now()}`,
            topic: directJson.topic || t,
            summary: directJson.summary || '',
            slides: directJson.slides,
            createdAt: Date.now(),
          };
        }
      }

      if (data) {
        await storageService.savePresentation(user.uid, data);
        setPresentations((prev) => [data!, ...prev]);
        setActivePres(data);
        setCurrentSlideIndex(0);
        setIsAutoPlaying(false);
        setTopic('');
        onShowToast(
          isAr ? '✨ تم إنشاء العرض التقديمي التفاعلي بنجاح!' : 'Presentation created successfully!',
          'success'
        );
      } else {
        throw new Error('تعذر توليد العرض التقديمي');
      }
    } catch (err: any) {
      onShowToast(
        isAr ? 'حدث خطأ أثناء توليد العرض التقديمي' : 'Failed to generate presentation',
        'error'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const currentSlide: SlideItem | null =
    activePres && activePres.slides[currentSlideIndex]
      ? activePres.slides[currentSlideIndex]
      : null;

  // Real in-browser video recording via Canvas captureStream
  const handleExportVideo = async () => {
    if (!activePres || !activePres.slides.length || isRecordingVideo) return;

    try {
      setIsRecordingVideo(true);
      setRecordingProgress(5);
      onShowToast(
        isAr
          ? '🎬 جاري تصوير العرض التقديمي كفيديو عالي الدقة (جاهز لليوتيوب والمنصات)...'
          : 'Recording high-res video for YouTube & social platforms...',
        'info'
      );

      const canvas = hiddenCanvasRef.current || document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Check MediaRecorder support
      const stream = canvas.captureStream(30); // 30 FPS
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.start();

      const slides = activePres.slides;
      const totalSlides = slides.length;
      const secondsPerSlide = 4; // 4 seconds per slide
      const fps = 30;

      // Draw loop over slides
      for (let sIdx = 0; sIdx < totalSlides; sIdx++) {
        const slide = slides[sIdx];
        const frames = secondsPerSlide * fps;

        for (let f = 0; f < frames; f++) {
          const progressInSlide = f / frames;
          // Smooth fade in
          const opacity = Math.min(1, progressInSlide * 3);

          // 1. Background gradient
          const grad = ctx.createLinearGradient(0, 0, 1280, 720);
          grad.addColorStop(0, '#0f172a');
          grad.addColorStop(0.5, '#1e293b');
          grad.addColorStop(1, '#090d16');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 1280, 720);

          // Subtle decorative glowing circles
          ctx.beginPath();
          ctx.arc(1100, 150, 180, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(200, 600, 240, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(6, 182, 212, 0.06)';
          ctx.fill();

          ctx.save();
          ctx.globalAlpha = opacity;

          // 2. Header: Lesson Topic & Slide Indicator
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 24px "IBM Plex Sans Arabic", Cairo, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`درس: ${activePres.topic}`, 1200, 60);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '20px "IBM Plex Sans Arabic", Cairo, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`الشريحة ${sIdx + 1} من ${totalSlides}`, 80, 60);

          // 3. Badge
          if (slide.badge) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.5;
            ctx.roundRect?.(1020, 95, 180, 36, 18);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#34d399';
            ctx.font = 'bold 18px "IBM Plex Sans Arabic", Cairo, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(slide.badge, 1110, 120);
          }

          // 4. Slide Title
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 40px "IBM Plex Sans Arabic", Cairo, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(slide.title, 1200, 180);

          // 5. Content bullets
          ctx.font = '24px "IBM Plex Sans Arabic", Cairo, sans-serif';
          let bulletY = 240;
          for (let b = 0; b < slide.content.length; b++) {
            ctx.fillStyle = '#10b981';
            ctx.fillText('•', 1200, bulletY);

            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(slide.content[b], 1180, bulletY);
            bulletY += 45;
          }

          // 6. Analogy Card (التشبيه الواقعي)
          if (slide.analogy) {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect?.(80, 430, 1120, 120, 16);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 22px "IBM Plex Sans Arabic", Cairo, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('💡 تشبيه واقعي لتقريب الفكرة:', 1160, 470);

            ctx.fillStyle = '#cbd5e1';
            ctx.font = '20px "IBM Plex Sans Arabic", Cairo, sans-serif';
            ctx.fillText(slide.analogy, 1160, 510);
          }

          // 7. Key Takeaway
          if (slide.keyTakeaway) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect?.(80, 580, 1120, 70, 14);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#34d399';
            ctx.font = 'bold 20px "IBM Plex Sans Arabic", Cairo, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`⭐ القاعدة الذهبية: ${slide.keyTakeaway}`, 1160, 624);
          }

          ctx.restore();

          // Bottom Progress Bar
          const overallProgress = (sIdx * frames + f) / (totalSlides * frames);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.fillRect(0, 712, 1280, 8);

          ctx.fillStyle = '#10b981';
          ctx.fillRect(0, 712, 1280 * overallProgress, 8);

          // Update progress state every 10 frames
          if (f % 10 === 0) {
            setRecordingProgress(Math.round(overallProgress * 95));
            await new Promise((r) => setTimeout(r, 10));
          }
        }
      }

      setRecordingProgress(98);
      recorder.stop();

      await new Promise<void>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const cleanTitle = activePres.topic.replace(/[^\w\u0600-\u06FF]/g, '_').slice(0, 30);
          a.download = `عرض_${cleanTitle}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          resolve();
        };
      });

      setRecordingProgress(100);
      onShowToast(
        isAr
          ? '🎉 تم تنزيل الفيديو بنجاح! جاهز للنشر على YouTube أو TikTok أو إرساله للطلاب.'
          : 'Video exported and downloaded successfully!',
        'success'
      );
    } catch (err: any) {
      console.error('Video recording failed:', err);
      onShowToast(
        isAr ? 'تعذر إتمام تصدير الفيديو على هذا المتصفح' : 'Video export failed on this device',
        'error'
      );
    } finally {
      setIsRecordingVideo(false);
      setRecordingProgress(0);
    }
  };

  const handleShareToWhatsApp = () => {
    if (!activePres) return;
    const text = `🎓 *شرح درس: ${activePres.topic}*\n\n` +
      `📝 *ملخص:* ${activePres.summary}\n\n` +
      activePres.slides
        .map((s, i) => `📌 *[شريحة ${i + 1}] ${s.title}:*\n` + s.content.map((c) => `• ${c}`).join('\n') + `\n⭐ *القاعدة الذهبية:* ${s.keyTakeaway}\n`)
        .join('\n') +
      `\nتم إعداده بواسطة FreeGen AI`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareToTelegram = () => {
    if (!activePres) return;
    const text = `🎓 شرح درس: ${activePres.topic}\n\n${activePres.summary}\n\nتطبيق FreeGen AI التعليمي`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div id="slides-tab-root" className="h-full flex flex-col bg-slate-900 overflow-hidden relative">
      {/* Hidden Canvas for Video Rendering */}
      <canvas ref={hiddenCanvasRef} className="hidden" />

      {/* Top Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Presentation className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 leading-tight">
              {isAr ? 'العروض والدروس الذكية' : 'Smart Slide Lessons'}
            </h1>
            <p className="text-[10px] text-slate-400">
              {isAr ? 'شرح وتبسيط الدروس المعقدة مع تسجيل فيديو للمنصات' : 'Explain complex lessons & export video'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {presentations.length > 0 && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{isAr ? 'السجل' : 'History'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Input Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 shadow-sm space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            {isAr ? 'ما الدرس أو المفهوم الذي تريد شرحه وتبسيطه؟' : 'Which lesson or topic do you want to explain?'}
          </label>
          <div className="relative">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder={
                isAr
                  ? 'مثلاً: نظرية النسبية، دورة كريبس، خوارزمية التشفير RSA...'
                  : 'e.g. Quantum entanglement, cellular respiration, RSA encryption...'
              }
              className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !topic.trim()}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isAr ? 'إنشاء العرض' : 'Create'}</span>
            </button>
          </div>

          {/* Preset Ideas Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
            <span className="text-slate-500 shrink-0 text-[10px]">{isAr ? 'أفكار مقترحة:' : 'Inspirations:'}</span>
            {sampleTopics.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleGenerate(s)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/60 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Video Recording Progress Banner */}
        {isRecordingVideo && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-slate-200 space-y-2 animate-pulse">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span className="flex items-center gap-1.5">
                <Video className="w-4 h-4 animate-bounce" />
                {isAr ? 'جاري تصوير ورندرة فيديو العرض التقديمي...' : 'Rendering lesson presentation video...'}
              </span>
              <span>{recordingProgress}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${recordingProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              {isAr
                ? 'سيتم تنزيل الفيديو تلقائياً فور اكتماله لترفعه إلى YouTube Shorts أو TikTok أو Reels.'
                : 'Video will download automatically for YouTube Shorts or TikTok.'}
            </p>
          </div>
        )}

        {/* Active Presentation Player */}
        {activePres && currentSlide ? (
          <div className="space-y-3">
            {/* Player Toolbar */}
            <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-400 truncate max-w-[170px]">
                  {activePres.topic}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-700">
                  {currentSlideIndex + 1} / {activePres.slides.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Auto Play */}
                <button
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                    isAutoPlaying
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title={isAr ? (isAutoPlaying ? 'إيقاف التشغيل التلقائي' : 'تشغيل تلقائي') : 'Auto Play'}
                >
                  {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>

                {/* Export to Video */}
                <button
                  onClick={handleExportVideo}
                  disabled={isRecordingVideo}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-[11px] shadow-sm transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                  title={isAr ? 'تسجيل كفيديو لليوتيوب والمنصات' : 'Export Video for YouTube'}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isAr ? 'تصدير فيديو' : 'Video'}</span>
                </button>

                {/* WhatsApp Share */}
                <button
                  onClick={handleShareToWhatsApp}
                  className="p-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                  title={isAr ? 'مشاركة عبر واتساب' : 'Share to WhatsApp'}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>

                {/* Telegram Share */}
                <button
                  onClick={handleShareToTelegram}
                  className="p-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 transition-colors cursor-pointer"
                  title={isAr ? 'مشاركة عبر تيلجرام' : 'Share to Telegram'}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Slide Card */}
            <div
              className={`rounded-3xl border border-slate-700/80 bg-gradient-to-b from-slate-800 to-slate-900 p-5 shadow-xl space-y-4 transition-all duration-300 relative overflow-hidden ${
                isFullscreen ? 'fixed inset-0 z-50 rounded-none p-8 flex flex-col justify-between overflow-y-auto' : ''
              }`}
            >
              {/* Slide Header */}
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                    {currentSlide.badge || (isAr ? 'مفهوم أساسي' : 'Core Concept')}
                  </span>
                </div>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Title */}
              <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                {currentSlide.title}
              </h2>

              {/* Bullet Points */}
              <div className="space-y-2.5">
                {currentSlide.content.map((pt, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>

              {/* Real World Analogy Card */}
              {currentSlide.analogy && (
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-amber-500/20 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تشبيه واقعي لتقريب الفكرة:' : 'Real-world analogy:'}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px] sm:text-xs">
                    {currentSlide.analogy}
                  </p>
                </div>
              )}

              {/* Golden Takeaway */}
              {currentSlide.keyTakeaway && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <span>⭐</span>
                  <span>{currentSlide.keyTakeaway}</span>
                </div>
              )}

              {/* Slide Navigation Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentSlideIndex === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 text-xs font-medium border border-slate-700 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>{isAr ? 'السابق' : 'Previous'}</span>
                </button>

                <div className="flex gap-1.5">
                  {activePres.slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        currentSlideIndex === idx ? 'w-6 bg-amber-400' : 'w-2 bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setCurrentSlideIndex((prev) => Math.min(activePres.slides.length - 1, prev + 1))}
                  disabled={currentSlideIndex === activePres.slides.length - 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 disabled:opacity-40 text-xs font-bold cursor-pointer"
                >
                  <span>{isAr ? 'التالي' : 'Next'}</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="py-12 flex flex-col items-center justify-center text-center p-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3 text-amber-400 shadow-lg shadow-amber-500/5">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">
              {isAr ? 'اشرح أي درس معقد في ثوانٍ' : 'Explain any complex lesson in seconds'}
            </h3>
            <p className="text-xs text-slate-400 max-w-[280px] mt-1">
              {isAr
                ? 'اكتب موضوع أي مادة علمية، وسيقوم الذكاء الاصطناعي بتفكيكه لشرائح تفاعلية مع حركات وإمكانية تصديره كفيديو لليوتيوب!'
                : 'Enter any subject, and AI will turn it into interactive slides with video export ready for YouTube!'}
            </p>
          </div>
        )}
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-slate-200">{isAr ? 'عروضك السابقة' : 'Saved Presentations'}</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {presentations.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setActivePres(p);
                    setCurrentSlideIndex(0);
                    setShowHistoryModal(false);
                  }}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between ${
                    activePres?.id === p.id
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="truncate max-w-[200px] font-medium">{p.topic}</span>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await storageService.deletePresentation(user.uid, p.id);
                      const updated = presentations.filter((x) => x.id !== p.id);
                      setPresentations(updated);
                      if (activePres?.id === p.id) {
                        setActivePres(updated.length > 0 ? updated[0] : null);
                      }
                    }}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
