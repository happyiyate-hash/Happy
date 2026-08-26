import React, { useEffect } from 'react';
import { Wifi, WifiOff, X, CheckCircle2 } from 'lucide-react';

export interface ConnectionStatusToastProps {
  status: 'online' | 'offline' | null;
  onClose: () => void;
  autoDismissMs?: number;
}

export const ConnectionStatusToast: React.FC<ConnectionStatusToastProps> = ({
  status,
  onClose,
  autoDismissMs = 4000,
}) => {
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [status, autoDismissMs, onClose]);

  if (!status) return null;

  const isOffline = status === 'offline';

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92%] sm:w-full px-1 animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto select-none">
      <div
        className={`backdrop-blur-xl rounded-2xl p-3 flex items-center justify-between border shadow-2xl transition-all ${
          isOffline
            ? 'bg-[#0A0D16]/95 border-amber-500/30 text-amber-100 shadow-[0_8px_25px_rgba(245,158,11,0.12)]'
            : 'bg-[#0A0D16]/95 border-emerald-500/30 text-emerald-100 shadow-[0_8px_25px_rgba(16,185,129,0.12)]'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0 pr-2">
          {/* Status Icon */}
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              isOffline
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {isOffline ? (
              <WifiOff className="w-4 h-4 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
          </div>

          {/* Status Message */}
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs tracking-tight text-white flex items-center gap-1.5">
              <span>{isOffline ? "You're offline" : "You're back online"}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOffline ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                }`}
              />
            </span>
            <span className="text-[11px] text-zinc-400 truncate">
              {isOffline ? 'Your cached data is still available' : 'Updating your data...'}
            </span>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title="Dismiss status"
          type="button"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
