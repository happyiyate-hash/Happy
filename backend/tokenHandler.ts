/**
 * Unified Token Backend Handler
 * Handles token directory actions plus provider-backed scan/verify and lightweight price requests.
 */

import { BACKEND_CONFIG } from './config';
import { globalTokenStore } from './tokenStore';
import { handleTokenScanAction, handleTokenVerifyAction } from './token/scan/gateway';

export interface TokenBackendRequest {
  action?: string;
  service?: string;
  key?: string;
  userId?: string;
  tokens?: any[];
  token?: any;
  blockchain?: string;
  contractAddress?: string;
  page?: number;
  limit?: number;
  [key: string]: any;
}

export interface TokenBackendResponse {
  success: boolean;
  message?: string;
  error?: string;
  tokens?: any[];
  token?: any;
  count?: number;
  userId?: string;
  saved?: any[];
  rejected?: any[];
  reward?: { amount: number; symbol: string; credited: boolean };
  notification?: { id: string; title: string; message: string; type: string; timestamp: string };
  source?: 'local_store' | 'upstream_vercel' | 'upstream_cloudflare' | 'dexscreener';
  [key: string]: any;
}

type PriceRequestToken = {
  contractAddress: string;
  blockchain?: string;
};

const PRICE_BATCH_MAX_TOKENS = 30;
const PRICE_BATCH_CREDIT_COST = 1;

function normalizePriceToken(value: any): PriceRequestToken | null {
  const contractAddress = String(
    value?.contractAddress ?? value?.contract_address ?? value?.address ?? value?.tokenAddress ?? '',
  ).trim();

  if (!contractAddress) return null;

  const blockchain = String(
    value?.blockchain ?? value?.chain ?? value?.chainId ?? '',
  ).trim().toLowerCase() || undefined;

  return { contractAddress, blockchain };
}

function normalizeChain(chain: unknown): string | undefined {
  const value = String(chain ?? '').trim().toLowerCase();
  if (!value) return undefined;

  const aliases: Record<string, string> = {
    eth: 'ethereum',
    ethereum: 'ethereum',
    polygon: 'polygon',
    matic: 'polygon',
    bsc: 'bsc',
    binance: 'bsc',
    sol: 'solana',
    solana: 'solana',
    arbitrum: 'arbitrum',
    base: 'base',
    optimism: 'optimism',
    avalanche: 'avalanche',
    avax: 'avalanche',
  };

  return aliases[value] || value;
}

function pickBestPair(pairs: any[], token: PriceRequestToken) {
  const address = token.contractAddress.toLowerCase();
  const chain = normalizeChain(token.blockchain);

  const matching = pairs.filter((pair) => {
    const pairChain = normalizeChain(pair?.chainId);
    const baseAddress = String(pair?.baseToken?.address || '').toLowerCase();
    const quoteAddress = String(pair?.quoteToken?.address || '').toLowerCase();
    const addressMatches = baseAddress === address || quoteAddress === address;
    return addressMatches && (!chain || pairChain === chain);
  });

  return matching.sort((a, b) => {
    const aLiquidity = Number(a?.liquidity?.usd || 0);
    const bLiquidity = Number(b?.liquidity?.usd || 0);
    return bLiquidity - aLiquidity;
  })[0] || null;
}

