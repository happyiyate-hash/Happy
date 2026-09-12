/**
 * Token Batch Verification & Local Saved List Service
 *
 * Handles:
 * 1. Local saved-tokens management (limit: 20 tokens max)
 * 2. verifyTokensBatch Edge Function & Backend Gateway calls
 * 3. batchSaveTokens backend requests
 */

import { ChainId, SubmittedToken } from '../types';
import { getChainInfo } from '../constants/chains';
import { extractBackendErrorMessage, notifyBackendError } from './toastManager';

export interface SavedTokenItem {
  id: string;
  name: string;
  symbol: string;
  blockchain: string;
  chainId: string | number;
  contractAddress: string;
  logoUrl?: string;
  decimals?: number;
  priceUsd?: number;
  trustScore?: number;
  safetyRating?: string;
  savedAt: string;
  // Verification status returned by Edge Function / verifyTokensBatch
  verificationStatus?: 'unverified' | 'checking' | 'exists' | 'available' | 'error';
  verificationDetails?: {
    exists: boolean;
    ownedBy?: string | null;
    error?: string | null;
    verifiedAt?: string;
  };
}

export interface VerifyTokensBatchRequest {
  action: 'verifyTokensBatch';
  tokens: Array<{
    blockchain: string;
    contractAddress: string;
  }>;
}

export interface VerifyTokenResultItem {
  blockchain: string;
  contractAddress: string;
  exists: boolean;
  ownedBy?: string | null;
  error?: string | null;
}

export interface VerifyTokensBatchResponse {
  success: boolean;
  total?: number;
  existed?: number;
  notExisted?: number;
  results?: VerifyTokenResultItem[];
  error?: string;
  message?: string;
}

export interface BatchSaveTokensRequest {
  action: 'batchSaveTokens';
  userId: string;
  tokens: Array<{
    name: string;
    symbol: string;
    contractAddress: string;
    blockchain: string;
    logoUrl: string;
    chainId?: number | string;
  }>;
}

export const MAX_SAVED_TOKENS = 20;

// Storage key helpers
const PRIMARY_SAVED_TOKENS_KEY = 'tokencare_saved_tokens_v1';

function getAllPossibleKeys(userId?: string): string[] {
  const keys = [PRIMARY_SAVED_TOKENS_KEY, 'tokencare_saved_list_default_user'];
  if (userId) {
    keys.push(`tokencare_saved_list_${userId}`);
  }
  return keys;
}

/**
 * Get current saved tokens list from local storage (unified across sessions)
 */
export function getLocalSavedTokens(userId?: string): SavedTokenItem[] {
  try {
    // 1. Try primary key first
    const primaryRaw = localStorage.getItem(PRIMARY_SAVED_TOKENS_KEY);
    if (primaryRaw) {
      try {
        const parsed = JSON.parse(primaryRaw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {}
    }

    // 2. Check fallback/legacy keys
    const fallbackKeys = getAllPossibleKeys(userId);
    for (const key of fallbackKeys) {
      if (key === PRIMARY_SAVED_TOKENS_KEY) continue;
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Migrate to primary key
            localStorage.setItem(PRIMARY_SAVED_TOKENS_KEY, JSON.stringify(parsed));
            return parsed;
          }
        } catch {}
      }
    }

    return [];
  } catch (err) {
    console.warn('[SavedTokensService] Error reading saved list:', err);
    return [];
  }
}

/**
 * Broadcast update event across window & tabs
 */
function broadcastTokensUpdate(tokens: SavedTokenItem[]) {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('tokencare_saved_tokens_updated', {
          detail: { tokens, count: tokens.length },
        })
      );
    } catch {}
  }
}

/**
 * Save updated tokens list to local storage
 */
export function saveLocalSavedTokens(tokens: SavedTokenItem[], userId?: string): void {
  try {
    const trimmed = (tokens || []).slice(0, MAX_SAVED_TOKENS);
    const jsonStr = JSON.stringify(trimmed);
    localStorage.setItem(PRIMARY_SAVED_TOKENS_KEY, jsonStr);
    if (userId) {
      localStorage.setItem(`tokencare_saved_list_${userId}`, jsonStr);
    }
    localStorage.setItem('tokencare_saved_list_default_user', jsonStr);
    broadcastTokensUpdate(trimmed);
  } catch (err) {
    console.warn('[SavedTokensService] Error saving local tokens list:', err);
  }
}

/**
 * Add a token to the local saved list (max 20 tokens)
 */
