/** Central Token Backend gateway. Integrates localBackendService and Cloudflare Worker API. */

import { getChainInfo } from '../constants/chains';
import { resolveChainLogo } from './chainLogos';
import { notifyBackendError, extractBackendErrorMessage } from './toastManager';
import {
  getAllTokens as getWorkerExploreTokens,
  getTokensByUser as getWorkerUserTokens,
  batchSaveTokens as saveBatchToWorker,
  saveSingleToken as saveSingleToWorker,
  WORKER_URL,
} from './localBackendService';

export const VERCEL_TOKEN_GATEWAY_URL =
  'https://token-save-backend-p74bbibkg-happyiyate-hashs-projects.vercel.app/api/token';
export const LOCAL_TOKEN_GATEWAY_URL = '/api/token';

export const VERCEL_SAVE_TOKEN_URL = VERCEL_TOKEN_GATEWAY_URL;
export const LOCAL_PROXY_GATEWAY_URL = LOCAL_TOKEN_GATEWAY_URL;
export const LOCAL_PROXY_SAVE_URL = LOCAL_TOKEN_GATEWAY_URL;

export interface BackendTokenItem {
  blockchain: string;
  blockchainSymbol: string;
  chainId: number;
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  logoUrl: string;
}

export interface BackendSavePayload { userId: string; tokens: BackendTokenItem[]; }

export interface SaveTokenBackendResponse {
  success: boolean;
  partial?: boolean;
  message?: string;
  error?: string;
  saved?: any[];
  rejected?: any[];
  reward?: { amount: number; symbol: string; credited?: boolean; [key: string]: unknown };
  notification?: any;
  [key: string]: unknown;
}

export function formatTokenForBackend(token: any, fallbackChainId?: string | number): BackendTokenItem {
  const chainIdInput = token.chainId ?? token.metadata?.chainId ?? fallbackChainId ?? '137';
  const chainMeta = getChainInfo(String(chainIdInput));
  const chainNetwork = resolveChainLogo(
    token.blockchain ?? token.metadata?.blockchainName ?? chainMeta.name,
    String(chainIdInput)
  );
  const blockchain = token.blockchain || token.metadata?.blockchainName || token.metadata?.chainName || chainMeta.name || chainNetwork.name || 'Polygon';
  const blockchainSymbol = token.blockchainSymbol || token.metadata?.chainSymbol || chainMeta.symbol || chainNetwork.symbol || 'MATIC';
  let numericChainId = Number(token.chainId ?? chainMeta.id ?? chainIdInput ?? chainNetwork.id ?? 137);
  if (!Number.isFinite(numericChainId) || numericChainId <= 0) numericChainId = 137;
  const contractAddress = String(token.contractAddress ?? token.address ?? token.id ?? token.metadata?.address ?? '').trim();
  const tokenName = token.tokenName || token.name || token.metadata?.name || 'Unknown Token';
  const tokenSymbol = String(token.tokenSymbol || token.symbol || token.metadata?.symbol || 'TOK').toUpperCase();
  const logoUrl = token.logoUrl || token.metadata?.logoUrl || '';
  return { blockchain, blockchainSymbol, chainId: numericChainId, contractAddress, tokenName, tokenSymbol, logoUrl };
}

async function postTokenApi(payload: any, timeoutMs = 12000): Promise<{ status: number; ok: boolean; json: any }> {
  const tryPost = async (url: string) => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller?.signal,
      });
      const json = await res.json().catch(() => null);
      return { status: res.status, ok: res.ok, json };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  // Try local backend handler first
  try {
    const localResult = await tryPost(LOCAL_TOKEN_GATEWAY_URL);
    if (localResult.ok && localResult.json && localResult.json.success !== false) {
      return localResult;
    }
    if (localResult.status !== 404 && localResult.status !== 502) {
      return localResult;
    }
  } catch (err) {
    console.debug('[TokenBackend] Local endpoint note:', err);
  }

  // Fallback to Worker URL or Vercel Gateway URL
  try {
    const workerResult = await tryPost(WORKER_URL);
    if (workerResult.ok && workerResult.json) {
      return workerResult;
    }
  } catch {}

  return tryPost(VERCEL_TOKEN_GATEWAY_URL);
}

export async function fetchExploreTokensFromBackend(): Promise<any[]> {
  // 1. Primary: Direct query to Worker getAllTokens
  try {
    const workerRes = await getWorkerExploreTokens();
    if (workerRes && workerRes.success && Array.isArray(workerRes.tokens) && workerRes.tokens.length > 0) {
      return workerRes.tokens;
    }
  } catch (err) {
    console.debug('[TokenBackend] Worker getAllTokens note:', err);
  }

  // 2. Gateway fallback
  const { status, ok, json } = await postTokenApi({ action: 'getAllTokens' });
  if (!ok || json?.success === false) {
    notifyBackendError(status, json, 'Explore: getAllTokens');
    throw Object.assign(new Error(extractBackendErrorMessage(status, json)), { status, backendResponse: json });
  }
  const rawList = json?.tokens || json?.data || json?.result || (Array.isArray(json) ? json : []);
  return Array.isArray(rawList) ? rawList : [];
}

