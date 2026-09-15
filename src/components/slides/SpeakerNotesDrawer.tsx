import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Volume2,
  Sparkles,
  Edit2,
  Check,
  Copy,
  Mic,
} from 'lucide-react';
import { SlideItem } from '../../types';

interface SpeakerNotesDrawerProps {
  slide: SlideItem;
  onUpdateSlide: (slide: SlideItem) => void;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
  isLoadingAudio: boolean;
  isAr: boolean;
}

export const SpeakerNotesDrawer: React.FC<SpeakerNotesDrawerProps> = ({
  slide,
  onUpdateSlide,
  onSpeak,
  isSpeaking,
  isLoadingAudio,
  isAr,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [copied, setCopied] = useState(false);

  const script =
    slide.speechScript ||
    `${slide.title}. ${slide.content.join('. ')}. ${
      slide.analogy ? 'تشبيه لتقريب الفكرة: ' + slide.analogy : ''
    }. القاعدة الذهبية: ${slide.keyTakeaway}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-md transition-all">
      {/* Header / Toggle Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition select-none"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Mic className="w-3.5 h-3.5 text-amber-400" />
          <span>{isAr ? 'ملاحظات المحاضر والنص الإلقائي المشكول (Speaker Notes)' : 'Speaker Notes & Vocalized Script'}</span>
          {isSpeaking && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {isAr ? 'يجري الإلقاء الصوتي...' : 'Speaking...'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSpeak(script);
            }}
            disabled={isLoadingAudio}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold cursor-pointer transition active:scale-95 disabled:opacity-50"
            title={isAr ? 'استمع للشرح بالصوت الفصيح' : 'Listen to speaker notes'}
          >
            {isLoadingAudio ? (
              <Sparkles className="w-3 h-3 animate-spin text-amber-400" />
            ) : (
              <Volume2 className="w-3 h-3 text-amber-400" />
            )}
            <span>{isSpeaking ? (isAr ? 'إيقاف' : 'Stop') : (isAr ? 'استماع فصيح' : 'Listen')}</span>
          </button>

          <span className="text-slate-400 p-0.5">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </span>
        </div>
      </div>

      {/* Drawer Content */}
      {isOpen && (
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {isAr
                ? 'النص مسبوك ومشكول بالتشكيل التام ليلتزم بقواعد النحو والإعراب أثناء الإلقاء الصوتي:'
                : 'Vocalized speaker script with full Arabic diacritics for flawless TTS:'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingNotes(!isEditingNotes)}
                className="flex items-center gap-1 text-slate-300 hover:text-amber-400 transition"
              >
                {isEditingNotes ? <Check className="w-3 h-3 text-emerald-400" /> : <Edit2 className="w-3 h-3" />}
                <span>{isEditingNotes ? (isAr ? 'حفظ التعديل' : 'Done') : (isAr ? 'تعديل النص' : 'Edit')}</span>
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-slate-300 hover:text-amber-400 transition"
                title={isAr ? 'نسخ النص' : 'Copy script'}
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
              </button>
            </div>
          </div>

          {isEditingNotes ? (
            <textarea
              value={slide.speechScript || script}
              onChange={(e) => onUpdateSlide({ ...slide, speechScript: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-100 font-sans leading-relaxed outline-none focus:border-amber-500"
              rows={4}
            />
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans font-medium tracking-wide">
              {slide.speechScript || script}
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>{isAr ? 'الكلمات:' : 'Words:'} {script.split(/\s+/).filter(Boolean).length}</span>
            <span>{isAr ? 'الحروف:' : 'Characters:'} {script.length}</span>
          </div>
        </div>
      )}
    </div>
  );
};