export function addLocalSavedToken(
  token: Partial<SavedTokenItem> & { name: string; symbol: string; contractAddress?: string; blockchain?: string },
  userId?: string
): { success: boolean; error?: string; list: SavedTokenItem[]; token?: SavedTokenItem; isFull?: boolean } {
  const currentList = getLocalSavedTokens(userId);

  // Check max limit (strictly up to 20 tokens)
  if (currentList.length >= MAX_SAVED_TOKENS) {
    return {
      success: false,
      error: `You have reached the maximum limit of ${MAX_SAVED_TOKENS} saved tokens in your list.`,
      list: currentList,
      isFull: true,
    };
  }

  const rawAddress = (token.contractAddress || (token as any).address || '').trim();
  const rawChain = (token.blockchain || (token as any).chainName || 'Ethereum').trim();
  const cleanAddress = rawAddress.toLowerCase();
  const cleanChain = rawChain.toLowerCase();

  // Check duplicate only when meaningful address exists, otherwise compare symbol and blockchain
  const existingIdx = currentList.findIndex((t) => {
    const tAddr = (t.contractAddress || '').trim().toLowerCase();
    const tChain = (t.blockchain || '').trim().toLowerCase();
    if (cleanAddress && tAddr) {
      return tAddr === cleanAddress && tChain === cleanChain;
    }
    return (t.symbol || '').toUpperCase() === (token.symbol || '').toUpperCase() && tChain === cleanChain;
  });

  if (existingIdx >= 0) {
    return {
      success: false,
      error: `"${token.symbol || token.name}" is already in your saved list.`,
      list: currentList,
    };
  }

  const newItem: SavedTokenItem = {
    id: token.id && token.id !== 'token-pending' ? token.id : `saved-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: token.name || 'Unknown Token',
    symbol: (token.symbol || 'TOK').toUpperCase(),
    blockchain: rawChain || 'Ethereum',
    chainId: token.chainId || 1,
    contractAddress: rawAddress,
    logoUrl: token.logoUrl || (token as any).chainLogoUrl || '',
    decimals: token.decimals || 18,
    priceUsd: token.priceUsd ?? (token as any).marketData?.priceUsd ?? 0,
    trustScore: token.trustScore ?? (token as any).verificationReport?.trustScore ?? (token as any).safety?.score ?? 85,
    safetyRating: token.safetyRating || (token as any).safety?.rating || 'SAFE',
    savedAt: new Date().toISOString(),
    verificationStatus: 'unverified',
  };

  const updated = [newItem, ...currentList.filter((item) => item.id !== newItem.id)];
  saveLocalSavedTokens(updated, userId);

  return {
    success: true,
    list: updated,
    token: newItem,
  };
}

/**
 * Remove a token from the local saved list
 */
export function removeLocalSavedToken(contractAddress: string, blockchain: string, userId?: string): SavedTokenItem[] {
  const current = getLocalSavedTokens(userId);
  const cleanAddress = (contractAddress || '').trim().toLowerCase();
  const cleanChain = (blockchain || '').trim().toLowerCase();

  const updated = current.filter((t) => {
    const tAddr = (t.contractAddress || '').trim().toLowerCase();
    const tChain = (t.blockchain || '').trim().toLowerCase();
    if (cleanAddress && tAddr) {
      return !(tAddr === cleanAddress && tChain === cleanChain);
    }
    return true;
  });

  saveLocalSavedTokens(updated, userId);
  return updated;
}

/**
 * Clear all saved tokens in local storage
 */
export function clearLocalSavedTokens(userId?: string): void {
  try {
    const keys = getAllPossibleKeys(userId);
    keys.forEach((k) => localStorage.removeItem(k));
    broadcastTokensUpdate([]);
  } catch {}
}

/**
 * Convert a SubmittedToken (from app lookup) into a SavedTokenItem
 */
export function submittedTokenToSavedItem(token: SubmittedToken, selectedChain: ChainId): SavedTokenItem {
  const chainInfo = getChainInfo(selectedChain);
  const chainName =
    token.metadata?.blockchainName ||
    (token.metadata as any)?.blockchain_name ||
    (token.metadata as any)?.blockchain ||
    token.metadata?.chainName ||
    chainInfo.name ||
    'Ethereum';

  const contractAddress =
    token.address ||
    token.metadata?.address ||
    (token.metadata as any)?.contractAddress ||
    (token.metadata as any)?.asset_identifier ||
    '';

  const logoUrl =
    token.metadata?.logoUrl ||
    (token.metadata as any)?.logo_url ||
    token.metadata?.chainLogoUrl ||
    '';

  return {
    id: token.id && token.id !== 'token-pending' ? token.id : `saved-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: token.metadata?.name || 'Verified Token',
    symbol: (token.metadata?.symbol || 'TOK').toUpperCase(),
    blockchain: chainName,
    chainId: token.chainId || selectedChain,
    contractAddress: contractAddress.trim(),
    logoUrl: logoUrl,
    decimals: token.metadata?.decimals || 18,
    priceUsd: token.marketData?.priceUsd ?? 0,
    trustScore: token.verificationReport?.trustScore ?? token.safety?.score ?? 85,
    safetyRating: token.safety?.rating || 'SAFE',
    savedAt: new Date().toISOString(),
    verificationStatus: 'unverified',
  };
}

