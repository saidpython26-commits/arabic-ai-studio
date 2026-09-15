import React from 'react';
import {
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Quote,
  Layers,
  Columns,
  Star,
  Award,
  BookOpen,
} from 'lucide-react';
import { SlideItem } from '../../types';

interface SlideCanvasProps {
  slide: SlideItem;
  slideIndex: number;
  totalSlides: number;
  theme: 'dark-slate' | 'light-editorial' | 'royal-navy' | 'emerald';
  isEditing: boolean;
  onUpdateSlide: (updatedSlide: SlideItem) => void;
  isAr: boolean;
  animClass?: string;
  presentationTopic?: string;
}

export const SlideCanvas: React.FC<SlideCanvasProps> = ({
  slide,
  slideIndex,
  totalSlides,
  theme,
  isEditing,
  onUpdateSlide,
  isAr,
  animClass = 'anim-ppt-fade-up',
  presentationTopic = '',
}) => {
  // Theme color palette definitions
  const themeStyles = {
    'dark-slate': {
      bg: 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-slate-100',
      border: 'border-slate-800',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      cardBg: 'bg-slate-900/70 border-slate-800',
      cardHover: 'hover:border-amber-500/40',
      analogyBg: 'bg-amber-950/30 border-amber-500/30 text-slate-200',
      takeawayBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
      bulletIcon: 'text-amber-400',
      titleColor: 'text-white',
      subtitleColor: 'text-slate-400',
      footerColor: 'text-slate-500',
    },
    'light-editorial': {
      bg: 'bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 shadow-xl',
      border: 'border-slate-200',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
      cardBg: 'bg-white/95 border-slate-200 shadow-sm',
      cardHover: 'hover:border-indigo-400',
      analogyBg: 'bg-amber-50 border-amber-300/80 text-amber-950',
      takeawayBg: 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold',
      bulletIcon: 'text-indigo-600',
      titleColor: 'text-slate-900 font-extrabold',
      subtitleColor: 'text-slate-600',
      footerColor: 'text-slate-400',
    },
    'royal-navy': {
      bg: 'bg-gradient-to-br from-[#0a192f] via-[#0f2744] to-[#071322] text-slate-100',
      border: 'border-blue-900/60',
      badge: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
      cardBg: 'bg-[#0f243e]/80 border-blue-900/50',
      cardHover: 'hover:border-amber-400/50',
      analogyBg: 'bg-amber-950/40 border-amber-400/30 text-slate-100',
      takeawayBg: 'bg-blue-600/20 border-blue-400/40 text-blue-200',
      bulletIcon: 'text-amber-400',
      titleColor: 'text-white',
      subtitleColor: 'text-blue-200/80',
      footerColor: 'text-blue-300/50',
    },
    emerald: {
      bg: 'bg-gradient-to-br from-[#022c22] via-[#064e3b] to-[#02241b] text-slate-100',
      border: 'border-emerald-800/60',
      badge: 'bg-emerald-400/20 text-emerald-200 border-emerald-400/40',
      cardBg: 'bg-[#064e3b]/50 border-emerald-800/50',
      cardHover: 'hover:border-emerald-400/50',
      analogyBg: 'bg-emerald-950/60 border-emerald-400/30 text-slate-100',
      takeawayBg: 'bg-emerald-400/20 border-emerald-300/40 text-emerald-200',
      bulletIcon: 'text-emerald-400',
      titleColor: 'text-white',
      subtitleColor: 'text-emerald-200/80',
      footerColor: 'text-emerald-300/50',
    },
  }[theme];

  const effectiveLayout = slide.layout || (slideIndex === 0 ? 'hero' : 'focus');

  // Handle in-place editing
  const handleContentChange = (index: number, val: string) => {
    const updated = [...slide.content];
    updated[index] = val;
    onUpdateSlide({ ...slide, content: updated });
  };

  const handleAddBullet = () => {
    onUpdateSlide({ ...slide, content: [...slide.content, 'نقطة توضيحية جديدة'] });
  };

  const handleRemoveBullet = (index: number) => {
    const updated = slide.content.filter((_, i) => i !== index);
    onUpdateSlide({ ...slide, content: updated });
  };

  return (
    <div
      className={`w-full aspect-[16/9] rounded-2xl sm:rounded-3xl border ${themeStyles.border} ${themeStyles.bg} p-6 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 ${animClass}`}
    >
      {/* Decorative Slide Background Ambience */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-black/10 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Slide Top Bar */}
      <div className="flex items-center justify-between relative z-10 border-b pb-3 border-current/10">
        <div className="flex items-center gap-3">
          {isEditing ? (
            <input
              type="text"
              value={slide.badge || ''}
              onChange={(e) => onUpdateSlide({ ...slide, badge: e.target.value })}
              placeholder={isAr ? 'شارة الشريحة' : 'Badge'}
              className="px-3 py-1 rounded-full text-xs font-bold bg-black/20 border border-current/20 outline-none text-current"
            />
          ) : (
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border tracking-wide flex items-center gap-1.5 ${themeStyles.badge}`}
            >
              <Sparkles className="w-3 h-3" />
              <span>{slide.badge || (isAr ? 'مفهوم رئيسي' : 'Core Concept')}</span>
            </span>
          )}

          {presentationTopic && (
            <span className={`text-xs hidden sm:inline ${themeStyles.subtitleColor} truncate max-w-[240px]`}>
              {presentationTopic}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-bold opacity-80">
          <span>{slideIndex + 1}</span>
          <span>/</span>
          <span>{totalSlides}</span>
        </div>
      </div>

      {/* Main Slide Body Rendering Based on Layout */}
      <div className="my-auto py-3 relative z-10">
        {/* LAYOUT 1: HERO / TITLE SLIDE */}
        {effectiveLayout === 'hero' && (
          <div className="space-y-4 max-w-3xl">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={slide.title}
                  onChange={(e) => onUpdateSlide({ ...slide, title: e.target.value })}
                  className="w-full text-2xl sm:text-4xl font-black bg-black/20 border border-current/20 p-2 rounded-xl text-current outline-none"
                  placeholder={isAr ? 'عنوان العرض التقديمي' : 'Title'}
                />
                <input
                  type="text"
                  value={slide.subtitle || ''}
                  onChange={(e) => onUpdateSlide({ ...slide, subtitle: e.target.value })}
                  className="w-full text-sm sm:text-lg bg-black/20 border border-current/20 p-2 rounded-xl text-current outline-none"
                  placeholder={isAr ? 'عنوان فرعي يوضح مسار العرض التقديمي' : 'Subtitle'}
                />
              </div>
            ) : (
              <div>
                <h1 className={`text-2xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight ${themeStyles.titleColor}`}>
                  {slide.title}
                </h1>
                {slide.subtitle && (
                  <p className={`text-sm sm:text-lg mt-2 font-medium leading-relaxed ${themeStyles.subtitleColor}`}>
                    {slide.subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Quick Hero Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {slide.content.slice(0, 3).map((pt, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-2xl border ${themeStyles.cardBg} ${themeStyles.cardHover} transition-colors text-xs leading-relaxed font-medium flex items-start gap-2 shadow-sm`}
                >
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    0{i + 1}
                  </span>
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LAYOUT 2: TWO-COLUMN COMPARATIVE */}
        {effectiveLayout === 'two-column' && (
          <div className="space-y-4">
            {isEditing ? (
              <input
                type="text"
                value={slide.title}
                onChange={(e) => onUpdateSlide({ ...slide, title: e.target.value })}
                className="w-full text-xl sm:text-3xl font-black bg-black/20 border border-current/20 p-2 rounded-xl text-current outline-none"
              />
            ) : (
              <h2 className={`text-xl sm:text-3xl font-black leading-snug ${themeStyles.titleColor}`}>
                {slide.title}
              </h2>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Column 1: Principles & Content */}
              <div className={`p-4 rounded-2xl border ${themeStyles.cardBg} space-y-2.5 shadow-sm`}>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-current/80">
                  <Columns className="w-3.5 h-3.5" />
                  <span>{isAr ? 'الأسس والمفاهيم الرئيسية' : 'Key Concepts'}</span>
                </div>
                <div className="space-y-2">
                  {slide.content.map((pt, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs sm:text-sm font-medium leading-relaxed">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${themeStyles.bulletIcon}`} />
                      {isEditing ? (
                        <input
                          type="text"
                          value={pt}
                          onChange={(e) => handleContentChange(i, e.target.value)}
                          className="flex-1 bg-black/10 border border-current/20 p-1 rounded text-xs outline-none"
                        />
                      ) : (
                        <span>{pt}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Analogy & Application */}
              <div className="space-y-3">
                {slide.analogy && (
                  <div className={`p-4 rounded-2xl border ${themeStyles.analogyBg} space-y-1.5 shadow-sm`}>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                      <Lightbulb className="w-4 h-4" />
                      <span>{isAr ? 'التشبيه الواقعي والتطبيق:' : 'Analogy & Practice:'}</span>
                    </div>
                    {isEditing ? (
                      <textarea
                        value={slide.analogy}
                        onChange={(e) => onUpdateSlide({ ...slide, analogy: e.target.value })}
                        className="w-full bg-black/10 border border-current/20 p-2 rounded text-xs outline-none"
                        rows={3}
                      />
                    ) : (
                      <p className="text-xs sm:text-sm leading-relaxed font-medium">{slide.analogy}</p>
                    )}
                  </div>
                )}

                {slide.keyTakeaway && (
                  <div className={`p-3 rounded-2xl border ${themeStyles.takeawayBg} flex items-center gap-2 text-xs sm:text-sm shadow-sm`}>
                    <Star className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{slide.keyTakeaway}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LAYOUT 3: THREE-CARD MATRIX */}
        {effectiveLayout === 'three-card' && (
          <div className="space-y-4">
            {isEditing ? (
              <input
                type="text"
                value={slide.title}
                onChange={(e) => onUpdateSlide({ ...slide, title: e.target.value })}
                className="w-full text-xl sm:text-3xl font-black bg-black/20 border border-current/20 p-2 rounded-xl text-current outline-none"
              />
            ) : (
              <h2 className={`text-xl sm:text-3xl font-black leading-snug ${themeStyles.titleColor}`}>
                {slide.title}
              </h2>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {slide.content.slice(0, 3).map((pt, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-2xl border ${themeStyles.cardBg} ${themeStyles.cardHover} space-y-2 shadow-sm transition-all`}
                >
                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                    0{i + 1}
                  </div>
                  {isEditing ? (
                    <textarea
                      value={pt}
                      onChange={(e) => handleContentChange(i, e.target.value)}
                      className="w-full bg-black/10 border border-current/20 p-1.5 rounded text-xs outline-none"
                      rows={3}
                    />
                  ) : (
                    <p className="text-xs sm:text-sm leading-relaxed font-medium">{pt}</p>
                  )}
                </div>
              ))}
            </div>

            {slide.keyTakeaway && (
              <div className={`p-3 rounded-2xl border ${themeStyles.takeawayBg} flex items-center gap-2 text-xs sm:text-sm shadow-sm`}>
                <Award className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{slide.keyTakeaway}</span>
              </div>
            )}
          </div>
        )}

        {/* LAYOUT 4: FOCUS / DEFAULT CONCEPT DEEP-DIVE */}
        {(effectiveLayout === 'focus' || effectiveLayout === 'quote') && (
          <div className="space-y-4 max-w-4xl">
            {isEditing ? (
              <input
                type="text"
                value={slide.title}
                onChange={(e) => onUpdateSlide({ ...slide, title: e.target.value })}
                className="w-full text-xl sm:text-3xl font-black bg-black/20 border border-current/20 p-2 rounded-xl text-current outline-none"
              />
            ) : (
              <h2 className={`text-xl sm:text-3xl font-black leading-tight ${themeStyles.titleColor}`}>
                {slide.title}
              </h2>
            )}

            {/* Bullets List */}
            <div className="space-y-2.5">
              {slide.content.map((pt, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardHover} transition-colors shadow-sm`}
                >
                  <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${themeStyles.bulletIcon}`} />
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={pt}
                        onChange={(e) => handleContentChange(i, e.target.value)}
                        className="flex-1 bg-black/10 border border-current/20 p-1 rounded text-xs outline-none"
                      />
                      <button
                        onClick={() => handleRemoveBullet(i)}
                        className="text-red-400 hover:text-red-500 text-xs px-1.5 py-0.5"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs sm:text-sm leading-relaxed font-medium">{pt}</span>
                  )}
                </div>
              ))}
              {isEditing && (
                <button
                  onClick={handleAddBullet}
                  className="text-xs px-3 py-1 rounded-lg bg-black/20 border border-current/20 text-current hover:bg-black/30 transition"
                >
                  + إضافة نقطة
                </button>
              )}
            </div>

            {/* Analogy Box */}
            {slide.analogy && (
              <div className={`p-3.5 rounded-2xl border ${themeStyles.analogyBg} space-y-1 shadow-sm`}>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                  <Lightbulb className="w-4 h-4" />
                  <span>{isAr ? '💡 تشبيه واقعي لتقريب الفكرة للأذهان:' : 'Real-world analogy:'}</span>
                </div>
                {isEditing ? (
                  <textarea
                    value={slide.analogy}
                    onChange={(e) => onUpdateSlide({ ...slide, analogy: e.target.value })}
                    className="w-full bg-black/10 border border-current/20 p-2 rounded text-xs outline-none"
                    rows={2}
                  />
                ) : (
                  <p className="text-xs sm:text-sm leading-relaxed font-medium">{slide.analogy}</p>
                )}
              </div>
            )}

            {/* Golden Rule Takeaway */}
            {slide.keyTakeaway && (
              <div className={`p-3.5 rounded-2xl border ${themeStyles.takeawayBg} flex items-center gap-2 text-xs sm:text-sm font-bold shadow-sm`}>
                <span className="text-base">⭐</span>
                <span>{slide.keyTakeaway}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slide Bottom Watermark & Presenter Ribbon */}
      <div className={`flex items-center justify-between text-[11px] pt-3 border-t border-current/10 ${themeStyles.footerColor} relative z-10`}>
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{isAr ? 'عرض تقديمي تعليمي تفاعلي' : 'Interactive Presentation'}</span>
        </div>
        <div>
          <span>Google Slides Pro Studio</span>
        </div>
      </div>
    </div>
  );
};
