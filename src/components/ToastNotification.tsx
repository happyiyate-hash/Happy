import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { triggerHaptic } from '../utils/capacitor';
import { safePatchFetch } from '../utils/fetchBridge';

export interface ToastProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  onAction?: () => void;
  actionText?: string;
  duration?: number;
}

type BackgroundTokenEvent = {
  name?: string;
  symbol?: string;
  chain?: string;
};

const isDonatePageActive = (): boolean => {
  if (typeof document === 'undefined') return false;
  const navButtons = Array.from(document.querySelectorAll('nav button')) as HTMLButtonElement[];
  const donateButton = navButtons.find((button) => /donate/i.test(button.textContent || ''));
  if (donateButton) {
    const className = String(donateButton.className || '');
    if (className.includes('text-[#4ADE80]')) return true;
    if (window.getComputedStyle(donateButton).color === 'rgb(74, 222, 128)') return true;
  }
  const text = document.body?.innerText || '';
  return text.includes('EVM Token Verification Panel') && text.includes('Fetch & Verify');
};

const isVerificationCompletionMessage = (message: string | null): boolean => {
  if (!message) return false;
  const normalized = message.toLowerCase();
  if (normalized.includes('saved')) return false;
  return (
    normalized.includes('verification successful') ||
    normalized.includes('verification complete') ||
    normalized.includes('successfully verified') ||
    normalized.includes('token fetched') ||
    normalized.includes('fetch successful') ||
    normalized.includes('fetch complete') ||
    normalized.includes('successfully fetched')
  );
};

const installBackgroundFetchBridge = (): (() => void) => {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return () => {};
  const win = window as typeof window & {
    __tokencareBackgroundFetchBridgeInstalled?: boolean;
    __tokencareOriginalFetch?: typeof window.fetch;
  };
  if (win.__tokencareBackgroundFetchBridgeInstalled) return () => {};

  const originalFetch = window.fetch.bind(window);
  win.__tokencareOriginalFetch = originalFetch;
  win.__tokencareBackgroundFetchBridgeInstalled = true;

  const customFetch: typeof window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const requestInput = args[0];
      const url = typeof requestInput === 'string'
        ? requestInput
        : requestInput instanceof Request
          ? requestInput.url
          : String((requestInput as any)?.url || '');

      if (url.includes('api.dexscreener.com/latest/dex/tokens/') && response.ok) {
        response.clone().json().then((data: any) => {
          const pairs = Array.isArray(data?.pairs) ? data.pairs : [];
          if (!pairs.length) return;
          const bestPair = [...pairs].sort(
            (a: any, b: any) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0)
          )[0];
          const token = bestPair?.baseToken;
          if (!token?.name && !token?.symbol) return;

          // IMPORTANT: this is only an early metadata signal. The toast layer
          // deliberately waits for the complete verification/render cycle before
          // presenting anything to the user.
          window.dispatchEvent(new CustomEvent<BackgroundTokenEvent>('tokencare:token-fetch-success', {
            detail: {
              name: token?.name || '',
              symbol: token?.symbol || '',
              chain: bestPair?.chainId || '',
            },
          }));
        }).catch(() => {});
      }

      // Haptics are deliberately NOT triggered by verification/fetch requests.
      // A success haptic belongs to the explicit save operation only.
    } catch {
      // Notification instrumentation must never interfere with networking.
    }
    return response;
  };

  safePatchFetch(customFetch);

  return () => {
    if (win.__tokencareOriginalFetch) safePatchFetch(win.__tokencareOriginalFetch);
    delete win.__tokencareBackgroundFetchBridgeInstalled;
  };
};

// DexScreener can return name/symbol long before the rest of the verification
// pipeline has finished. Never treat that first response as completion.
const BACKGROUND_VERIFICATION_SETTLE_MS = 3600;
const BACKGROUND_POLL_MS = 250;

