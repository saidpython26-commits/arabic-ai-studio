import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  Flame,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { SlideItem } from '../../types';
import { SlideCanvas } from './SlideCanvas';

interface SlideShowModalProps {
  slides: SlideItem[];
  initialIndex: number;
  onClose: () => void;
  theme: 'dark-slate' | 'light-editorial' | 'royal-navy' | 'emerald';
  isAr: boolean;
  topic: string;
  onSpeak: (text: string) => void;
  onStopSpeak: () => void;
  isSpeaking: boolean;
}

export const SlideShowModal: React.FC<SlideShowModalProps> = ({
  slides,
  initialIndex,
  onClose,
  theme,
  isAr,
  topic,
  onSpeak,
  onStopSpeak,
  isSpeaking,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [laserActive, setLaserActive] = useState(false);
  const [laserPos, setLaserPos] = useState({ x: -100, y: -100 });
  const [showNotes, setShowNotes] = useState(false);
  const [autoVoice, setAutoVoice] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showHUD, setShowHUD] = useState(true);
  const hudTimeoutRef = useRef<any>(null);

  const currentSlide = slides[currentIndex] || slides[0];

  // Live Presentation Stopwatch
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format stopwatch time
  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'l' || e.key === 'L') {
        setLaserActive((prev) => !prev);
      } else if (e.key === 'n' || e.key === 'N') {
        setShowNotes((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, slides.length]);

  // Track mouse movement for Laser Pointer & Auto-hide HUD
  const handleMouseMove = (e: React.MouseEvent) => {
    if (laserActive) {
      setLaserPos({ x: e.clientX, y: e.clientY });
    }
    setShowHUD(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setShowHUD(false);
    }, 3500);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      if (autoVoice) {
        speakSlideScript(slides[nextIdx]);
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      if (autoVoice) {
        speakSlideScript(slides[prevIdx]);
      }
    }
  };

  const speakSlideScript = (slide: SlideItem) => {
    const text =
      slide.speechScript ||
      `${slide.title}. ${slide.content.join('. ')}. ${
        slide.analogy ? 'تشبيه لتقريب الفكرة: ' + slide.analogy : ''
      }. القاعدة الذهبية: ${slide.keyTakeaway}`;
    onSpeak(text);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-center items-center overflow-hidden select-none cursor-default"
    >
      {/* Interactive Laser Pointer */}
      {laserActive && (
        <div
          className="laser-pointer"
          style={{ left: `${laserPos.x}px`, top: `${laserPos.y}px` }}
        />
      )}

      {/* Floating Speaker Notes Prompter */}
      {showNotes && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-full bg-slate-900/95 border border-amber-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-slate-100 space-y-2 animate-ppt-fade-up">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-bold text-amber-400">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span>{isAr ? 'ملاحظات المحاضر (شاشة الإلقاء):' : 'Speaker Notes:'}</span>
            </span>
            <button
              onClick={() => setShowNotes(false)}
              className="text-slate-400 hover:text-slate-100 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed max-h-56 overflow-y-auto text-slate-200">
            {currentSlide.speechScript || currentSlide.content.join(' ')}
          </p>
        </div>
      )}

      {/* 16:9 Presentation Stage Centered */}
      <div className="w-full max-w-6xl max-h-[88vh] px-4 flex items-center justify-center">
        <SlideCanvas
          slide={currentSlide}
          slideIndex={currentIndex}
          totalSlides={slides.length}
          theme={theme}
          isEditing={false}
          onUpdateSlide={() => {}}
          isAr={isAr}
          presentationTopic={topic}
          animClass={
            currentSlide.animationType === 'zoom-in'
              ? 'anim-ppt-zoom-in'
              : currentSlide.animationType === 'slide-in'
              ? 'anim-ppt-slide-in'
              : currentSlide.animationType === 'bounce-in'
              ? 'anim-ppt-bounce-in'
              : 'anim-ppt-fade-up'
          }
        />
      </div>

      {/* Modern SlideShow HUD Overlay (Auto-hiding) */}
      <div
        className={`fixed bottom-4 inset-x-0 mx-auto max-w-xl z-50 transition-all duration-300 ${
          showHUD ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-2.5 backdrop-blur-md shadow-2xl flex items-center justify-between text-xs text-slate-200">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 cursor-pointer transition"
              title={isAr ? 'الشريحة السابقة' : 'Previous Slide'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-amber-400">
              {currentIndex + 1} / {slides.length}
            </span>

            <button
              onClick={handleNext}
              disabled={currentIndex === slides.length - 1}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 cursor-pointer transition"
              title={isAr ? 'الشريحة التالية' : 'Next Slide'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Center Tools: Stopwatch & Laser */}
          <div className="flex items-center gap-2">
            {/* Stopwatch */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            {/* Laser Pointer */}
            <button
              onClick={() => setLaserActive(!laserActive)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                laserActive
                  ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-slate-100'
              }`}
              title={isAr ? 'تفعيل مؤشر الليزر الأحمر (أو اضغط L)' : 'Toggle Laser Pointer (L)'}
            >
              <Flame className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden sm:inline">{isAr ? 'ليزر' : 'Laser'}</span>
            </button>

            {/* Speaker Notes */}
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                showNotes
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-slate-100'
              }`}
              title={isAr ? 'إظهار ملاحظات المحاضر (N)' : 'Toggle Speaker Notes (N)'}
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* Voice Narration */}
            <button
              onClick={() => {
                if (isSpeaking) {
                  onStopSpeak();
                  setAutoVoice(false);
                } else {
                  speakSlideScript(currentSlide);
                  setAutoVoice(true);
                }
              }}
              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                isSpeaking
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-slate-100'
              }`}
              title={isAr ? 'شرح صوتي فصيح' : 'Voice Narration'}
            >
              {isSpeaking ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Exit Slide Show */}
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold transition cursor-pointer"
            title={isAr ? 'إنهاء العرض (Esc)' : 'Exit (Esc)'}
          >
            <X className="w-3.5 h-3.5" />
            <span>{isAr ? 'خروج' : 'Exit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