/**
 * Call verifyTokensBatch on Edge Function / Gateway
 * Request body matches exact blueprint:
 * {
 *   "action": "verifyTokensBatch",
 *   "tokens": [
 *     {
 *       "blockchain": "ethereum",
 *       "contractAddress": "0x..."
 *     }
 *   ]
 * }
 */
export const SUPABASE_EDGE_FUNCTION_URL = 'https://pqqomaveycjeorgurpev.supabase.co/functions/v1/save-token-batch';

import {
  verifyTokensBatch as verifyWithWorker,
  batchSaveTokens as saveBatchWithWorker,
  WORKER_URL,
} from './localBackendService';

export async function verifyTokensBatch(
  tokensToVerify: Array<{ blockchain: string; contractAddress: string }>
): Promise<VerifyTokensBatchResponse> {
  if (!tokensToVerify || tokensToVerify.length === 0) {
    return {
      success: true,
      total: 0,
      existed: 0,
      notExisted: 0,
      results: [],
    };
  }

  // 1. Primary: Direct high-speed verification via Cloudflare Worker API
  try {
    const workerRes = await verifyWithWorker(
      tokensToVerify.map((t) => ({
        blockchain: (t.blockchain || 'ethereum').toLowerCase(),
        contractAddress: (t.contractAddress || '').trim(),
      }))
    );

    if (workerRes && (workerRes.success || workerRes.results?.length > 0)) {
      return {
        success: true,
        total: workerRes.total,
        existed: workerRes.existed,
        notExisted: workerRes.notExisted,
        results: workerRes.results,
      };
    }
  } catch (workerErr) {
    console.debug('[SavedTokensService] Worker verifyTokensBatch note:', workerErr);
  }

  const payload: VerifyTokensBatchRequest = {
    action: 'verifyTokensBatch',
    tokens: tokensToVerify.map((t) => ({
      blockchain: (t.blockchain || 'ethereum').toLowerCase(),
      contractAddress: (t.contractAddress || '').trim(),
    })),
  };

  const tryEndpoints = [
    '/api/token',
    WORKER_URL,
    SUPABASE_EDGE_FUNCTION_URL,
    '/api/save-token',
  ];

  for (const endpoint of tryEndpoints) {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeout = setTimeout(() => controller?.abort(), 9000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller?.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json && (json.success !== false || json.results)) {
          return {
            success: true,
            total: json.total ?? json.results?.length ?? tokensToVerify.length,
            existed: json.existed ?? json.results?.filter((r: any) => r.exists).length ?? 0,
            notExisted: json.notExisted ?? json.results?.filter((r: any) => !r.exists).length ?? 0,
            results: json.results || tokensToVerify.map((t) => ({
              blockchain: t.blockchain,
              contractAddress: t.contractAddress,
              exists: false,
              ownedBy: null,
              error: null,
            })),
          };
        }
      }
    } catch (err) {
      console.debug(`[SavedTokensService] verifyTokensBatch endpoint ${endpoint} note:`, err);
    }
  }

  // Fallback verification results if network/endpoint is unavailable
  return {
    success: true,
    total: tokensToVerify.length,
    existed: 0,
    notExisted: tokensToVerify.length,
    results: tokensToVerify.map((t) => ({
      blockchain: t.blockchain,
      contractAddress: t.contractAddress,
      exists: false,
      ownedBy: null,
      error: null,
    })),
  };
}

/**
 * Call batchSaveTokens on Local Backend / Worker Gateway
 * Performs verification, saves valid tokens, credits 15 TC per token,
 * and creates batch notifications.
 */
