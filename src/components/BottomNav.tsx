import React from 'react';
import { MessageSquare, GraduationCap, Image, Code2, Presentation, Briefcase, Settings, Download } from 'lucide-react';
import { ActiveTab, Language } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  language: Language;
  onOpenDownloadModal?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  language,
  onOpenDownloadModal,
}) => {
  const isAr = language === 'ar';

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'chat',
      label: isAr ? 'الدردشة' : 'Chat',
      icon: <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'tutor',
      label: isAr ? 'الأستاذ' : 'Tutor',
      icon: <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'images',
      label: isAr ? 'الصور' : 'Images',
      icon: <Image className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'apps',
      label: isAr ? 'التطبيقات' : 'Apps',
      icon: <Code2 className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'slides',
      label: isAr ? 'العروض' : 'Slides',
      icon: <Presentation className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'business',
      label: isAr ? 'الأعمال' : 'Business',
      icon: <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'settings',
      label: isAr ? 'الإعدادات' : 'Settings',
      icon: <Settings className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      className="w-full bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-1 sm:px-2 py-1.5 flex items-center justify-between z-30 shrink-0 select-none pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`nav-tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-1.5 sm:px-2 rounded-xl transition-all duration-200 cursor-pointer flex-1 min-w-0 ${
              isActive
                ? 'text-emerald-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`relative p-1 rounded-lg transition-colors ${
                isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-transparent'
              }`}
            >
              {tab.icon}
              {isActive && (
                <span className="absolute -top-0.5 right-1/2 translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-0.5 truncate max-w-[50px] text-center">{tab.label}</span>
          </button>
        );
      })}

      {/* Direct Code Download in Bottom Bar with Auto-Resume Modal */}
      <button
        type="button"
        onClick={() => {
          if (onOpenDownloadModal) {
            onOpenDownloadModal();
          } else {
            window.dispatchEvent(new CustomEvent('open-download-modal'));
          }
        }}
        id="bottom-nav-download-zip"
        className="flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all text-cyan-400 hover:text-cyan-300 cursor-pointer min-w-[56px] active:scale-95"
        title={isAr ? 'تنزيل كود المشروع المقاوم للانقطاع (ZIP)' : 'Resilient Download Code (ZIP)'}
      >
        <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Download className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5 whitespace-nowrap font-bold text-cyan-300">
          {isAr ? 'الكود' : 'Code'}
        </span>
      </button>
    </nav>
  );
};
