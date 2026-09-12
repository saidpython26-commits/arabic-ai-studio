import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { networkManager } from '../services/networkManager';
import { Language } from '../types';

interface NetworkStatusBarProps {
  language: Language;
}

export const NetworkStatusBar: React.FC<NetworkStatusBarProps> = ({ language }) => {
  const [isOnline, setIsOnline] = useState<boolean>(networkManager.isOnline());
  const [showRestored, setShowRestored] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const isAr = language === 'ar';

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const unsubscribe = networkManager.subscribe((online) => {
      setIsOnline(online);
      if (online) {
        setShowRestored(true);
        timer = setTimeout(() => {
          setShowRestored(false);
        }, 3500);
      } else {
        setShowRestored(false);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleManualCheck = async () => {
    setIsChecking(true);
    const ok = await networkManager.ping();
    setIsOnline(ok);
    setIsChecking(false);
  };

  if (isOnline && !showRestored) {
    return null;
  }

  if (showRestored) {
    return (
      <div
        id="network-restored-banner"
        className="w-full bg-emerald-500 text-slate-950 px-3 py-1.5 flex items-center justify-between text-[11px] font-bold shadow-md z-30 transition-all duration-300 animate-in slide-in-from-top"
      >
        <div className="flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5 shrink-0" />
          <span>
            {isAr
              ? 'عاد الاتصال بالإنترنت! جاري استئناف العمليات تلقائياً...'
              : 'Internet restored! Resuming operations automatically...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="network-offline-banner"
      className="w-full bg-amber-500/90 text-slate-950 px-3 py-2 flex items-center justify-between text-[11px] font-semibold shadow-md z-30 transition-all duration-300 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
        </span>
        <WifiOff className="w-3.5 h-3.5 shrink-0 text-slate-950" />
        <span className="truncate">
          {isAr
            ? 'انقطع الاتصال - طلباتك محفوظة وستُستأنف تلقائياً فور عودة الإنترنت'
            : 'Connection lost - Requests saved and will auto-resume upon reconnect'}
        </span>
      </div>

      <button
        onClick={handleManualCheck}
        disabled={isChecking}
        className="shrink-0 ml-2 px-2 py-0.5 rounded-md bg-slate-950/20 hover:bg-slate-950/30 text-slate-950 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
        title={isAr ? 'فحص الاتصال الآن' : 'Check connection'}
      >
        <RefreshCw className={`w-2.5 h-2.5 ${isChecking ? 'animate-spin' : ''}`} />
        <span>{isAr ? 'فحص' : 'Check'}</span>
      </button>
    </div>
  );
};
