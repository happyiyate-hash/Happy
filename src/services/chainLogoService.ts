/**
 * Blockchain Logo Cache & Background Service
 * 
 * - Caches blockchain logos by chain ID / slug in localStorage and memory.
 * - Background fetches logos for blockchains missing icons from DexScreener, CoinGecko, and TrustWallet.
 * - Registers dynamically discovered blockchains with their logos and metadata.
 */

import { getTrustWalletChainLogoUrl } from '../constants/trustWalletChainLogos';

const CHAIN_LOGO_STORAGE_PREFIX = 'tokencare_chain_logo_v1_';
const DYNAMIC_CHAINS_STORAGE_KEY = 'tokencare_dynamic_chains_v1';

export interface DynamicChainRecord {
  id: string;
  chainId?: number | string;
  name: string;
  symbol: string;
  tokenStandard?: string;
  logoUrl?: string;
  dexScreenerChain?: string;
  type?: string;
  discoveredAt?: string;
}

// In-memory cache
const memoryChainLogoCache = new Map<string, string>();
const failedLogoLookups = new Set<string>();
const inFlightRequests = new Set<string>();

/**
 * Standardize chain key for lookup
 */
export function normalizeChainLogoKey(key: string | number): string {
  return String(key ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

/**
 * Get cached blockchain logo URL (data URI or verified remote URL)
 */
export function getCachedChainLogo(chainKey: string | number): string | null {
  const normKey = normalizeChainLogoKey(chainKey);
  if (!normKey) return null;

  if (memoryChainLogoCache.has(normKey)) {
    return memoryChainLogoCache.get(normKey)!;
  }

  try {
    const stored = localStorage.getItem(`${CHAIN_LOGO_STORAGE_PREFIX}${normKey}`);
    if (stored) {
      memoryChainLogoCache.set(normKey, stored);
      return stored;
    }
  } catch {}

  return null;
}

/**
 * Save blockchain logo URL to cache
 */
export function saveChainLogoToCache(chainKey: string | number, logoUrl: string): void {
  if (!logoUrl || !chainKey) return;
  const normKey = normalizeChainLogoKey(chainKey);
  memoryChainLogoCache.set(normKey, logoUrl);

  try {
    localStorage.setItem(`${CHAIN_LOGO_STORAGE_PREFIX}${normKey}`, logoUrl);
  } catch (e) {
    console.warn('[ChainLogoService] Storage quota error:', e);
  }

  // Dispatch event so UI can reactively update without full re-render
  try {
    window.dispatchEvent(
      new CustomEvent('tokencare_chain_logo_updated', {
        detail: { chainKey: normKey, logoUrl },
      })
    );
  } catch {}
}

/**
 * Load all dynamically discovered chains from localStorage
 */
export function getStoredDynamicChains(): DynamicChainRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(DYNAMIC_CHAINS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save a newly discovered blockchain into persistent storage and cache
 */
export function storeDynamicChain(record: DynamicChainRecord): void {
  if (!record || !record.id) return;
  if (typeof window === 'undefined' || !window.localStorage) return;
  const normId = normalizeChainLogoKey(record.id);

  try {
    const list = getStoredDynamicChains();
    const existingIndex = list.findIndex(
      (c) => normalizeChainLogoKey(c.id) === normId
    );

    const updatedRecord: DynamicChainRecord = {
      ...record,
      id: normId,
      discoveredAt: record.discoveredAt || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...updatedRecord };
    } else {
      list.unshift(updatedRecord);
    }

    localStorage.setItem(DYNAMIC_CHAINS_STORAGE_KEY, JSON.stringify(list));

    if (record.logoUrl) {
      saveChainLogoToCache(normId, record.logoUrl);
      if (record.name) saveChainLogoToCache(record.name, record.logoUrl);
      if (record.symbol) saveChainLogoToCache(record.symbol, record.logoUrl);
      if (record.dexScreenerChain) saveChainLogoToCache(record.dexScreenerChain, record.logoUrl);
    }

    // Trigger update notification
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent('tokencare_dynamic_chains_updated', {
          detail: updatedRecord,
        })
      );
    }
  } catch (e) {
    console.warn('[ChainLogoService] Failed to persist dynamic chain:', e);
  }
}

/**
 * Convert remote image to base64 DataURL for offline/fast caching
 */
async function convertUrlToDataUrl(url: string, timeoutMs = 4000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => {
      reject(new Error('Image fetch timeout'));
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(url);
          return;
        }
        ctx.drawImage(img, 0, 0, 64, 64);
        const dataUrl = canvas.toDataURL('image/png', 0.85);
        resolve(dataUrl);
      } catch {
        resolve(url);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Image load failed'));
    };

    img.src = url;
  });
}

