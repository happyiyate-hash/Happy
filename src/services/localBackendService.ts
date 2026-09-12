/**
 * Local Backend Service
 * 
 * Implements the 5 core TokenCare Worker API operations:
 * 1. verifyTokensBatch: Check tokens before saving across all users.
 * 2. batchSaveTokens: Save multiple tokens at once with userId at the top level.
 * 3. submitToken (/submit): Save a single token with userId in body.
 * 4. getAllTokens: Retrieve all tokens directory for the Explore page.
 * 5. getTokensByUser: Retrieve tokens for a specific user.
 * 
 * Local Backend Logic:
 * - Calculates rewards: 15 TC per valid saved token.
 * - Credits TC to user reward balance (UserRewardWallet).
 * - Dispatches notifications (e.g. 2 tokens notification when 2 tokens are valid and saved).
 */

import { recordBatchSubmissionReward, getRewardWallet } from './storage';
import { createNotificationInSupabase } from '../lib/supabase';
import { getChainInfo } from '../constants/chains';

export const WORKER_URL =
  (typeof process !== 'undefined' && process.env?.GLOBAL_TOKEN_WORKER_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WORKER_URL) ||
  'https://rough-meadow-6435.happyiyate.workers.dev';

export const REWARD_PER_TOKEN_TC = 15;

export interface TokenVerificationItem {
  blockchain: string;
  contractAddress: string;
}

export interface VerifyTokenResult {
  blockchain: string;
  contractAddress: string;
  exists: boolean;
  ownedBy?: string | null;
  error?: string | null;
}

export interface VerifyBatchResponse {
  success: boolean;
  total: number;
  existed: number;
  notExisted: number;
  results: VerifyTokenResult[];
  error?: string;
}

export interface BatchTokenInput {
  name: string;
  symbol: string;
  contractAddress: string;
  blockchain: string;
  logoUrl?: string;
  verified?: boolean;
  chainId?: number | string;
}

export interface BatchSaveResponse {
  success: boolean;
  userId: string;
  saved: number;
  existed?: number;
  total?: number;
  rewardEarnedTC?: number;
  blockchains?: Array<{ blockchain: string; added: number; total: number }>;
  results?: VerifyTokenResult[];
  notification?: {
    id: string;
    title: string;
    message: string;
  };
  message?: string;
  error?: string;
}

export interface SingleTokenInput {
  userId: string;
  name: string;
  symbol: string;
  contractAddress: string;
  blockchain: string;
  logoUrl?: string;
  verified?: boolean;
}

export interface SingleTokenSaveResponse {
  success: boolean;
  token?: any;
  reward?: { amount: number; symbol: string; credited: boolean };
  notification?: { id: string; title: string; message: string };
  error?: string;
  message?: string;
}

/** Helper to make safe POST requests with timeout */
async function postWorkerApi(url: string, payload: any, timeoutMs = 15000): Promise<{ ok: boolean; status: number; data: any }> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 500, data: { error: err?.message || 'Worker network request failed' } };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 1. verifyTokensBatch — Check Before Saving
 * Checks whether token(s) already exist across ALL users in database.
 * No userId needed.
 */
export async function verifyTokensBatch(
  input: TokenVerificationItem[] | TokenVerificationItem
): Promise<VerifyBatchResponse> {
  const isSingle = !Array.isArray(input);
  const payload = isSingle
    ? {
        action: 'verifyTokensBatch',
        blockchain: (input.blockchain || 'ethereum').toLowerCase().trim(),
        contractAddress: (input.contractAddress || '').toLowerCase().trim(),
      }
    : {
        action: 'verifyTokensBatch',
        tokens: input.map((t) => ({
          blockchain: (t.blockchain || 'ethereum').toLowerCase().trim(),
          contractAddress: (t.contractAddress || '').toLowerCase().trim(),
        })),
      };

  const { ok, data } = await postWorkerApi(WORKER_URL, payload);

  if (ok && data && (data.success === true || Array.isArray(data.results))) {
    const results: VerifyTokenResult[] = Array.isArray(data.results) ? data.results : [];
    const existed = data.existed ?? results.filter((r) => r.exists).length;
    const notExisted = data.notExisted ?? results.filter((r) => !r.exists).length;
    const total = data.total ?? results.length;
    return {
      success: true,
      total,
      existed,
      notExisted,
      results,
    };
  }

  // Graceful fallback if Worker is temporarily unreachable
  const items = isSingle ? [input] : input;
  return {
    success: false,
    total: items.length,
    existed: 0,
    notExisted: items.length,
    results: items.map((t) => ({
      blockchain: t.blockchain,
      contractAddress: t.contractAddress,
      exists: false,
      ownedBy: null,
      error: data?.error || 'Verification server fallback',
    })),
    error: data?.error || 'Verification service returned unexpected status',
  };
}

/**
 * 2. batchSaveTokens — Save Multiple Tokens at Once
 * - Verifies the tokens batch first.
 * - Filters only valid tokens (where exists === false).
 * - Saves valid tokens with userId at the TOP level.
 * - Calculates reward: 15 TC per valid saved token.
 * - Credits user wallet and creates a multi-token notification (e.g. 2 tokens notification).
 */