export async function fetchTokensByUserFromBackend(userId: string): Promise<any[]> {
  if (!userId?.trim()) return [];

  // 1. Primary: Direct query to Worker getTokensByUser
  try {
    const workerRes = await getWorkerUserTokens(userId.trim());
    if (workerRes && workerRes.success && Array.isArray(workerRes.tokens)) {
      return workerRes.tokens;
    }
  } catch (err) {
    console.debug('[TokenBackend] Worker getTokensByUser note:', err);
  }

  // 2. Gateway fallback
  const { status, ok, json } = await postTokenApi({ action: 'getTokensByUser', userId: userId.trim() });
  if (!ok || json?.success === false) {
    notifyBackendError(status, json, 'Tokens: getTokensByUser');
    throw Object.assign(new Error(extractBackendErrorMessage(status, json)), { status, backendResponse: json });
  }
  const rawList = json?.tokens || json?.data || json?.result || (Array.isArray(json) ? json : []);
  return Array.isArray(rawList) ? rawList : [];
}

export async function saveTokensToBackend(userId: string, tokens: any[]): Promise<SaveTokenBackendResponse> {
  if (!tokens?.length) return { success: false, message: 'No tokens provided to save.' };
  const effectiveUserId = (userId || 'anonymous_user').trim();
  const formattedTokens = tokens.map((t) => formatTokenForBackend(t));

  // 1. Primary: Use localBackendService (Cloudflare Worker + 15 TC reward + notification)
  try {
    if (formattedTokens.length === 1) {
      const single = formattedTokens[0];
      const singleRes = await saveSingleToWorker({
        userId: effectiveUserId,
        name: single.tokenName,
        symbol: single.tokenSymbol,
        contractAddress: single.contractAddress,
        blockchain: single.blockchain,
        logoUrl: single.logoUrl,
      });

      if (singleRes.success) {
        return {
          success: true,
          message: singleRes.message || `Token ${single.tokenSymbol} saved successfully.`,
          saved: [singleRes.token || single],
          rejected: [],
          reward: singleRes.reward,
          notification: singleRes.notification,
        };
      } else if (singleRes.error?.includes('already exist')) {
        return {
          success: true, // gracefully treated as saved locally
          partial: true,
          message: 'Token already exists in directory.',
          saved: [],
          rejected: [{ ...single, reason: 'Already registered in directory' }],
        };
      }
    } else {
      const batchRes = await saveBatchToWorker(
        effectiveUserId,
        formattedTokens.map((t) => ({
          name: t.tokenName,
          symbol: t.tokenSymbol,
          contractAddress: t.contractAddress,
          blockchain: t.blockchain,
          logoUrl: t.logoUrl,
        }))
      );

      if (batchRes.success) {
        return {
          success: true,
          message: batchRes.message,
          saved: batchRes.saved ? formattedTokens.slice(0, batchRes.saved) : formattedTokens,
          rejected: batchRes.existed ? formattedTokens.slice(batchRes.saved) : [],
          reward: { amount: batchRes.rewardEarnedTC || 0, symbol: 'TC', credited: true },
          notification: batchRes.notification,
        };
      } else if (batchRes.error?.includes('already exist')) {
        return {
          success: true,
          partial: true,
          message: 'Tokens already registered in directory.',
          saved: [],
          rejected: formattedTokens.map((t) => ({ ...t, reason: 'Already registered in directory' })),
        };
      }
    }
  } catch (workerErr) {
    console.debug('[TokenBackend] Worker direct save note:', workerErr);
  }

  // 2. Gateway fallback
  const payload: BackendSavePayload = { userId: effectiveUserId, tokens: formattedTokens };
  try {
    const { status, ok, json } = await postTokenApi({ action: 'saveToken', ...payload }, 15000);
    if (!ok || json?.success === false) {
      const message = notifyBackendError(status, json, 'Donate: save-token');
      return { success: false, message, error: json?.error || `HTTP ${status}`, ...(json || {}) };
    }
    return {
      success: json?.success ?? true,
      partial: json?.partial,
      message: json?.message || 'Token saved successfully.',
      saved: json?.saved || [],
      rejected: json?.rejected || [],
      reward: json?.reward,
      notification: json?.notification,
      ...(json || {}),
    };
  } catch (err: any) {
    const message = err?.message || 'Failed to communicate with token save service.';
    notifyBackendError(0, { error: 'Network Connection Failure', message }, 'Donate: save-token');
    return { success: false, message, error: 'NETWORK_ERROR' };
  }
}

