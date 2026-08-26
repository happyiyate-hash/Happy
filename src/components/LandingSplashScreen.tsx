import React, { useState, useEffect, useRef } from 'react';
import { TOKENCARE_LOGO_URL } from '../constants/logo';
import { useStatusBarColor } from '../lib/statusBar';

interface LandingSplashScreenProps {
  statusText?: string;
  onFinish?: () => void;
  minDurationMs?: number;
}

export const LandingSplashScreen: React.FC<LandingSplashScreenProps> = ({
  statusText = 'Verifying session...',
  onFinish,
  minDurationMs = 5000,
}) => {
  const [progress, setProgress] = useState(0);

  // Set top status bar color to match splash screen background
  useStatusBarColor('#030710');

  // Keep a stable ref for onFinish to prevent effect re-triggering and progress resets
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const calculatedProgress = Math.min(100, Math.floor((elapsed / minDurationMs) * 100));
      
      setProgress(calculatedProgress);

      if (calculatedProgress >= 100) {
        clearInterval(interval);
        if (onFinishRef.current) {
          setTimeout(() => {
            onFinishRef.current?.();
          }, 250);
        }
      }
    }, 30);

    return () => clearInterval(interval);
  }, [minDurationMs]);

  // Dynamic status text based on progress stage
  const currentStatus =
    statusText !== 'Verifying session...'
      ? statusText
      : progress < 25
      ? 'Verifying session & credentials...'
      : progress < 55
      ? 'Loading cached application data...'
      : progress < 85
      ? 'Syncing TokenCare network indexes...'
      : 'Preparing dashboard...';

  return (
    <div className="fixed inset-0 z-50 bg-[#030710] text-white flex flex-col justify-between items-center p-6 select-none font-sans overflow-hidden">
      {/* Top Empty Spacer */}
      <div className="w-full pt-8 flex items-center justify-center opacity-0 pointer-events-none">
        <span className="text-xs font-mono text-zinc-600">TOKENCARE</span>
      </div>

      {/* Center Branding Section (Full Logo Image asset with generous, intentional margins) */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto animate-in fade-in zoom-in-95 duration-500 w-full max-w-sm px-4">
        <img
          src={TOKENCARE_LOGO_URL}
          alt="TokenCare"
          className="w-full max-w-[280px] sm:max-w-[340px] h-auto object-contain transition-transform duration-700 mx-auto"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Bottom Glowing Curved Line (Decorative Wave) */}
      <div className="absolute bottom-28 left-0 right-0 w-full pointer-events-none">
        <svg
          className="w-full h-16"
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
        >
          <path
            d="M 0,80 Q 500,-10 1000,80"
            fill="none"
            stroke="url(#emeraldWaveGradient)"
            strokeWidth="1.5"
            opacity="0.75"
          />
          <defs>
            <linearGradient id="emeraldWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00E575" stopOpacity="0" />
              <stop offset="50%" stopColor="#00E575" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00E575" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Bottom Progress & Session Loader Section */}
      <div className="relative z-10 w-full max-w-[240px] sm:max-w-[280px] mx-auto pb-8 space-y-2 flex flex-col items-center">
        <div className="w-full flex items-center justify-between text-xs text-zinc-300 font-medium tracking-wide">
          <span>{currentStatus}</span>
          <span className="font-mono text-[11px] text-[#00E575] font-bold">{progress}%</span>
        </div>

        {/* Centered Horizontal Progress Bar */}
        <div className="w-full bg-[#0D1322] border border-zinc-800/80 rounded-full h-2 overflow-hidden p-[1px] relative shadow-inner">
          <div
            className="bg-[#00E575] h-full rounded-full transition-all duration-150 ease-out shadow-[0_0_12px_#00E575]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
