import { config } from './config';

type Json = Record<string, any>;

async function workerFetch(url: string, init: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let body: any = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
    if (!response.ok) throw new Error(body?.error || body?.message || `Worker HTTP ${response.status}`);
    return body;
  } finally { clearTimeout(timer); }
}

function tokenKey(token: any): string {
  return `${String(token?.blockchain || token?.chain || '').trim().toLowerCase()}:${String(token?.id || token?.contractAddress || token?.address || '').trim().toLowerCase()}`;
}

export async function userTokenExists(userId: string, token: Json): Promise<boolean> {
  const body = await workerFetch(`${config.userWorkerUrl}?user_id=${encodeURIComponent(userId)}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  const key = tokenKey(token);
  return Array.isArray(body?.tokens) && body.tokens.some((item: any) => tokenKey(item) === key);
}

export async function globalTokenExists(token: Json): Promise<boolean> {
  const chain = String(token.blockchain || token.chain || '').trim().toLowerCase();
  const address = String(token.contractAddress || token.address || token.id || '').trim().toLowerCase();
  const body = await workerFetch(config.globalWorkerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getTokenByAddress', blockchain: chain, contractAddress: address }),
  });
  return Boolean(body?.exists === true || body?.found === true || body?.token || body?.data);
}

export async function saveUserToken(userId: string, token: Json): Promise<any> {
  return workerFetch(`${config.userWorkerUrl}?merge=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, tokens: [token] }),
  });
}

export async function saveGlobalToken(token: Json): Promise<any> {
  const blockchain = String(token.blockchain || token.chain || '').trim().toLowerCase();
  const globalToken = {
    name: token.name,
    symbol: token.symbol,
    contractAddress: token.contractAddress || token.address || token.id,
    chainId: token.chainId ?? token.chain_id,
    blockchain,
    decimals: token.decimals,
    logoUrl: token.logoUrl || token.logo_url,
    verified: token.verified,
  };
  return workerFetch(config.globalWorkerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'uploadTokens', blockchain, tokens: [globalToken] }),
  });
}