async function getSimpleTokenPrices(input: PriceRequestToken[]) {
  const unique = new Map<string, PriceRequestToken>();

  for (const token of input) {
    const normalized = normalizePriceToken(token);
    if (!normalized) continue;
    const key = `${normalizeChain(normalized.blockchain) || ''}:${normalized.contractAddress.toLowerCase()}`;
    unique.set(key, normalized);
  }

  const tokens = [...unique.values()];
  if (!tokens.length) {
    return { success: false, error: 'TOKENS_REQUIRED', message: 'Provide at least one token address.' };
  }

  if (tokens.length > PRICE_BATCH_MAX_TOKENS) {
    return {
      success: false,
      error: 'BATCH_LIMIT_EXCEEDED',
      message: `A price request supports at most ${PRICE_BATCH_MAX_TOKENS} tokens at once.`,
    };
  }

  const addresses = tokens.map((token) => token.contractAddress).join(',');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(BACKEND_CONFIG.requestTimeoutMs, 10000));

  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(addresses)}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'PRICE_PROVIDER_FAILED',
        message: `Price provider returned HTTP ${response.status}.`,
      };
    }

    const payload = await response.json().catch(() => ({}));
    const pairs = Array.isArray(payload?.pairs) ? payload.pairs : [];

    const results = tokens.map((token) => {
      const pair = pickBestPair(pairs, token);
      if (!pair) {
        return {
          contract_address: token.contractAddress,
          blockchain: normalizeChain(token.blockchain) || null,
          found: false,
          price_usd: null,
          price_change_24h_pct: null,
        };
      }

      return {
        contract_address: token.contractAddress,
        blockchain: normalizeChain(pair.chainId) || normalizeChain(token.blockchain) || null,
        found: true,
        name: pair.baseToken?.name || null,
        symbol: pair.baseToken?.symbol || null,
        price_usd: pair.priceUsd == null ? null : Number(pair.priceUsd),
        price_change_24h_pct: pair.priceChange?.h24 == null ? null : Number(pair.priceChange.h24),
      };
    });

    return {
      success: true,
      service: 'token',
      action: 'price',
      credit_cost: PRICE_BATCH_CREDIT_COST,
      data: {
        type: tokens.length === 1 ? 'token' : 'batch',
        count: results.length,
        tokens: results,
      },
      source: 'dexscreener',
    };
  } catch (error: any) {
    const timedOut = error?.name === 'AbortError';
    return {
      success: false,
      error: timedOut ? 'PRICE_PROVIDER_TIMEOUT' : 'PRICE_PROVIDER_FAILED',
      message: timedOut ? 'Price provider request timed out.' : 'Unable to fetch token prices.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function tryForwardUpstream(payload: TokenBackendRequest): Promise<any | null> {
  if (!BACKEND_CONFIG.forwardToRemote && !BACKEND_CONFIG.vercelBackendUrl) return null;
  const targetUrl = BACKEND_CONFIG.vercelBackendUrl;
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = setTimeout(() => controller?.abort(), BACKEND_CONFIG.requestTimeoutMs);
    const res = await fetch(targetUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller?.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success !== false) return data;
    }
  } catch (err: any) {
    console.debug('[Backend Upstream Proxy] Remote call skipped/failed:', err?.message || err);
  }
  return null;
}

async function tryForwardWorker(payload: any): Promise<any | null> {
  const targetUrl = BACKEND_CONFIG.cloudflareWorkerUrl || 'https://rough-meadow-6435.happyiyate.workers.dev/';
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = setTimeout(() => controller?.abort(), BACKEND_CONFIG.requestTimeoutMs || 10000);
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data) return data;
    }
  } catch (err: any) {
    console.debug('[Backend Worker Proxy] Worker call note:', err?.message || err);
  }
  return null;
}

async function tryForwardWorkerSubmit(payload: any): Promise<any | null> {
  const baseUrl = (BACKEND_CONFIG.cloudflareWorkerUrl || 'https://rough-meadow-6435.happyiyate.workers.dev/').replace(/\/$/, '');
  const targetUrl = `${baseUrl}/submit`;
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = setTimeout(() => controller?.abort(), BACKEND_CONFIG.requestTimeoutMs || 10000);
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data) return data;
    }
  } catch (err: any) {
    console.debug('[Backend Worker Submit] Submit call note:', err?.message || err);
  }
  return null;
}