export async function batchSaveTokens(
  userId: string,
  tokens: BatchTokenInput[]
): Promise<BatchSaveResponse> {
  const effectiveUserId = (userId || 'anonymous_user').trim();
  if (!tokens || tokens.length === 0) {
    return {
      success: false,
      userId: effectiveUserId,
      saved: 0,
      error: 'No tokens provided for batch save.',
      message: 'No tokens provided.',
    };
  }

  // Step 1: Verify the tokens in batch first
  const verifyItems: TokenVerificationItem[] = tokens.map((t) => ({
    blockchain: (t.blockchain || 'ethereum').toLowerCase().trim(),
    contractAddress: (t.contractAddress || '').toLowerCase().trim(),
  }));

  const verification = await verifyTokensBatch(verifyItems);

  // Step 2: Filter only tokens where exists: false
  const validTokens: BatchTokenInput[] = [];
  const existedTokens: BatchTokenInput[] = [];

  tokens.forEach((token, idx) => {
    const res = verification.results?.[idx];
    if (res && res.exists) {
      existedTokens.push(token);
    } else {
      validTokens.push(token);
    }
  });

  // If none are valid (all already existed)
  if (validTokens.length === 0) {
    return {
      success: false,
      userId: effectiveUserId,
      saved: 0,
      existed: existedTokens.length,
      total: tokens.length,
      rewardEarnedTC: 0,
      results: verification.results,
      error: 'All tokens in this batch already exist in the TokenCare directory.',
      message: 'All tokens already exist in TokenCare directory.',
    };
  }

  // Step 3: Save valid tokens to Worker (userId at the top level)
  const workerPayload = {
    action: 'batchSaveTokens',
    userId: effectiveUserId,
    tokens: validTokens.map((t) => ({
      name: t.name || 'Token',
      symbol: (t.symbol || 'TOK').toUpperCase(),
      contractAddress: t.contractAddress.trim(),
      blockchain: (t.blockchain || 'ethereum').toLowerCase().trim(),
      ...(t.logoUrl ? { logoUrl: t.logoUrl } : {}),
      ...(t.verified !== undefined ? { verified: t.verified } : {}),
    })),
  };

  const { ok, data } = await postWorkerApi(WORKER_URL, workerPayload);

  if (!ok || (data && data.success === false)) {
    return {
      success: false,
      userId: effectiveUserId,
      saved: 0,
      existed: existedTokens.length,
      total: tokens.length,
      error: data?.error || 'Worker failed to save tokens.',
      message: data?.error || 'Worker failed to save batch.',
    };
  }

  // Step 4: Calculate reward & Credit user balance (15 TC per token)
  const savedCount = validTokens.length;
  const rewardEarnedTC = savedCount * REWARD_PER_TOKEN_TC; // 15 TC each

  const { updatedWallet } = recordBatchSubmissionReward(validTokens, effectiveUserId);

  // Step 5: Create notification
  const tokenSymbols = validTokens.map((t) => (t.symbol || 'TOK').toUpperCase());
  const symbolsList = tokenSymbols.slice(0, 3).join(', ') + (tokenSymbols.length > 3 ? ` +${tokenSymbols.length - 3}` : '');

  const notifTitle = savedCount === 1 ? '🎉 1 Token Registered & Verified!' : `🎉 ${savedCount} Tokens Registered & Verified!`;
  const notifMessage =
    savedCount === 1
      ? `You earned 15 TC for registering ${tokenSymbols[0]} to the TokenCare directory.`
      : `You earned ${rewardEarnedTC} TC (15 TC each) for successfully registering ${savedCount} tokens (${symbolsList}) to the TokenCare directory.`;

  let notificationId = '';
  try {
    notificationId = await createNotificationInSupabase({
      userId: effectiveUserId,
      type: 'reward',
      title: notifTitle,
      message: notifMessage,
      status: 'success',
      metadata: {
        count: savedCount,
        rewardEarnedTC,
        tokens: validTokens.map((t) => ({ symbol: t.symbol, address: t.contractAddress, blockchain: t.blockchain })),
      },
    });
  } catch (e) {
    console.warn('[LocalBackend] Notification creation note:', e);
  }

  return {
    success: true,
    userId: effectiveUserId,
    saved: savedCount,
    existed: existedTokens.length,
    total: tokens.length,
    rewardEarnedTC,
    blockchains: data?.blockchains,
    results: verification.results,
    notification: {
      id: notificationId,
      title: notifTitle,
      message: notifMessage,
    },
    message: `Successfully verified and registered ${savedCount} token(s). Earned ${rewardEarnedTC} TC!${
      existedTokens.length > 0 ? ` (${existedTokens.length} already existed).` : ''
    }`,
  };
}

/**
 * 3. POST /submit — Save a Single Token
 * Calls Worker POST /submit endpoint with userId in body.
 * Calculates 15 TC reward and notifies user.
 */
