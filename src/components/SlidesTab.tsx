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
  Volume2,
  VolumeX,
  Clock,
  Wand2,
  RotateCcw,
  Zap,
  MonitorPlay,
  Palette,
  LayoutTemplate,
  Edit3,
  Check,
  Printer,
  FileCode,
  PanelLeft,
  PanelLeftClose,
  Plus,
} from 'lucide-react';
import { GeneratedPresentation, Language, SlideItem, UserProfile } from '../types';
import { storageService } from '../services/storage';
import { generateSlidesDirect } from '../services/geminiDirect';
import { slideSpeechService } from '../services/slideSpeech';
import { SlideThumbnailStrip } from './slides/SlideThumbnailStrip';
import { SlideCanvas } from './slides/SlideCanvas';
import { SpeakerNotesDrawer } from './slides/SpeakerNotesDrawer';
import { SlideShowModal } from './slides/SlideShowModal';
import { exportStandalonePresentationHtml, printPresentationSlides } from './slides/SlideExportBundle';

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

  // Studio states: Themes, Modal presentation, Editing, Filmstrip
  const [selectedTheme, setSelectedTheme] = useState<'dark-slate' | 'light-editorial' | 'royal-navy' | 'emerald'>('dark-slate');
  const [showSlideShowModal, setShowSlideShowModal] = useState(false);
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);

  // Audio Voiceover & Animation settings
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isSpeakingNow, setIsSpeakingNow] = useState(false);
  // Slide duration: customizable up to 150s per slide or total presentation up to 15 minutes!
  const [slideDurationSecs, setSlideDurationSecs] = useState<number>(20);
  const [slideAnimKey, setSlideAnimKey] = useState(0); // Forces re-trigger of CSS animations on slide change
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Step-by-step bullet appearance (PowerPoint click animation)
  const [revealedBulletsCount, setRevealedBulletsCount] = useState<number>(99);
  const [selectedAnimation, setSelectedAnimation] = useState<'fade-up' | 'zoom-in' | 'bounce-in' | 'slide-in' | 'flip'>('fade-up');

  const autoPlayTimerRef = useRef<any>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const sampleTopics = [
    isAr ? 'الفيزياء الكمية وظاهرة التشابك الكمي' : 'Quantum physics & entanglement',
    isAr ? 'دورة كريبس لإنتاج الطاقة في الخلية' : 'Krebs cycle cellular respiration',
    isAr ? 'الذكاء الاصطناعي وشبكات التعلم العميق' : 'AI & Deep neural networks',
    isAr ? 'النسبية العامة وتحدب الزمكان' : 'General relativity & spacetime curvature',
    isAr ? 'التمويل الشخصي واستراتيجية الاستثمار المركب' : 'Compound interest & financial planning',
  ];

  const currentSlide: SlideItem | null =
    activePres && activePres.slides[currentSlideIndex]
      ? activePres.slides[currentSlideIndex]
      : null;

  // Speak slide text whenever active slide changes if not muted
  useEffect(() => {
    if (!currentSlide) return;

    // Reset animations & play PowerPoint transition sound
    setSlideAnimKey((k) => k + 1);
    slideSpeechService.playSoundEffect('slide-transition');

    // Bullet staging: reset to all visible or animate step-by-step
    setRevealedBulletsCount(currentSlide.content.length);

    // Audio explanation narration
    if (!isVoiceMuted) {
      // Prioritize explicit speechScript or construct rich spoken explanation
      const narrationText =
        currentSlide.speechScript ||
        `${currentSlide.title}. ${currentSlide.content.join('. ')}. ${
          currentSlide.analogy ? 'تشبيه لتقريب الفكرة: ' + currentSlide.analogy : ''
        }. القاعدة الذهبية: ${currentSlide.keyTakeaway}`;

      setIsSpeakingNow(true);
      setIsLoadingAudio(true);
      const customKey = storageService.getCustomApiKey();

      slideSpeechService
        .speakSlide(narrationText, {
          audioUrl: currentSlide.audioUrl,
          customApiKey: customKey,
          lang: isAr ? 'ar-SA' : 'en-US',
          rate: 0.92, // Clear educator cadence
          onEnd: () => {
            setIsSpeakingNow(false);
            setIsLoadingAudio(false);
            // If auto playing, advance after audio completes
            if (isAutoPlaying && activePres) {
              setTimeout(() => {
                setCurrentSlideIndex((prev) => {
                  if (prev < activePres.slides.length - 1) {
                    return prev + 1;
                  } else {
                    setIsAutoPlaying(false);
                    return prev;
                  }
                });
              }, 1200);
            }
          },
        })
        .finally(() => {
          setIsLoadingAudio(false);
        });
    } else {
      slideSpeechService.stop();
      setIsSpeakingNow(false);
      setIsLoadingAudio(false);
    }

    return () => {
      slideSpeechService.stop();
      setIsSpeakingNow(false);
    };
  }, [currentSlideIndex, activePres, isVoiceMuted]);

  // Handle auto-play timer when voice is muted
  useEffect(() => {
    if (isAutoPlaying && isVoiceMuted && activePres && activePres.slides.length > 1) {
      autoPlayTimerRef.current = setInterval(() => {
        setCurrentSlideIndex((prev) => {
          if (prev >= activePres.slides.length - 1) {
            setIsAutoPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, slideDurationSecs * 1000);
    } else {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    }
    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, isVoiceMuted, slideDurationSecs, activePres]);

  // Manual trigger to re-read current slide
  const handleToggleVoice = () => {
    if (isSpeakingNow) {
      slideSpeechService.stop();
      setIsSpeakingNow(false);
      setIsVoiceMuted(true);
      onShowToast(isAr ? 'تم كتم الصوت' : 'Voice muted', 'info');
    } else {
      setIsVoiceMuted(false);
      onShowToast(isAr ? '🔊 تشغيل الصوت والشرح الصوتي' : 'Voice narration enabled', 'success');
      if (currentSlide) {
        const text =
          currentSlide.speechScript ||
          `${currentSlide.title}. ${currentSlide.content.join('. ')}. ${
            currentSlide.analogy ? 'تشبيه لتقريب الفكرة: ' + currentSlide.analogy : ''
          }. القاعدة الذهبية: ${currentSlide.keyTakeaway}`;
        setIsSpeakingNow(true);
        setIsLoadingAudio(true);
        const customKey = storageService.getCustomApiKey();
        slideSpeechService
          .speakSlide(text, {
            audioUrl: currentSlide.audioUrl,
            customApiKey: customKey,
            lang: isAr ? 'ar-SA' : 'en-US',
            rate: 0.92,
            onEnd: () => {
              setIsSpeakingNow(false);
              setIsLoadingAudio(false);
            },
          })
          .finally(() => {
            setIsLoadingAudio(false);
          });
      }
    }
  };

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
              slideDuration: json.slideDuration || slideDurationSecs,
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
            slideDuration: directJson.slideDuration || slideDurationSecs,
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
          isAr
            ? '✨ تم إنشاء العرض التقديمي بحركات الباوربوينت والشرح الصوتي بنجاح!'
            : 'Presentation with PPT animations & voice created successfully!',
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

  // High-res video recording with synchronized studio audio narration and customizable duration (up to 15 mins)
  const handleExportVideo = async () => {
    if (!activePres || !activePres.slides.length || isRecordingVideo) return;

    try {
      setIsRecordingVideo(true);
      setRecordingProgress(2);
      onShowToast(
        isAr
          ? '🎬 جاري إعداد الصوت الفصيح المشكول وتسجيل فيديو العرض بالمدة الكاملة...'
          : 'Preparing pristine Arabic voice & recording full-length video...',
        'info'
      );

      const customKey = storageService.getCustomApiKey();
      const slides = activePres.slides;
      const totalSlides = slides.length;

      // 1. Fetch & decode audio for each slide in parallel to guarantee audio sync
      setRecordingProgress(5);
      const audioBuffers: Array<{ duration: number; audioUrl: string } | null> = [];

      for (let i = 0; i < totalSlides; i++) {
        const slide = slides[i];
        const script =
          slide.speechScript ||
          `${slide.title}. ${slide.content.join('. ')}. ${
            slide.analogy ? 'تشبيه لتقريب الفكرة: ' + slide.analogy : ''
          }. القاعدة الذهبية: ${slide.keyTakeaway}`;

        let audioUri = slide.audioUrl || null;
        if (!audioUri) {
          try {
            audioUri = await slideSpeechService.fetchStudioTTS(script, customKey);
          } catch {
            // fallback
          }
        }

        if (audioUri) {
          // calculate approximate duration or measure via Audio element
          const estDuration = await new Promise<number>((res) => {
            const tempAudio = new Audio(audioUri!);
            tempAudio.onloadedmetadata = () => {
              res(tempAudio.duration || slideDurationSecs);
            };
            tempAudio.onerror = () => res(slideDurationSecs);
            setTimeout(() => res(slideDurationSecs), 1500);
          });
          audioBuffers.push({ duration: estDuration, audioUrl: audioUri });
        } else {
          audioBuffers.push(null);
        }
        setRecordingProgress(5 + Math.round(((i + 1) / totalSlides) * 15));
      }

      const canvas = hiddenCanvasRef.current || document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Setup Web Audio Destination to combine audio narration into the video stream!
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioDest = audioCtx.createMediaStreamDestination();

      const canvasStream = canvas.captureStream(30); // 30 FPS video stream
      // Combine video track + mixed audio track
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks(),
      ];
      const combinedStream = new MediaStream(combinedTracks);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.start(1000);

      const fps = 30;
      const msPerFrame = 1000 / fps;

      // Draw loop over slides with PowerPoint motion simulation & real-time paced frames
      for (let sIdx = 0; sIdx < totalSlides; sIdx++) {
        const slide = slides[sIdx];
        const audioInfo = audioBuffers[sIdx];

        // Determine exact slide duration: at least the configured duration or speech duration + 3s
        const calculatedSeconds = audioInfo?.duration
          ? Math.max(slideDurationSecs, Math.ceil(audioInfo.duration + 2.5))
          : slideDurationSecs;

        const frames = Math.round(calculatedSeconds * fps);

        // Play audio into the Web Audio destination for this slide
        if (audioInfo?.audioUrl) {
          try {
            const slideAudio = new Audio(audioInfo.audioUrl);
            const source = audioCtx.createMediaElementSource(slideAudio);
            source.connect(audioDest);
            // also connect to destination if needed (muted in video generator)
            slideAudio.play().catch(() => {});
          } catch {
            // ignore audio routing error
          }
        }

        const startFrameTime = performance.now();

        for (let f = 0; f < frames; f++) {
          const frameTargetTime = startFrameTime + f * msPerFrame;
          const progressInSlide = f / frames;
          // Smooth entrance easing
          const enterT = Math.min(1, progressInSlide * 3.5);
          const easedEnter = 1 - Math.pow(1 - enterT, 3);

          // 1. Background gradient
          const grad = ctx.createLinearGradient(0, 0, 1280, 720);
          grad.addColorStop(0, '#0a0f1d');
          grad.addColorStop(0.5, '#131e32');
          grad.addColorStop(1, '#080d18');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 1280, 720);

          // Decorative ambient circles
          const wobble = Math.sin(progressInSlide * Math.PI * 2) * 15;
          ctx.beginPath();
          ctx.arc(1100 + wobble, 140, 200, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(220, 580 - wobble, 260, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.07)';
          ctx.fill();

          ctx.save();
          ctx.globalAlpha = easedEnter;

          // 2. Header Bar
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 24px "IBM Plex Sans Arabic", Cairo, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`درس: ${activePres.topic}`, 1200, 60);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '20px "IBM Plex Sans Arabic", Cairo, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`الشريحة ${sIdx + 1} من ${totalSlides}`, 80, 60);

          // 3. Badge (PowerPoint Pill)
          if (slide.badge) {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect?.(1010, 95, 190, 36, 18);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 18px "IBM Plex Sans Arabic", Cairo, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(slide.badge, 1105, 120);
          }

          // 4. Slide Title with PowerPoint slide-in / zoom animation
          const titleOffsetY = (1 - easedEnter) * 25;
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 36px "IBM Plex Sans Arabic", Cairo, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(slide.title, 1200, 180 + titleOffsetY);

          // 5. Staggered Bullet Points (PowerPoint Click Appearance)
          ctx.font = '24px "IBM Plex Sans Arabic", Cairo, sans-serif';
          let bulletY = 240;
          for (let b = 0; b < slide.content.length; b++) {
            const bulletTriggerTime = 0.12 + b * 0.15;
            const bulletProgress = Math.max(0, Math.min(1, (progressInSlide - bulletTriggerTime) * 4));

            if (bulletProgress > 0) {
              ctx.save();
              ctx.globalAlpha = bulletProgress;
              const bulletSlideX = (1 - bulletProgress) * 30;

              ctx.fillStyle = '#f59e0b';
              ctx.fillText('•', 1200 + bulletSlideX, bulletY);

              ctx.fillStyle = '#e2e8f0';
              ctx.fillText(slide.content[b], 1180 + bulletSlideX, bulletY);
              ctx.restore();
            }
            bulletY += 45;
          }

          // 6. Analogy Card (التشبيه الواقعي)
          const analogyTriggerTime = 0.42;
          if (slide.analogy && progressInSlide > analogyTriggerTime) {
            const aProgress = Math.min(1, (progressInSlide - analogyTriggerTime) * 3);
            ctx.save();
            ctx.globalAlpha = aProgress;
            ctx.fillStyle = 'rgba(23, 33, 53, 0.92)';
            ctx.strokeStyle = '#f59e0b44';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect?.(80, 420, 1120, 125, 16);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 22px "IBM Plex Sans Arabic", Cairo, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('💡 تشبيه واقعي لتقريب الفكرة:', 1160, 460);

            ctx.fillStyle = '#cbd5e1';
            ctx.font = '20px "IBM Plex Sans Arabic", Cairo, sans-serif';
            ctx.fillText(slide.analogy, 1160, 500);
            ctx.restore();
          }

          // 7. Key Takeaway (القاعدة الذهبية)
          const keyTriggerTime = 0.68;
          if (slide.keyTakeaway && progressInSlide > keyTriggerTime) {
            const kProgress = Math.min(1, (progressInSlide - keyTriggerTime) * 3);
            ctx.save();
            ctx.globalAlpha = kProgress;
            ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect?.(80, 575, 1120, 75, 14);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#34d399';
            ctx.font = 'bold 21px "IBM Plex Sans Arabic", Cairo, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`⭐ القاعدة الذهبية: ${slide.keyTakeaway}`, 1160, 622);
            ctx.restore();
          }

          ctx.restore();

          // Bottom Progress Bar
          const overallProgress = (sIdx * frames + f) / (totalSlides * frames);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.fillRect(0, 712, 1280, 8);

          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(0, 712, 1280 * overallProgress, 8);

          // Pacing delay to keep video recording synchronized with real-time audio playback
          const now = performance.now();
          const delay = Math.max(2, frameTargetTime - now);
          await new Promise((r) => setTimeout(r, delay));

          if (f % 20 === 0) {
            setRecordingProgress(20 + Math.round(overallProgress * 76));
          }
        }
      }

      setRecordingProgress(97);
      recorder.stop();

      await new Promise<void>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const cleanTitle = activePres.topic.replace(/[^\w\u0600-\u06FF]/g, '_').slice(0, 30);
          a.download = `شرح_فيديو_${cleanTitle}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          audioCtx.close().catch(() => {});
          resolve();
        };
      });

      setRecordingProgress(100);
      onShowToast(
        isAr
          ? '🎉 تم إنتاج وتنزيل فيديو الدرس مع الصوت الفصيح المشكول والحركات بنجاح!'
          : 'Video exported with studio Arabic voice & animations!',
        'success'
      );
    } catch (err: any) {
      console.error('Video recording failed:', err);
      onShowToast(
        isAr ? 'فشل تصدير الفيديو: ' + (err?.message || '') : 'Failed to export presentation video',
        'error'
      );
    } finally {
      setIsRecordingVideo(false);
      setRecordingProgress(0);
    }
  };

  const handleShareToWhatsApp = () => {
    if (!activePres) return;
    const text =
      `🎓 *شرح درس: ${activePres.topic}*\n\n` +
      `📝 *ملخص:* ${activePres.summary}\n\n` +
      activePres.slides
        .map(
          (s, i) =>
            `📌 *[شريحة ${i + 1}] ${s.title}:*\n` +
            s.content.map((c) => `• ${c}`).join('\n') +
            `\n⭐ *القاعدة الذهبية:* ${s.keyTakeaway}\n`
        )
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

  // Add a new blank slide
  const handleAddSlide = () => {
    if (!activePres) return;
    const newSlide: SlideItem = {
      id: `slide_${Date.now()}`,
      title: isAr ? 'شريحة تعليمية جديدة' : 'New Explanatory Slide',
      badge: isAr ? 'مفهوم رئيسي' : 'Key Concept',
      layout: 'focus',
      content: [
        isAr ? 'نقطة توضيحية أولى تدعم فهم المفهوم' : 'Key explanatory point 1',
        isAr ? 'نقطة توضيحية ثانية لتفصيل الفكرة' : 'Key explanatory point 2',
      ],
      analogy: isAr ? 'تشبيه واقعي لتقريب الفكرة للأذهان' : 'Real-world practical analogy',
      keyTakeaway: isAr ? 'القاعدة الذهبية التي تلخص المفهوم' : 'Golden takeaway',
      speechScript: isAr
        ? 'هَذِهِ شَرِيحَةٌ جَدِيدَةٌ تَتَنَاوَلُ المَفْهُومَ بِأُسْلُوبٍ فَرِيدٍ وَمُبَسَّطٍ.'
        : 'This is a new slide explaining this concept.',
    };
    const updatedSlides = [...activePres.slides, newSlide];
    const updatedPres = { ...activePres, slides: updatedSlides };
    setActivePres(updatedPres);
    setCurrentSlideIndex(updatedSlides.length - 1);
    storageService.savePresentation(user.uid, updatedPres);
    onShowToast(isAr ? 'تمت إضافة شريحة جديدة' : 'New slide added', 'success');
  };

  // Duplicate slide
  const handleDuplicateSlide = (index: number) => {
    if (!activePres) return;
    const target = activePres.slides[index];
    if (!target) return;
    const duplicated: SlideItem = {
      ...target,
      id: `slide_${Date.now()}`,
      title: `${target.title} (${isAr ? 'نسخة' : 'Copy'})`,
    };
    const updatedSlides = [...activePres.slides];
    updatedSlides.splice(index + 1, 0, duplicated);
    const updatedPres = { ...activePres, slides: updatedSlides };
    setActivePres(updatedPres);
    setCurrentSlideIndex(index + 1);
    storageService.savePresentation(user.uid, updatedPres);
    onShowToast(isAr ? 'تم تكرار الشريحة' : 'Slide duplicated', 'success');
  };

  // Delete slide
  const handleDeleteSlide = (index: number) => {
    if (!activePres || activePres.slides.length <= 1) {
      onShowToast(isAr ? 'لا يمكن حذف الشريحة الأخيرة' : 'Cannot delete the only slide', 'error');
      return;
    }
    const updatedSlides = activePres.slides.filter((_, i) => i !== index);
    const updatedPres = { ...activePres, slides: updatedSlides };
    setActivePres(updatedPres);
    setCurrentSlideIndex((prev) => Math.min(prev, updatedSlides.length - 1));
    storageService.savePresentation(user.uid, updatedPres);
    onShowToast(isAr ? 'تم حذف الشريحة' : 'Slide deleted', 'info');
  };

  // Move slide up/down
  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    if (!activePres) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= activePres.slides.length) return;
    const updatedSlides = [...activePres.slides];
    const [removed] = updatedSlides.splice(index, 1);
    updatedSlides.splice(targetIdx, 0, removed);
    const updatedPres = { ...activePres, slides: updatedSlides };
    setActivePres(updatedPres);
    setCurrentSlideIndex(targetIdx);
    storageService.savePresentation(user.uid, updatedPres);
  };

  // Update slide in-place
  const handleUpdateSlide = (updatedSlide: SlideItem) => {
    if (!activePres) return;
    const updatedSlides = activePres.slides.map((s, idx) =>
      idx === currentSlideIndex ? updatedSlide : s
    );
    const updatedPres = { ...activePres, slides: updatedSlides };
    setActivePres(updatedPres);
    storageService.savePresentation(user.uid, updatedPres);
  };

  // Change layout
  const handleChangeLayout = (layout: 'hero' | 'two-column' | 'three-card' | 'quote' | 'focus') => {
    if (!currentSlide) return;
    handleUpdateSlide({ ...currentSlide, layout });
    onShowToast(isAr ? `تم تغيير التخطيط إلى: ${layout}` : `Layout changed to ${layout}`, 'info');
  };

  // Export standalone HTML bundle
  const handleExportHtml = () => {
    if (!activePres) return;
    exportStandalonePresentationHtml(activePres, selectedTheme);
    onShowToast(isAr ? 'تم تنزيل العرض كصفحة ويب تفاعلية مستقلة!' : 'Exported as standalone interactive HTML!', 'success');
  };

  // Print slides / export PDF
  const handlePrintSlides = () => {
    if (!activePres) return;
    onShowToast(isAr ? 'جاري فتح نافذة الطباعة وحفظ PDF...' : 'Opening print & PDF dialog...', 'info');
    printPresentationSlides();
  };

  // Shared speaker speech trigger
  const handleSpeakSlideText = (text?: string) => {
    const targetText =
      text ||
      (currentSlide
        ? currentSlide.speechScript ||
          `${currentSlide.title}. ${currentSlide.content.join('. ')}. ${
            currentSlide.analogy ? 'تشبيه لتقريب الفكرة: ' + currentSlide.analogy : ''
          }. القاعدة الذهبية: ${currentSlide.keyTakeaway}`
        : '');
    if (!targetText) return;

    setIsSpeakingNow(true);
    setIsLoadingAudio(true);
    const customKey = storageService.getCustomApiKey();
    slideSpeechService
      .speakSlide(targetText, {
        audioUrl: currentSlide?.audioUrl,
        customApiKey: customKey,
        lang: isAr ? 'ar-SA' : 'en-US',
        rate: 0.92,
        onEnd: () => {
          setIsSpeakingNow(false);
          setIsLoadingAudio(false);
        },
      })
      .finally(() => {
        setIsLoadingAudio(false);
      });
  };

  // Determine current active animation CSS class
  const animClass =
    currentSlide?.animationType === 'zoom-in'
      ? 'anim-ppt-zoom-in'
      : currentSlide?.animationType === 'bounce-in'
      ? 'anim-ppt-bounce-in'
      : currentSlide?.animationType === 'slide-in'
      ? 'anim-ppt-slide-in'
      : currentSlide?.animationType === 'flip'
      ? 'anim-ppt-flip'
      : selectedAnimation === 'zoom-in'
      ? 'anim-ppt-zoom-in'
      : selectedAnimation === 'bounce-in'
      ? 'anim-ppt-bounce-in'
      : selectedAnimation === 'slide-in'
      ? 'anim-ppt-slide-in'
      : selectedAnimation === 'flip'
      ? 'anim-ppt-flip'
      : 'anim-ppt-fade-up';

  return (
    <div id="slides-tab-root" className="h-full flex flex-col bg-slate-900 overflow-hidden relative">
      {/* Hidden Canvas for Video Rendering */}
      <canvas ref={hiddenCanvasRef} className="hidden" />

      {/* Top Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-inner">
            <Presentation className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 leading-tight flex items-center gap-1.5">
              <span>{isAr ? 'العروض التقديمية والشرح الصوتي' : 'Voice Explainer & PPT Slides'}</span>
              <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {isAr ? 'صوت + حركات' : 'Voice + Motion'}
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">
              {isAr ? 'شرح صوتي فوري، حركات باوربوينت، وتصدير فيديو كامل للمنصات' : 'Aloud voice narration & PowerPoint motion graphics'}
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
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-300">
              {isAr ? 'ما الدرس أو المفهوم الذي تريد شرحه بصوت وحركات باوربوينت؟' : 'Which lesson to explain with voice narration?'}
            </label>
            <span className="text-[10px] text-amber-400/90 font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {isAr ? 'توليد ذكي + شرح مسموع' : 'AI Speech & PPT Motion'}
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder={
                isAr
                  ? 'مثلاً: نظرية النسبية، دورة كريبس، خوارزمية RSA، التسويق الفيروسي...'
                  : 'e.g. Quantum entanglement, Krebs cycle, RSA encryption, viral marketing...'
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
              <span>{isAr ? 'إنشاء العرض الصوتي' : 'Create'}</span>
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
                {isAr ? 'جاري تصوير ورندرة فيديو العرض التقديمي بالمدة الكاملة...' : 'Rendering high-definition animated video...'}
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
                ? `المدة المخصصة لكل شريحة في الفيديو: ${slideDurationSecs} ثانية لضمان ظهور كامل الحركات والشرح.`
                : `Slide pacing: ${slideDurationSecs}s per slide for full visual clarity.`}
            </p>
          </div>
        )}

        {/* Active Presentation Studio */}
        {activePres && currentSlide ? (
          <div className="space-y-4">
            {/* Control & Studio Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-800/90 p-3 rounded-2xl border border-slate-700/80 text-xs shadow-lg">
              {/* Left group: Topic, Slide Count & Filmstrip toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowThumbnails(!showThumbnails)}
                  className={`p-1.5 rounded-xl border transition cursor-pointer ${
                    showThumbnails
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title={isAr ? 'إظهار / إخفاء شريط الشرائح الجانبي' : 'Toggle Filmstrip'}
                >
                  {showThumbnails ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                </button>

                <span className="font-bold text-amber-400 truncate max-w-[140px] sm:max-w-[200px]">
                  {activePres.topic}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-700 font-mono">
                  {currentSlideIndex + 1} / {activePres.slides.length}
                </span>
              </div>

              {/* Center/Right Toolbar controls */}
              <div className="flex items-center flex-wrap gap-1.5">
                {/* Presentation Fullscreen Mode with Laser pointer & timer */}
                <button
                  onClick={() => setShowSlideShowModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
                  title={isAr ? 'بدء العرض التقديمي المباشر مع مؤشر الليزر والتحكم الاحترافي' : 'Start SlideShow with Laser & HUD'}
                >
                  <MonitorPlay className="w-4 h-4" />
                  <span>{isAr ? 'عرض ملء الشاشة' : 'Present'}</span>
                </button>

                {/* Edit Slide Mode Toggle */}
                <button
                  onClick={() => {
                    const next = !isEditingSlide;
                    setIsEditingSlide(next);
                    if (next) {
                      onShowToast(isAr ? 'وضع التعديل مفعل: يمكنك تعديل النصوص مباشرة في الشريحة' : 'Edit mode enabled', 'info');
                    } else {
                      onShowToast(isAr ? 'تم حفظ تعديلات الشريحة' : 'Changes saved', 'success');
                    }
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    isEditingSlide
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title={isAr ? 'تعديل نصوص وتصميم الشريحة' : 'Edit Slide Content'}
                >
                  {isEditingSlide ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Edit3 className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{isEditingSlide ? (isAr ? 'تم التعديل' : 'Done') : (isAr ? 'تعديل' : 'Edit')}</span>
                </button>

                {/* Theme Selector */}
                <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700 text-[11px]">
                  <Palette className="w-3 h-3 text-amber-400" />
                  <select
                    value={selectedTheme}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setSelectedTheme(t);
                      if (activePres) {
                        const updated = { ...activePres, theme: t };
                        setActivePres(updated);
                        storageService.savePresentation(user.uid, updated);
                      }
                      onShowToast(isAr ? 'تم تغيير مظهر العرض التقديمي' : 'Theme updated', 'info');
                    }}
                    className="bg-transparent text-slate-200 outline-none cursor-pointer text-[10px]"
                    title={isAr ? 'نمط الألوان والثيم' : 'Presentation theme'}
                  >
                    <option value="dark-slate" className="bg-slate-900">{isAr ? 'أسود فاحم (Dark Slate)' : 'Dark Slate'}</option>
                    <option value="light-editorial" className="bg-slate-900">{isAr ? 'ورقي فاتح (Editorial)' : 'Editorial Light'}</option>
                    <option value="royal-navy" className="bg-slate-900">{isAr ? 'أزرق ملكي (Royal Navy)' : 'Royal Navy'}</option>
                    <option value="emerald" className="bg-slate-900">{isAr ? 'زمردي أكاديمي (Emerald)' : 'Emerald'}</option>
                  </select>
                </div>

                {/* Layout Selector */}
                <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700 text-[11px]">
                  <LayoutTemplate className="w-3 h-3 text-sky-400" />
                  <select
                    value={currentSlide.layout || 'focus'}
                    onChange={(e) => handleChangeLayout(e.target.value as any)}
                    className="bg-transparent text-slate-200 outline-none cursor-pointer text-[10px]"
                    title={isAr ? 'تخطيط عناصر الشريحة' : 'Slide Layout'}
                  >
                    <option value="focus" className="bg-slate-900">{isAr ? 'تخطيط مركّز (Focus)' : 'Focus'}</option>
                    <option value="two-column" className="bg-slate-900">{isAr ? 'عمودان متوازيان (2-Col)' : '2 Columns'}</option>
                    <option value="three-card" className="bg-slate-900">{isAr ? 'ثلاث بطاقات (3-Card)' : '3 Cards'}</option>
                    <option value="hero" className="bg-slate-900">{isAr ? 'عنوان عريض (Hero)' : 'Hero'}</option>
                    <option value="quote" className="bg-slate-900">{isAr ? 'اقتباس بارز (Quote)' : 'Quote'}</option>
                  </select>
                </div>

                {/* Voice Narration toggle */}
                <button
                  onClick={handleToggleVoice}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isLoadingAudio
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                      : isSpeakingNow
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                      : isVoiceMuted
                      ? 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                  title={isAr ? 'تشغيل / إيقاف الشرح الصوتي الذكي' : 'Toggle AI Voice Narration'}
                >
                  {isLoadingAudio ? (
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  ) : isVoiceMuted ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isLoadingAudio
                      ? isAr
                        ? 'توليد الصوت...'
                        : 'Audio...'
                      : isSpeakingNow
                      ? isAr
                        ? 'يشرح...'
                        : 'Speaking...'
                      : isVoiceMuted
                      ? isAr
                        ? 'مكتوم'
                        : 'Muted'
                      : isAr
                      ? 'صوت فصيح'
                      : 'Voice ON'}
                  </span>
                </button>

                {/* Replay audio */}
                <button
                  onClick={() => handleSpeakSlideText()}
                  className="flex items-center gap-1 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 cursor-pointer"
                  title={isAr ? 'إعادة قراءة الشرح بالصوت الفصيح' : 'Replay audio narration'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Animation Type Switcher */}
                <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700 text-[11px]">
                  <Wand2 className="w-3 h-3 text-amber-400" />
                  <select
                    value={selectedAnimation}
                    onChange={(e) => {
                      setSelectedAnimation(e.target.value as any);
                      setSlideAnimKey((k) => k + 1);
                      slideSpeechService.playSoundEffect('slide-transition');
                    }}
                    className="bg-transparent text-slate-200 outline-none cursor-pointer text-[10px]"
                    title={isAr ? 'نمط حركة الباوربوينت' : 'PPT Transition style'}
                  >
                    <option value="fade-up" className="bg-slate-900">{isAr ? 'صعود (Fade Up)' : 'Fade Up'}</option>
                    <option value="zoom-in" className="bg-slate-900">{isAr ? 'تقريب (Zoom In)' : 'Zoom In'}</option>
                    <option value="bounce-in" className="bg-slate-900">{isAr ? 'ارتداد (Bounce)' : 'Bounce'}</option>
                    <option value="slide-in" className="bg-slate-900">{isAr ? 'انزلاق (Slide In)' : 'Slide In'}</option>
                    <option value="flip" className="bg-slate-900">{isAr ? 'تقليب 3D (Flip)' : '3D Flip'}</option>
                  </select>
                </div>

                {/* Slide Duration Configurator */}
                <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700 text-[11px]" title={isAr ? 'مدة عرض كل شريحة بالثواني' : 'Slide duration'}>
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <select
                    value={slideDurationSecs}
                    onChange={(e) => setSlideDurationSecs(Number(e.target.value))}
                    className="bg-transparent text-slate-200 outline-none cursor-pointer text-[10px]"
                  >
                    <option value={10} className="bg-slate-900">10s ({isAr ? 'سريع' : 'Fast'})</option>
                    <option value={15} className="bg-slate-900">15s ({isAr ? 'متوسط' : 'Medium'})</option>
                    <option value={25} className="bg-slate-900">25s ({isAr ? 'شرح طويل' : 'Long'})</option>
                    <option value={45} className="bg-slate-900">45s ({isAr ? 'مفصل 3-5د' : 'Deep 3-5m'})</option>
                    <option value={90} className="bg-slate-900">90s ({isAr ? 'محاضرة 7-10د' : 'Lecture 7-10m'})</option>
                    <option value={150} className="bg-slate-900">150s ({isAr ? 'شامل حتى 15د' : 'Full up to 15m'})</option>
                  </select>
                </div>

                {/* Auto Play */}
                <button
                  onClick={() => {
                    const next = !isAutoPlaying;
                    setIsAutoPlaying(next);
                    if (next) {
                      onShowToast(isAr ? 'تم بدء العرض التلقائي' : 'Auto play started', 'info');
                    }
                  }}
                  className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                    isAutoPlaying
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
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
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-[11px] shadow-sm transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                  title={isAr ? 'تسجيل كفيديو عالي الدقة مع الحركات والصوت' : 'Export Full Synced Video'}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isAr ? 'فيديو' : 'Video'}</span>
                </button>

                {/* Standalone Interactive HTML Export */}
                <button
                  onClick={handleExportHtml}
                  className="flex items-center gap-1 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-700 transition cursor-pointer"
                  title={isAr ? 'تصدير كملف HTML تفاعلي مستقل يعمل بدون إنترنت' : 'Export Standalone HTML'}
                >
                  <FileCode className="w-3.5 h-3.5" />
                </button>

                {/* Print / PDF Export */}
                <button
                  onClick={handlePrintSlides}
                  className="flex items-center gap-1 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-400 border border-slate-700 transition cursor-pointer"
                  title={isAr ? 'طباعة أو حفظ بصيغة PDF' : 'Print or Export PDF'}
                >
                  <Printer className="w-3.5 h-3.5" />
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

            {/* Studio Workspace: Filmstrip Sidebar + Canvas Stage + Speaker Notes */}
            <div className="flex flex-col lg:flex-row gap-4 items-start">
              {/* Filmstrip Left Panel */}
              {showThumbnails && (
                <div className="w-full lg:w-56 shrink-0">
                  <SlideThumbnailStrip
                    slides={activePres.slides}
                    currentIndex={currentSlideIndex}
                    onSelectSlide={(idx) => {
                      slideSpeechService.stop();
                      setCurrentSlideIndex(idx);
                    }}
                    onAddSlide={handleAddSlide}
                    onDuplicateSlide={handleDuplicateSlide}
                    onDeleteSlide={handleDeleteSlide}
                    onMoveSlide={handleMoveSlide}
                    isAr={isAr}
                    theme={selectedTheme}
                  />
                </div>
              )}

              {/* Main Presentation Stage */}
              <div className="flex-1 w-full space-y-3 min-w-0">
                {/* 16:9 Canvas Stage */}
                <div key={`${currentSlideIndex}_${slideAnimKey}`} className="w-full">
                  <SlideCanvas
                    slide={currentSlide}
                    slideIndex={currentSlideIndex}
                    totalSlides={activePres.slides.length}
                    theme={selectedTheme}
                    isEditing={isEditingSlide}
                    onUpdateSlide={handleUpdateSlide}
                    isAr={isAr}
                    animClass={animClass}
                    presentationTopic={activePres.topic}
                  />
                </div>

                {/* Quick Navigation Control Bar */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700/70 text-xs">
                  <button
                    onClick={() => {
                      slideSpeechService.stop();
                      setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
                    }}
                    disabled={currentSlideIndex === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-300 disabled:opacity-40 font-medium border border-slate-700 cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>{isAr ? 'السابق' : 'Previous'}</span>
                  </button>

                  <div className="flex gap-1.5 items-center max-w-[200px] sm:max-w-xs overflow-x-auto py-1 px-2">
                    {activePres.slides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          slideSpeechService.stop();
                          setCurrentSlideIndex(idx);
                        }}
                        className={`h-2.5 rounded-full transition-all cursor-pointer shrink-0 ${
                          currentSlideIndex === idx
                            ? 'w-7 bg-amber-400 shadow-sm shadow-amber-500/50'
                            : 'w-2.5 bg-slate-700 hover:bg-slate-600'
                        }`}
                        title={`${isAr ? 'شريحة' : 'Slide'} ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddSlide}
                      className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-amber-400 border border-slate-700 cursor-pointer text-xs"
                      title={isAr ? 'إضافة شريحة جديدة' : 'Add New Slide'}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إضافة شريحة' : 'Add'}</span>
                    </button>

                    <button
                      onClick={() => {
                        slideSpeechService.stop();
                        setCurrentSlideIndex((prev) => Math.min(activePres.slides.length - 1, prev + 1));
                      }}
                      disabled={currentSlideIndex === activePres.slides.length - 1}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 disabled:opacity-40 font-bold cursor-pointer transition-colors shadow-sm"
                    >
                      <span>{isAr ? 'التالي' : 'Next'}</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Speaker Notes Drawer (With Tashkeel Vocalized Script) */}
                <SpeakerNotesDrawer
                  slide={currentSlide}
                  onUpdateSlide={handleUpdateSlide}
                  onSpeak={(text) => handleSpeakSlideText(text)}
                  isSpeaking={isSpeakingNow}
                  isLoadingAudio={isLoadingAudio}
                  isAr={isAr}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="py-12 flex flex-col items-center justify-center text-center p-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3 text-amber-400 shadow-lg shadow-amber-500/5">
              <Presentation className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">
              {isAr ? 'عروض تفاعلية مع شرح صوتي وحركات كالباوربوينت' : 'Interactive Slides with Voice & PowerPoint Motions'}
            </h3>
            <p className="text-xs text-slate-400 max-w-[320px] mt-1.5 leading-relaxed">
              {isAr
                ? 'أدخل أي درس تريده، وسيقوم النظام بتفكيكه لشرائح ذكية وشرح صوتي مسموع لكل شريحة مع حركات بصرية قابلة للتخصيص والتصدير كفيديو طويل للمنصات!'
                : 'Enter any topic to get voice-narrated slides with PowerPoint motion transitions & long video export ready!'}
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
                onClick={() => {
                  slideSpeechService.stop();
                  setShowHistoryModal(false);
                }}
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
                    slideSpeechService.stop();
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

      {/* Full-Screen Presentation Mode Modal with Laser Pointer and Speaker HUD */}
      {showSlideShowModal && activePres && (
        <SlideShowModal
          slides={activePres.slides}
          initialIndex={currentSlideIndex}
          onClose={() => {
            slideSpeechService.stop();
            setShowSlideShowModal(false);
          }}
          theme={selectedTheme}
          isAr={isAr}
          topic={activePres.topic}
          onSpeak={(text) => handleSpeakSlideText(text)}
          onStopSpeak={() => {
            slideSpeechService.stop();
            setIsSpeakingNow(false);
          }}
          isSpeaking={isSpeakingNow}
        />
      )}
    </div>
  );
};
