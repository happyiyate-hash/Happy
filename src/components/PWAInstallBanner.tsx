import React, { useEffect, useState } from 'react';
import { Download, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { TOKENCARE_LOGO_URL } from '../constants/logo';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already running as a standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 bg-[#0E121E]/95 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl shadow-emerald-500/10 backdrop-blur-md flex items-center justify-between gap-3 animate-slide-up">
      <div className="flex items-center space-x-3 min-w-0">
        <img
          src={TOKENCARE_LOGO_URL}
          alt="TokenCare"
          className="w-11 h-11 rounded-xl object-cover border border-emerald-500/30 shadow-md shrink-0"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-bold text-white truncate">Install TokenCare App</h4>
            <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
              PWA
            </span>
          </div>
          <p className="text-xs text-zinc-400 truncate">Fast access & offline Web3 verification</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center space-x-1 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
