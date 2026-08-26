import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { safePatchFetch } from '../utils/fetchBridge';

const PENDING_KEY = 'tokencare_pending_verification_v1';
const RESUME_DELAY_MS = 20_000;
const CLEAR_AFTER_QUIET_MS = 20_000;

export interface PendingVerification {
  address: string;
  chainId: string;
  startedAt: number;
}

export function markVerificationStarted(address: string, chainId: string): void {
  if (!address) return;
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({
      address: address.trim(),
      chainId: String(chainId),
      startedAt: Date.now(),
    } satisfies PendingVerification));
  } catch {}
}

export function markVerificationFinished(): void {
  try { localStorage.removeItem(PENDING_KEY); } catch {}
}

export function getPendingVerification(): PendingVerification | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingVerification;
    if (!parsed?.address || !parsed?.startedAt) return null;
    if (Date.now() - parsed.startedAt > 60 * 60 * 1000) {
      markVerificationFinished();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function findVerificationButton(address: string): HTMLButtonElement | null {
  if (typeof document === 'undefined') return null;
  const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
  const input = inputs.find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && candidate.value.trim() === address.trim();
  });
  if (!input) return null;

  let parent: HTMLElement | null = input.parentElement;
  for (let depth = 0; parent && depth < 5; depth++, parent = parent.parentElement) {
    const buttons = Array.from(parent.querySelectorAll('button')) as HTMLButtonElement[];
    const verifyButton = buttons.find((button) => {
      const rect = button.getBoundingClientRect();
      const text = (button.textContent || '').trim().toLowerCase();
      return rect.width > 0 && rect.height > 0 && /\bverify\b/.test(text) && !button.disabled;
    });
    if (verifyButton) return verifyButton;
  }
  return null;
}

function looksLikeVerificationRequest(url: string): boolean {
  return /coingecko\.com\/api\/v3\/coins|dexscreener\.com\/latest\/dex\/tokens|api\.geckoterminal\.com\/api\/v2\/networks|gopluslabs\.io\/api\/v1\/token_security|honeypot\.is\/v2\/IsHoneypot|tokensniffer/i.test(url);
}

function extractAddress(url: string): string | null {
  const patterns = [
    /\/contract\/([A-Za-z0-9:_-]+)(?:\?|$)/i,
    /\/tokens\/([^/?#]+)(?:\?|$)/i,
    /contract_addresses=([^&]+)/i,
    /address=([^&]+)/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      try { return decodeURIComponent(match[1]).trim(); } catch { return match[1].trim(); }
    }
  }
  return null;
}

/**
 * Android may suspend or kill the Capacitor WebView while the user is away.
 * The verification request is therefore persisted. If Android keeps the WebView
 * alive, provider responses clear the marker after a quiet period. If Android
 * suspends it, the marker survives and the verification is resumed on return.
 */
export function installVerificationLifecycle(): void {
  if (!Capacitor.isNativePlatform()) return;

  const marker = '__tokencareVerificationLifecycleInstalled';
  const win = window as Window & { [marker]?: boolean };
  if (win[marker]) return;
  win[marker] = true;

  const originalFetch = window.fetch.bind(window);
  let quietTimer: number | undefined;

  const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : null;
    const url = request ? request.url : String(input);

    if (looksLikeVerificationRequest(url)) {
      const address = extractAddress(url);
      if (address) {
        const existing = getPendingVerification();
        markVerificationStarted(address, existing?.chainId || 'current');
        window.clearTimeout(quietTimer);
      }

      try {
        const response = await originalFetch(input, init);
        window.clearTimeout(quietTimer);
        quietTimer = window.setTimeout(() => {
          markVerificationFinished();
        }, CLEAR_AFTER_QUIET_MS);
        return response;
      } catch (error) {
        // Keep the marker: if Android/network interrupted the verification,
        // returning to the app can retry it.
        throw error;
      }
    }

    return originalFetch(input, init);
  };

  safePatchFetch(customFetch);

  // Also capture the user's explicit Verify button in case the first provider
  // request is made by a non-HTTP/local adapter.
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('button') as HTMLButtonElement | null;
    if (!button || button.disabled) return;
    if (!/\bverify\b/i.test((button.textContent || '').trim())) return;

    const container = button.closest('div');
    const input = container?.querySelector('input') as HTMLInputElement | null;
    if (input?.value.trim()) markVerificationStarted(input.value, 'current');
  }, true);

  void CapApp.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) return;

    const pending = getPendingVerification();
    if (!pending) return;

    // Give a still-running foreground/background WebView time to finish before
    // deciding that Android actually suspended the verification.
    if (Date.now() - pending.startedAt < RESUME_DELAY_MS) return;

    window.setTimeout(() => {
      const currentPending = getPendingVerification();
      if (!currentPending) return;

      const verifyButton = findVerificationButton(currentPending.address);
      if (verifyButton) {
        verifyButton.click();
        markVerificationStarted(currentPending.address, currentPending.chainId);
      }
    }, 250);
  });
}