/**
 * Fetches a blockchain logo from multiple sources in background:
 * 1. Trust Wallet asset repository
 * 2. DexScreener token-profiles / dex search
 * 3. CoinGecko asset platforms
 */
export async function fetchChainLogoInBackground(
  chainKey: string,
  chainName?: string,
  symbol?: string
): Promise<string | null> {
  const normKey = normalizeChainLogoKey(chainKey);
  if (!normKey || failedLogoLookups.has(normKey)) return null;

  const existing = getCachedChainLogo(normKey);
  if (existing) return existing;

  if (inFlightRequests.has(normKey)) return null;
  inFlightRequests.add(normKey);

  try {
    // 1. Try TrustWallet
    const twUrl = getTrustWalletChainLogoUrl({
      id: normKey,
      name: chainName,
      dexScreenerChain: normKey,
    });

    if (twUrl) {
      try {
        const dataUrl = await convertUrlToDataUrl(twUrl, 3000);
        saveChainLogoToCache(normKey, dataUrl);
        inFlightRequests.delete(normKey);
        return dataUrl;
      } catch {
        // Fall through to next providers
      }
    }

    // 2. Try DexScreener Search for native or major pool on that chain
    try {
      const dexsQuery = chainName || normKey;
      const dexRes = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(dexsQuery)}`
      );
      if (dexRes.ok) {
        const dexData = await dexRes.json();
        const pairs = Array.isArray(dexData?.pairs) ? dexData.pairs : [];
        const matchingPair = pairs.find((p: any) => {
          const cId = String(p.chainId || '').toLowerCase();
          return (
            cId === normKey ||
            (chainName && cId === normalizeChainLogoKey(chainName))
          );
        });

        const iconCandidate =
          matchingPair?.info?.imageUrl ||
          matchingPair?.baseToken?.imageUrl;

        if (iconCandidate && typeof iconCandidate === 'string' && iconCandidate.startsWith('http')) {
          let finalLogo = iconCandidate;
          try {
            finalLogo = await convertUrlToDataUrl(iconCandidate, 3000);
          } catch {}
          saveChainLogoToCache(normKey, finalLogo);
          inFlightRequests.delete(normKey);
          return finalLogo;
        }
      }
    } catch {
      // Continue to next provider
    }

    // 3. Try CoinGecko Asset Platforms
    try {
      const cgRes = await fetch('https://api.coingecko.com/api/v3/asset_platforms');
      if (cgRes.ok) {
        const platforms = await cgRes.json();
        if (Array.isArray(platforms)) {
          const match = platforms.find((p: any) => {
            const pId = String(p.id || '').toLowerCase();
            const pName = String(p.name || '').toLowerCase();
            const pShort = String(p.shortname || '').toLowerCase();
            return (
              pId === normKey ||
              pName === normKey ||
              (chainName && pName === chainName.toLowerCase()) ||
              (symbol && pShort === symbol.toLowerCase())
            );
          });

          const cgLogo = match?.image?.large || match?.image?.small || match?.image?.thumb;
          if (cgLogo && typeof cgLogo === 'string' && cgLogo.startsWith('http')) {
            let finalLogo = cgLogo;
            try {
              finalLogo = await convertUrlToDataUrl(cgLogo, 3000);
            } catch {}
            saveChainLogoToCache(normKey, finalLogo);
            inFlightRequests.delete(normKey);
            return finalLogo;
          }
        }
      }
    } catch {
      // Continue
    }

    failedLogoLookups.add(normKey);
  } catch (err) {
    console.warn(`[ChainLogoService] Background fetch failed for ${normKey}:`, err);
    failedLogoLookups.add(normKey);
  } finally {
    inFlightRequests.delete(normKey);
  }

  return null;
}

/**
 * Queue a background scan for all chains that lack a logo
 */
export function scanAndFetchMissingChainLogos(chains: Array<{ id: string | number; name?: string; symbol?: string; logoUrl?: string }>): void {
  if (!Array.isArray(chains)) return;

  // Process sequentially in background to avoid network flood
  let delay = 100;
  for (const chain of chains) {
    const idKey = String(chain.id);
    const existing = getCachedChainLogo(idKey);
    if (!existing && !chain.logoUrl) {
      setTimeout(() => {
        void fetchChainLogoInBackground(idKey, chain.name, chain.symbol);
      }, delay);
      delay += 400; // gentle pacing
    }
  }
}