export async function batchSaveTokensToBackend(
  userId: string,
  tokens: Array<{
    name: string;
    symbol: string;
    contractAddress: string;
    blockchain: string;
    logoUrl?: string;
    chainId?: number | string;
  }>
): Promise<{ success: boolean; message?: string; error?: string; saved?: any[]; rejected?: any[]; responseData?: any; rewardEarnedTC?: number }> {
  if (!tokens || tokens.length === 0) {
    return { success: false, error: 'No tokens provided for batch save.' };
  }

  if (tokens.length > MAX_SAVED_TOKENS) {
    return { success: false, error: `Batch save limit is ${MAX_SAVED_TOKENS} tokens maximum.` };
  }

  // 1. Primary: Use localBackendService (Cloudflare Worker + TC reward calculation + notification)
  try {
    const localRes = await saveBatchWithWorker(
      userId || 'anonymous_user',
      tokens.map((t) => ({
        name: t.name || 'Token',
        symbol: (t.symbol || 'TOK').toUpperCase(),
        contractAddress: t.contractAddress.trim(),
        blockchain: (t.blockchain || 'ethereum').toLowerCase(),
        logoUrl: t.logoUrl || '',
      }))
    );

    if (localRes.success) {
      return {
        success: true,
        message: localRes.message || `Successfully registered ${localRes.saved} token(s). Earned ${localRes.rewardEarnedTC || 0} TC!`,
        saved: localRes.saved ? tokens.slice(0, localRes.saved) : tokens,
        rejected: localRes.existed ? tokens.slice(localRes.saved) : [],
        rewardEarnedTC: localRes.rewardEarnedTC,
        responseData: localRes,
      };
    } else if (localRes.error?.includes('already exist')) {
      return {
        success: false,
        error: localRes.error,
        message: localRes.message,
        saved: [],
        rejected: tokens,
        responseData: localRes,
      };
    }
  } catch (workerErr) {
    console.debug('[SavedTokensService] Worker batchSaveTokens note:', workerErr);
  }

  const payload: BatchSaveTokensRequest = {
    action: 'batchSaveTokens',
    userId: userId || 'anonymous_user',
    tokens: tokens.map((t) => {
      const cleanToken: any = {
        name: t.name || 'Token',
        symbol: (t.symbol || 'TOK').toUpperCase(),
        contractAddress: t.contractAddress.trim(),
        blockchain: (t.blockchain || 'ethereum').toLowerCase(),
      };
      if (t.logoUrl) {
        cleanToken.logoUrl = t.logoUrl;
      }
      return cleanToken;
    }),
  };


  // Obtain bearer auth token from active Supabase session if available
  let authBearer = '';
  try {
    const rawSbAuth = localStorage.getItem('sb-pqqomaveycjeorgurpev-auth-token');
    if (rawSbAuth) {
      const parsed = JSON.parse(rawSbAuth);
      if (parsed?.access_token) {
        authBearer = `Bearer ${parsed.access_token}`;
      }
    }
  } catch {}

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authBearer) {
    headers['Authorization'] = authBearer;
  }

  const tryEndpoints = [
    SUPABASE_EDGE_FUNCTION_URL,
    '/api/token',
    '/api/save-token',
  ];

  for (const endpoint of tryEndpoints) {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeout = setTimeout(() => controller?.abort(), 12000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller?.signal,
      });

      clearTimeout(timeout);

      let json: any = null;
      let rawText = '';
      try {
        rawText = await res.text();
        if (rawText && (rawText.trim().startsWith('{') || rawText.trim().startsWith('['))) {
          json = JSON.parse(rawText);
        }
      } catch {
        json = null;
      }

      // Check if this endpoint succeeded
      if (res.ok && json && json.success !== false) {
        return {
          success: true,
          message: json.message || `Successfully registered ${tokens.length} token(s).`,
          saved: json.saved || tokens,
          rejected: json.rejected || [],
          responseData: json,
        };
      }

      // If the edge function or backend returned an explicit failure/error
      if (!res.ok || (json && json.success === false) || (json && json.error)) {
        const exactErrorMessage = extractBackendErrorMessage(res.status, json || rawText);
        
        console.error('[batchSaveTokens] Exact Edge Function error response:', {
          endpoint,
          status: res.status,
          exactErrorMessage,
          rawResponse: json || rawText,
        });

        // Trigger toast with the exact error details
        notifyBackendError(res.status, json || { message: exactErrorMessage, raw: rawText }, 'Edge Function: save-token-batch');

        return {
          success: false,
          error: exactErrorMessage,
          message: exactErrorMessage,
          saved: json?.saved,
          rejected: json?.rejected,
          responseData: json || rawText,
        };
      }
    } catch (err: any) {
      console.warn(`[SavedTokensService] batchSaveTokens endpoint ${endpoint} note:`, err?.message || err);
      if (endpoint === SUPABASE_EDGE_FUNCTION_URL) {
        // If it's a network/fetch exception directly to the Edge function, provide exact exception
        const exactErrorMessage = err?.message || 'Failed to connect to Supabase Edge Function.';
        console.error('[batchSaveTokens] Edge Function network exception:', err);
        return {
          success: false,
          error: exactErrorMessage,
          message: exactErrorMessage,
        };
      }
    }
  }

  return {
    success: false,
    error: 'Failed to complete batch token save across endpoints.',
  };
}
