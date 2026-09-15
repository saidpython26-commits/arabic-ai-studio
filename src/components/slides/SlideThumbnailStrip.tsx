import React from 'react';
import { Plus, Copy, Trash2, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { SlideItem } from '../../types';

interface SlideThumbnailStripProps {
  slides: SlideItem[];
  currentIndex: number;
  onSelectSlide: (index: number) => void;
  onAddSlide: () => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onMoveSlide: (index: number, direction: 'up' | 'down') => void;
  isAr: boolean;
  theme?: string;
}

export const SlideThumbnailStrip: React.FC<SlideThumbnailStripProps> = ({
  slides,
  currentIndex,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onMoveSlide,
  isAr,
}) => {
  return (
    <div className="w-48 sm:w-56 shrink-0 flex flex-col bg-slate-950/70 border-l border-slate-800/80 rounded-2xl p-2.5 overflow-hidden select-none">
      {/* Filmstrip Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400 font-medium px-1">
        <span>{isAr ? 'شريط الشرائح' : 'Slides'}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
          {slides.length}
        </span>
      </div>

      {/* Thumbnails Scrollable List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={slide.id || idx}
              onClick={() => onSelectSlide(idx)}
              className={`group relative rounded-xl border p-2 cursor-pointer transition-all duration-200 ${
                isActive
                  ? 'border-amber-400 bg-slate-900/90 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/40'
                  : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
              }`}
            >
              {/* Slide Number Badge */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {idx + 1}
                </span>

                {slide.layout && (
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">
                    {slide.layout}
                  </span>
                )}

                {/* Quick Action Hover Tools */}
                <div
                  className="hidden group-hover:flex items-center gap-0.5 bg-slate-950/90 rounded-md p-0.5 border border-slate-700 shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {idx > 0 && (
                    <button
                      onClick={() => onMoveSlide(idx, 'up')}
                      className="p-1 text-slate-400 hover:text-amber-400 rounded transition"
                      title={isAr ? 'تحريك لأعلى' : 'Move Up'}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                  )}
                  {idx < slides.length - 1 && (
                    <button
                      onClick={() => onMoveSlide(idx, 'down')}
                      className="p-1 text-slate-400 hover:text-amber-400 rounded transition"
                      title={isAr ? 'تحريك لأسفل' : 'Move Down'}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => onDuplicateSlide(idx)}
                    className="p-1 text-slate-400 hover:text-emerald-400 rounded transition"
                    title={isAr ? 'تكرار الشريحة' : 'Duplicate'}
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {slides.length > 1 && (
                    <button
                      onClick={() => onDeleteSlide(idx)}
                      className="p-1 text-slate-400 hover:text-red-400 rounded transition"
                      title={isAr ? 'حذف الشريحة' : 'Delete'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Miniature Slide Preview */}
              <div className="aspect-[16/9] w-full rounded-lg bg-slate-950/80 border border-slate-800/60 p-2 flex flex-col justify-between overflow-hidden relative">
                {/* Mini Title */}
                <div className="text-[10px] font-bold text-slate-200 line-clamp-2 leading-tight">
                  {slide.title || (isAr ? 'شريحة بدون عنوان' : 'Untitled Slide')}
                </div>

                {/* Mini Visual Elements Indicator */}
                <div className="flex items-center gap-1 mt-auto pt-1">
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400/60 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(30, (slide.content.length / 4) * 100))}%`,
                      }}
                    />
                  </div>
                  {slide.speechScript && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title={isAr ? 'مرفق صوت فصيح' : 'Has audio'} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Slide Button */}
      <button
        onClick={onAddSlide}
        className="mt-2.5 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/50 text-slate-300 hover:text-amber-300 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{isAr ? 'إضافة شريحة' : 'New Slide'}</span>
      </button>
    </div>
  );
};