export async function saveSingleToken(input: SingleTokenInput): Promise<SingleTokenSaveResponse> {
  const effectiveUserId = (input.userId || 'anonymous_user').trim();
  const contractAddress = (input.contractAddress || '').trim();
  const blockchain = (input.blockchain || 'ethereum').toLowerCase().trim();

  // Verify before saving to prevent duplicate errors
  const verification = await verifyTokensBatch({
    blockchain,
    contractAddress,
  });

  if (verification.results?.[0]?.exists) {
    return {
      success: false,
      error: 'Token already exists in TokenCare directory.',
      message: 'Token already exists in TokenCare directory.',
    };
  }

  // Call POST /submit on Worker
  const submitUrl = `${WORKER_URL}/submit`;
  const submitPayload = {
    userId: effectiveUserId,
    name: input.name || 'Token',
    symbol: (input.symbol || 'TOK').toUpperCase(),
    contractAddress,
    blockchain,
    ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
    ...(input.verified !== undefined ? { verified: input.verified } : {}),
  };

  const { ok, data } = await postWorkerApi(submitUrl, submitPayload);

  if (!ok || (data && data.success === false)) {
    return {
      success: false,
      error: data?.error || 'Failed to submit token to worker.',
      message: data?.error || 'Failed to submit token.',
    };
  }

  // Credit 15 TC reward
  const { updatedWallet } = recordBatchSubmissionReward(
    [{ name: input.name, symbol: input.symbol, contractAddress, blockchain }],
    effectiveUserId
  );

  // Create notification
  const notifTitle = '🎉 Token Registered & Verified!';
  const notifMessage = `You earned 15 TC for registering ${input.symbol.toUpperCase()} to the TokenCare directory.`;

  let notificationId = '';
  try {
    notificationId = await createNotificationInSupabase({
      userId: effectiveUserId,
      type: 'reward',
      title: notifTitle,
      message: notifMessage,
      status: 'success',
      metadata: {
        count: 1,
        rewardEarnedTC: REWARD_PER_TOKEN_TC,
        token: { symbol: input.symbol, address: contractAddress, blockchain },
      },
    });
  } catch (e) {
    console.warn('[LocalBackend] Single token notification note:', e);
  }

  return {
    success: true,
    token: data?.token || submitPayload,
    reward: {
      amount: REWARD_PER_TOKEN_TC,
      symbol: 'TC',
      credited: true,
    },
    notification: {
      id: notificationId,
      title: notifTitle,
      message: notifMessage,
    },
    message: `Token "${input.symbol.toUpperCase()}" registered successfully! Earned 15 TC.`,
  };
}

/**
 * 4. getAllTokens — Get Every Token
 * Used by Explore page. No userId needed.
 */
export async function getAllTokens(): Promise<{ success: boolean; tokens: any[]; total?: number; error?: string }> {
  const { ok, data } = await postWorkerApi(WORKER_URL, { action: 'getAllTokens' });
  if (ok && data && Array.isArray(data.tokens)) {
    return {
      success: true,
      tokens: data.tokens,
      total: data.tokens.length,
    };
  }
  return {
    success: false,
    tokens: [],
    error: data?.error || 'Unable to fetch tokens from worker directory.',
  };
}

/**
 * 5. getTokensByUser — Get Tokens for One User
 * Used by token state and user wallet. userId is required.
 */
export async function getTokensByUser(
  userId: string
): Promise<{ success: boolean; userId: string; count: number; tokens: any[]; error?: string }> {
  const effectiveUserId = (userId || '').trim();
  if (!effectiveUserId) {
    return { success: false, userId: '', count: 0, tokens: [], error: 'User ID is required.' };
  }

  const { ok, data } = await postWorkerApi(WORKER_URL, {
    action: 'getTokensByUser',
    userId: effectiveUserId,
  });

  if (ok && data && (data.success !== false || Array.isArray(data.tokens))) {
    const tokens = Array.isArray(data.tokens) ? data.tokens : [];
    return {
      success: true,
      userId: effectiveUserId,
      count: data.count ?? tokens.length,
      tokens,
    };
  }

  return {
    success: false,
    userId: effectiveUserId,
    count: 0,
    tokens: [],
    error: data?.error || 'Unable to fetch user tokens from worker.',
  };
}

/**
 * Universal backend handler for in-app or proxy execution
 */
export async function executeLocalBackendAction(action: string, payload: Record<string, any>): Promise<any> {
  switch (action) {
    case 'verifyTokensBatch':
      return verifyTokensBatch(payload.tokens || payload);

    case 'batchSaveTokens':
      return batchSaveTokens(payload.userId, payload.tokens || []);

    case 'saveSingleToken':
    case 'submit':
      return saveSingleToken({
        userId: payload.userId,
        name: payload.name,
        symbol: payload.symbol,
        contractAddress: payload.contractAddress,
        blockchain: payload.blockchain,
        logoUrl: payload.logoUrl,
        verified: payload.verified,
      });

    case 'getAllTokens':
      return getAllTokens();

    case 'getTokensByUser':
      return getTokensByUser(payload.userId);

    default:
      return { success: false, error: `Unknown backend action: ${action}` };
  }
}