export async function handleTokenRequest(body: TokenBackendRequest): Promise<TokenBackendResponse> {
  const action = String(body.action || body.key || 'getAllTokens');

  // Provider-backed token intelligence. These actions intentionally return only
  // the normalized TokenCare result; provider availability/aggregation stays internal.
  if (action === 'scan') return await handleTokenScanAction(body) as any;
  if (action === 'verify') return await handleTokenVerifyAction(body) as any;

  // Lightweight price endpoint. This intentionally does not return charts,
  // supply, liquidity or other expensive market details. It supports one token
  // or a batch and is suitable for token lists and overview screens.
  if (action === 'price' || action === 'getTokenPrice' || action === 'getTokenPrices' || action === 'batchPrice') {
    const inputTokens = Array.isArray(body.tokens)
      ? body.tokens
      : body.contractAddress || body.contract_address || body.address
        ? [body]
        : [];

    return await getSimpleTokenPrices(inputTokens) as any;
  }

  if (action === 'health') {
    return {
      success: true,
      message: 'TokenCare Backend API is healthy and operational',
      service: 'tokencare-backend',
      timestamp: new Date().toISOString(),
      config: {
        forwardToRemote: BACKEND_CONFIG.forwardToRemote,
        vercelUrlConfigured: !!BACKEND_CONFIG.vercelBackendUrl,
        cloudflareUrlConfigured: !!BACKEND_CONFIG.cloudflareWorkerUrl,
      },
    };
  }

  // 1. Action: getAllTokens (Explore page)
  if (action === 'getAllTokens') {
    const workerData = await tryForwardWorker({ action: 'getAllTokens' });
    if (workerData && Array.isArray(workerData.tokens)) {
      // Sync local store
      globalTokenStore.saveTokens('worker_sync', workerData.tokens);
      return { success: true, count: workerData.tokens.length, tokens: workerData.tokens, source: 'upstream_cloudflare' };
    }

    const allTokens = globalTokenStore.getAll();
    return { success: true, count: allTokens.length, tokens: allTokens, source: 'local_store' };
  }

  // 2. Action: getTokensByUser (Tokens state / wallet)
  if (action === 'getTokensByUser') {
    const userId = (body.userId || '').trim();
    if (!userId) return { success: true, userId: '', count: 0, tokens: [], source: 'local_store' };

    const workerData = await tryForwardWorker({ action: 'getTokensByUser', userId });
    if (workerData && Array.isArray(workerData.tokens)) {
      return { success: true, userId, count: workerData.count ?? workerData.tokens.length, tokens: workerData.tokens, source: 'upstream_cloudflare' };
    }

    const userTokens = globalTokenStore.getByUser(userId);
    return { success: true, userId, count: userTokens.length, tokens: userTokens, source: 'local_store' };
  }

  // 3. Action: verifyTokensBatch (Check tokens before saving)
  if (action === 'verifyTokensBatch') {
    const inputTokens: Array<{ blockchain: string; contractAddress: string }> = Array.isArray(body.tokens)
      ? body.tokens
      : body.contractAddress
        ? [{ blockchain: body.blockchain || 'ethereum', contractAddress: body.contractAddress }]
        : [];

    const workerData = await tryForwardWorker({
      action: 'verifyTokensBatch',
      tokens: inputTokens.map((t) => ({
        blockchain: (t.blockchain || 'ethereum').toLowerCase().trim(),
        contractAddress: (t.contractAddress || '').toLowerCase().trim(),
      })),
    });

    if (workerData && (workerData.success || Array.isArray(workerData.results))) {
      return {
        success: true,
        total: workerData.total ?? workerData.results?.length ?? inputTokens.length,
        existed: workerData.existed ?? 0,
        notExisted: workerData.notExisted ?? 0,
        results: workerData.results,
        source: 'upstream_cloudflare',
      };
    }

    // Local fallback
    const results = inputTokens.map((item) => {
      const targetChain = String(item.blockchain || 'ethereum').trim().toLowerCase();
      const targetAddress = String(item.contractAddress || '').trim().toLowerCase();
      const found = globalTokenStore.getByAddress(targetAddress, targetChain);
      return {
        blockchain: item.blockchain || 'ethereum',
        contractAddress: item.contractAddress,
        exists: !!found,
        ownedBy: found?.userId || null,
        error: found ? 'Token already exists' : null,
      };
    });

    return {
      success: true,
      total: results.length,
      existed: results.filter((r) => r.exists).length,
      notExisted: results.filter((r) => !r.exists).length,
      results,
      source: 'local_store',
    };
  }

  // 4. Action: submit (Single token save via /submit)
  if (action === 'submit' || action === 'saveSingleToken') {
    const userId = body.userId || (body as any).user_id || 'anonymous_user';
    const contractAddress = String(body.contractAddress || body.address || '').trim();
    const blockchain = String(body.blockchain || 'ethereum').toLowerCase().trim();
    const name = String(body.name || body.tokenName || 'Unknown Token').trim();
    const symbol = String(body.symbol || body.tokenSymbol || 'TOK').toUpperCase().trim();
    const logoUrl = body.logoUrl || body.logo_url || '';

    // Verify before saving
    const verifyRes = await tryForwardWorker({
      action: 'verifyTokensBatch',
      tokens: [{ blockchain, contractAddress }],
    });

    if (verifyRes?.results?.[0]?.exists) {
      return {
        success: false,
        error: 'Token already exists in TokenCare directory.',
        message: 'Token already exists in TokenCare directory.',
      };
    }

    // Forward to /submit
    const workerRes = await tryForwardWorkerSubmit({
      userId,
      name,
      symbol,
      contractAddress,
      blockchain,
      logoUrl,
    });

    const isSuccess = workerRes?.success !== false;
    const rewardTC = 15; // 1 token = 15 TC

    // Store in local store as well
    globalTokenStore.saveTokens(userId, [{
      name,
      symbol,
      contractAddress,
      blockchain,
      logoUrl,
    }]);

    return {
      success: isSuccess,
      token: workerRes?.token || { name, symbol, contractAddress, blockchain, logoUrl },
      reward: { amount: rewardTC, symbol: 'TC', credited: true },
      notification: {
        id: `notif-${Date.now()}`,
        title: '🎉 Token Registered & Verified!',
        message: `You earned ${rewardTC} TC for registering ${symbol} to the TokenCare directory.`,
        type: 'token_saved',
        timestamp: new Date().toISOString(),
      },
      source: 'upstream_cloudflare',
    };
  }

  // 5. Action: batchSaveTokens / saveToken (Multiple tokens save)
  if (action === 'saveToken' || action === 'batchSaveTokens' || action === 'save-token' || action === 'uploadTokens') {
    const userId = body.userId || (body as any).user_id || 'anonymous_user';
    let rawTokens: any[] = [];
    if (Array.isArray(body.tokens)) rawTokens = body.tokens;
    else if (body.token && typeof body.token === 'object') rawTokens = [body.token];
    else if (body.contractAddress || (body as any).address) rawTokens = [body];
    if (rawTokens.length === 0) return { success: false, error: 'No tokens provided', message: 'Please provide at least one token object in the tokens array.' };

    const normalizedTokens = rawTokens.map((t) => ({
      name: t.tokenName || t.name || t.symbol || 'Unknown Token',
      symbol: (t.tokenSymbol || t.symbol || 'TOK').toUpperCase(),
      contractAddress: String(t.contractAddress || t.address || t.tokenAddress || t.id || t.metadata?.address || '').trim(),
      blockchain: String(t.blockchain || t.chain || body.blockchain || 'polygon').toLowerCase().trim(),
      blockchainSymbol: t.blockchainSymbol || t.chainSymbol || 'MATIC',
      chainId: t.chainId ?? t.chain_id ?? 137,
      logoUrl: t.logoUrl || t.logo_url || t.metadata?.logoUrl || '',
    }));

    // Step A: Verify the batch
    const verifyRes = await tryForwardWorker({
      action: 'verifyTokensBatch',
      tokens: normalizedTokens.map((t) => ({
        blockchain: t.blockchain,
        contractAddress: t.contractAddress,
      })),
    });

    const validTokens: any[] = [];
    const existedTokens: any[] = [];

    normalizedTokens.forEach((tok, idx) => {
      const match = verifyRes?.results?.[idx];
      if (match && match.exists) {
        existedTokens.push(tok);
      } else {
        validTokens.push(tok);
      }
    });

    if (validTokens.length === 0) {
      return {
        success: false,
        error: 'All tokens in this batch already exist in the TokenCare directory.',
        message: 'All tokens already exist in the TokenCare directory.',
        saved: [],
        rejected: existedTokens,
      };
    }

    // Step B: Save valid tokens to worker with userId at TOP level
    const workerRes = await tryForwardWorker({
      action: 'batchSaveTokens',
      userId,
      tokens: validTokens.map((t) => ({
        name: t.name,
        symbol: t.symbol,
        contractAddress: t.contractAddress,
        blockchain: t.blockchain,
        logoUrl: t.logoUrl,
      })),
    });

    // Step C: Calculate reward: 1 token each = 15 TC
    const savedCount = validTokens.length;
    const rewardEarnedTC = savedCount * 15; // 15 TC each

    // Also persist in local store
    globalTokenStore.saveTokens(userId, validTokens);

    const symbols = validTokens.map((t) => t.symbol).join(', ');
    return {
      success: true,
      userId,
      saved: validTokens,
      rejected: existedTokens,
      count: savedCount,
      reward: { amount: rewardEarnedTC, symbol: 'TC', credited: true },
      notification: {
        id: `notif-${Date.now()}`,
        title: savedCount === 1 ? '🎉 1 Token Registered & Verified!' : `🎉 ${savedCount} Tokens Registered & Verified!`,
        message: savedCount === 1
          ? `You earned 15 TC for registering ${validTokens[0]?.symbol} to the TokenCare directory.`
          : `You earned ${rewardEarnedTC} TC (15 TC each) for successfully registering ${savedCount} tokens (${symbols}) to the TokenCare directory.`,
        type: 'token_saved',
        timestamp: new Date().toISOString(),
      },
      message: `Successfully verified and registered ${savedCount} token(s). Earned ${rewardEarnedTC} TC!${
        existedTokens.length > 0 ? ` (${existedTokens.length} already existed)` : ''
      }`,
      source: 'upstream_cloudflare',
    };
  }

  if (action === 'getTokenByAddress') {
    const { contractAddress, blockchain } = body;
    if (!contractAddress) return { success: false, error: 'contractAddress is required', message: 'Contract address is required for lookup' };
    const token = globalTokenStore.getByAddress(contractAddress, blockchain);
    return { success: !!token, found: !!token, token: token || null, source: 'local_store' };
  }

  return { success: false, error: `Unknown action: ${action}`, message: `The action "${action}" is not recognized.` };
}

