import React, { useState, useEffect } from 'react';
import { ActiveTab, AppSettings, UserProfile } from './types';
import { authService } from './services/auth';
import { storageService } from './services/storage';
import { LoginScreen } from './components/LoginScreen';
import { BottomNav } from './components/BottomNav';
import { ChatTab } from './components/ChatTab';
import { TutorTab } from './components/TutorTab';
import { ImagesTab } from './components/ImagesTab';
import { AppsTab } from './components/AppsTab';
import { SlidesTab } from './components/SlidesTab';
import { BusinessTab } from './components/BusinessTab';
import { SettingsTab } from './components/SettingsTab';
import { ToastContainer, ToastMessage } from './components/Toast';
import { NetworkStatusBar } from './components/NetworkStatusBar';
import { ResilientDownloadModal } from './components/ResilientDownloadModal';
import { InstallModal } from './components/InstallModal';
import { Download, Smartphone } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    authService.getCurrentUser()
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('freegen_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      language: 'ar',
      theme: 'dark',
    };
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Listen for global open-download-modal and open-install-modal events
  useEffect(() => {
    const handleOpenDownload = () => setIsDownloadModalOpen(true);
    const handleOpenInstall = () => setIsInstallModalOpen(true);

    window.addEventListener('open-download-modal', handleOpenDownload);
    window.addEventListener('open-install-modal', handleOpenInstall);

    return () => {
      window.removeEventListener('open-download-modal', handleOpenDownload);
      window.removeEventListener('open-install-modal', handleOpenInstall);
    };
  }, []);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user?.uid) {
        storageService.syncFromFirestore(user.uid).catch((err) => {
          console.warn('Initial Firestore sync warning:', err);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync settings (RTL/LTR, Theme, Language)
  useEffect(() => {
    localStorage.setItem('freegen_settings', JSON.stringify(settings));

    const isAr = settings.language === 'ar';
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = settings.language;

    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const newToast: ToastMessage = {
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type,
      message,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div
      id="app-root-shell"
      className="h-[100dvh] w-full bg-slate-950 flex justify-center items-center overflow-hidden font-sans"
    >
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Floating Download Button (Always Visible in Any Screen) */}
      <button
        type="button"
        onClick={() => setIsDownloadModalOpen(true)}
        id="global-floating-download-btn"
        className="fixed top-3 left-3 z-50 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 border border-cyan-400/30 transition-transform active:scale-95 cursor-pointer backdrop-blur-md"
        title={settings.language === 'ar' ? 'تنزيل الكود الذكي المقاوم للانقطاع (ZIP)' : 'Resilient Download Code (ZIP)'}
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span className="hidden sm:inline">
          {settings.language === 'ar' ? 'تنزيل الكود (ZIP)' : 'Download Code (ZIP)'}
        </span>
      </button>

      {/* Floating Install App Button (Always Visible in Any Screen) */}
      <button
        type="button"
        onClick={() => setIsInstallModalOpen(true)}
        id="global-floating-install-btn"
        className="fixed top-3 right-3 z-50 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 border border-emerald-400/30 transition-transform active:scale-95 cursor-pointer backdrop-blur-md"
        title={settings.language === 'ar' ? 'تثبيت التطبيق على هاتفك' : 'Install App to Phone'}
      >
        <Smartphone className="w-4 h-4 text-emerald-300 animate-pulse" />
        <span className="hidden sm:inline">
          {settings.language === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
        </span>
      </button>

      {/* 
        Mobile Frame:
        - 100dvh on mobile
        - 430px width centered on desktop screens with sleek subtle borders
      */}
      <div
        id="mobile-viewport-container"
        className="w-full h-full sm:h-[94vh] sm:max-h-[880px] sm:max-w-[430px] bg-slate-900 text-slate-100 flex flex-col sm:rounded-[36px] sm:border sm:border-slate-800/90 sm:shadow-2xl overflow-hidden relative min-h-0"
      >
        <NetworkStatusBar language={settings.language} />
        {!currentUser ? (
          <LoginScreen
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              showToast(
                settings.language === 'ar' ? 'أهلاً بك في FreeGen AI' : 'Welcome to FreeGen AI',
                'success'
              );
            }}
            language={settings.language}
          />
        ) : (
          <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden relative">
            {/* Main Tab Views */}
            <main className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative">
              {activeTab === 'chat' && (
                <ChatTab
                  user={currentUser}
                  language={settings.language}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'tutor' && (
                <TutorTab
                  user={currentUser}
                  language={settings.language}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'images' && (
                <ImagesTab
                  user={currentUser}
                  language={settings.language}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'apps' && (
                <AppsTab
                  user={currentUser}
                  language={settings.language}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'slides' && (
                <SlidesTab
                  user={currentUser}
                  language={settings.language}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'business' && (
                <BusinessTab
                  user={currentUser}
                  language={settings.language}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsTab
                  user={currentUser}
                  settings={settings}
                  onUpdateSettings={updateSettings}
                  onLogout={() => {
                    setCurrentUser(null);
                    setActiveTab('chat');
                  }}
                  onShowToast={showToast}
                />
              )}
            </main>

            {/* Bottom 4-Tab Navigation */}
            <BottomNav
              activeTab={activeTab}
              onTabChange={setActiveTab}
              language={settings.language}
              onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Resilient Chunked Downloader Modal */}
      <ResilientDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        isAr={settings.language === 'ar'}
      />

      {/* Standalone Installation Modal */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        isAr={settings.language === 'ar'}
      />
    </div>
  );
}