export const ToastNotification: React.FC<ToastProps> = ({
  message,
  type = 'success',
  onClose,
  onAction,
  actionText,
  duration = 5000,
}) => {
  const [backgroundToken, setBackgroundToken] = useState<BackgroundTokenEvent | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef<number | null>(null);
  const pendingBackgroundTokenRef = useRef<BackgroundTokenEvent | null>(null);
  const pendingKeyRef = useRef<string | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const cleanupBridge = installBackgroundFetchBridge();

    const clearPendingTimers = () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const presentWhenUserIsAway = () => {
      const pending = pendingBackgroundTokenRef.current;
      if (!pending) return;

      // If Donate is still visible, keep the completed event pending. The user
      // can already see the fetched token details, so no reminder is necessary.
      if (isDonatePageActive()) {
        pollTimerRef.current = window.setTimeout(presentWhenUserIsAway, BACKGROUND_POLL_MS);
        return;
      }

      pendingBackgroundTokenRef.current = null;
      pendingKeyRef.current = null;
      setBackgroundToken(pending);
    };

    const handleBackgroundFetch = (event: Event) => {
      const detail = (event as CustomEvent<BackgroundTokenEvent>).detail;
      if (!detail) return;

      const key = `${detail.chain || ''}:${detail.symbol || detail.name || ''}`.toLowerCase();
      if (pendingKeyRef.current === key || backgroundToken) return;

      pendingKeyRef.current = key;
      pendingBackgroundTokenRef.current = detail;
      clearPendingTimers();

      // The first DexScreener response only proves that name/symbol are known.
      // Wait beyond the normal final UI commit before presenting a background
      // reminder. If Donate remains open, keep waiting until the user leaves.
      completionTimerRef.current = window.setTimeout(() => {
        completionTimerRef.current = null;
        presentWhenUserIsAway();
      }, BACKGROUND_VERIFICATION_SETTLE_MS);
    };

    window.addEventListener('tokencare:token-fetch-success', handleBackgroundFetch);
    return () => {
      window.removeEventListener('tokencare:token-fetch-success', handleBackgroundFetch);
      clearPendingTimers();
      pendingBackgroundTokenRef.current = null;
      pendingKeyRef.current = null;
      cleanupBridge();
    };
  }, [backgroundToken]);

  useEffect(() => {
    if (!message) return;

    // Verification/fetch completion is intentionally silent while Donate is open.
    // The actual token details already appear in the Donate page.
    if (isDonatePageActive() && isVerificationCompletionMessage(message)) {
      onClose();
      return;
    }

    // Only an explicit successful save gets haptic feedback.
    if (type === 'success' && /successfully saved/i.test(message)) {
      void triggerHaptic.success();
    }

    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, type, duration, onClose]);

  useEffect(() => {
    if (!backgroundToken) return;
    const timer = setTimeout(() => setBackgroundToken(null), duration);
    return () => clearTimeout(timer);
  }, [backgroundToken, duration]);

  const visibleMessage = backgroundToken
    ? `Token ready · ${backgroundToken.symbol || backgroundToken.name || 'token'}${backgroundToken.chain ? ` · ${backgroundToken.chain}` : ''}`
    : message;

  if (!visibleMessage) return null;

  const dismiss = () => {
    setDragX(0);
    setDragging(false);
    if (backgroundToken) setBackgroundToken(null);
    else onClose();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    startXRef.current = event.clientX;
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (startXRef.current === null) return;
    setDragX(event.clientX - startXRef.current);
  };

  const handlePointerUp = () => {
    if (startXRef.current === null) return;
    const distance = dragX;
    startXRef.current = null;
    if (Math.abs(distance) >= 80) {
      dismiss();
      return;
    }
    setDragX(0);
    setDragging(false);
  };

  const isSuccess = backgroundToken || type === 'success';

  return (
    <>
      <style>{`
        @keyframes tokencare-toast-enter {
          0% { opacity: 0; transform: translate3d(0,-8px,0); }
          100% { opacity: 1; transform: translate3d(0,0,0); }
        }
        @keyframes tokencare-toast-sheen {
          0% { transform: translate3d(-160%,0,0) rotate(14deg); opacity: 0; }
          18% { opacity: .22; }
          62% { opacity: .08; }
          100% { transform: translate3d(360%,0,0) rotate(14deg); opacity: 0; }
        }
      `}</style>
      <div
        className="fixed inset-x-0 z-[2147483647] flex justify-center px-2.5 pointer-events-none"
        style={{ top: 'max(8px, calc(var(--safe-top, 0px) + 7px))' }}
      >
        <div
          role="status"
          aria-live="polite"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="pointer-events-auto relative w-full max-w-[430px] select-none touch-pan-y overflow-hidden rounded-[11px] border border-emerald-400/20 bg-gradient-to-r from-[#070B0A] via-[#0B1510] to-[#07100B] px-3 py-2 text-white shadow-[0_8px_28px_rgba(0,0,0,0.42)] backdrop-blur-xl will-change-transform"
          style={{
            transform: `translate3d(${dragX}px,0,0)`,
            opacity: Math.max(0.35, 1 - Math.min(Math.abs(dragX) / 260, 0.65)),
            transition: dragging ? 'none' : 'transform 180ms ease-out, opacity 180ms ease-out',
            animation: dragging ? 'none' : 'tokencare-toast-enter 180ms ease-out both',
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,197,94,0.09),transparent_45%)]" />
          <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 bg-white/[0.045] blur-lg" style={{ animation: 'tokencare-toast-sheen 2.2s ease-out 1' }} />

          <div className="relative flex min-h-[38px] items-center gap-2.5">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border ${isSuccess ? 'border-emerald-400/20 bg-emerald-400/[0.07]' : 'border-rose-400/20 bg-rose-400/[0.07]'}`}>
              {backgroundToken ? (
                <Database className="h-3.5 w-3.5 text-emerald-300" />
              ) : type === 'success' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-rose-300" />
              )}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className={`text-[8px] font-bold uppercase tracking-[0.16em] ${isSuccess ? 'text-emerald-300/90' : 'text-rose-300/90'}`}>
                {backgroundToken ? 'Token verification' : type === 'success' ? 'Success' : 'Notice'}
              </p>
              <p className="truncate text-[11px] font-semibold text-zinc-100">{visibleMessage}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
