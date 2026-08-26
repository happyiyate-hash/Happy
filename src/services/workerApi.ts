/**
 * Fetches full token details by contract address and chain
 * Payload action: "getTokenDetails"
 */
export async function getTokenDetailsFromWorker(
  chain: string,
  contractAddress: string
): Promise<{ success: boolean; token?: any; raw?: any; error?: string }> {
  const payload = {
    action: 'getTokenDetails',
    chain: (chain || 'ethereum').toLowerCase(),
    contractAddress: (contractAddress || '').trim().toLowerCase(),
  };

  return executeWorkerGenericAction(payload);
}

/**
 * Fetches live price for a single token
 * Payload action: "getTokenPrice"
 */
export async function getTokenPriceFromWorker(
  chain: string,
  contractAddress: string
): Promise<{ success: boolean; chain?: string; contractAddress?: string; priceUsd?: number; change24h?: number; updatedAt?: string; raw?: any; error?: string }> {
  const payload = {
    action: 'getTokenPrice',
    chain: (chain || 'ethereum').toLowerCase(),
    contractAddress: (contractAddress || '').trim().toLowerCase(),
  };

  return executeWorkerGenericAction(payload);
}

/**
 * Batch fetches prices for an array of tokens across blockchains
 * Payload action: "getTokenPrices"
 */
export async function getTokenPricesBatchFromWorker(
  tokens: Array<{ chain: string; contractAddress: string }>
): Promise<{ success: boolean; prices?: any[]; raw?: any; error?: string }> {
  const payload = {
    action: 'getTokenPrices',
    tokens: (tokens || []).map((t) => ({
      chain: (t.chain || 'ethereum').toLowerCase(),
      contractAddress: (t.contractAddress || '').trim().toLowerCase(),
    })),
  };

  return executeWorkerGenericAction(payload);
}

/**
 * Inspects token for security, verification and smart contract metadata
 * Payload action: "inspectToken"
 */
export async function inspectTokenFromWorker(
  chain: string,
  contractAddress: string
): Promise<{ success: boolean; chain?: string; contractAddress?: string; inspection?: any; raw?: any; error?: string }> {
  const payload = {
    action: 'inspectToken',
    chain: (chain || 'ethereum').toLowerCase(),
    contractAddress: (contractAddress || '').trim().toLowerCase(),
  };

  return executeWorkerGenericAction(payload);
}

/**
 * Universal execution proxy helper for Cloudflare Worker actions.
 * Tries server proxy first (/api/worker-proxy), then direct worker fetch.
 */
export async function executeWorkerGenericAction(
  payload: Record<string, any>
): Promise<any> {
  // 1. Try server-side proxy route
  try {
    const proxyResponse = await fetch('/api/worker-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      return data.result || data;
    }
  } catch (proxyError) {
    console.warn('[Worker API Proxy] Server route failed, trying direct fetch...', proxyError);
  }

  // 2. Direct fetch fallback
  try {
    const response = await fetch('https://rough-meadow-6435.happyiyate.workers.dev/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let result: any = null;
    try {
      result = await response.json();
    } catch {
      result = await response.text();
    }

    return result;
  } catch (error: any) {
    console.error('[Worker API Direct] Execution error:', error);
    return {
      success: false,
      error: error.message || 'Worker connection failed',
    };
  }
}

export interface WorkerTokenPayload {
  name: string;
  symbol: string;
  contractAddress: string;
  logoUrl?: string;
  verified?: boolean;
}

export interface WorkerTokenLookupResult {
  exists: boolean;
  token?: WorkerTokenPayload | null;
  raw?: any;
  error?: string;
}

/**
 * Queries Cloudflare Worker to check if a token contract address exists globally
 * Payload action: "getTokenByAddress"
 */
export async function getTokenByAddressFromWorker(
  blockchain: string,
  contractAddress: string
): Promise<WorkerTokenLookupResult> {
  if (!contractAddress || !contractAddress.trim()) {
    return { exists: false };
  }

  const normalizedAddress = contractAddress.trim().toLowerCase();
  const normalizedChain = (blockchain || 'polygon').trim().toLowerCase();

  const payload = {
    action: 'getTokenByAddress',
    blockchain: normalizedChain,
    contractAddress: normalizedAddress,
  };

  // 1. Try server-side proxy route first
  try {
    const proxyResponse = await fetch('/api/get-token-by-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      const res = data.result || data;
      const exists = !!(
        res?.exists === true ||
        res?.token ||
        (res?.success === true && res?.data) ||
        res?.found === true
      );
      return {
        exists,
        token: res?.token || res?.data || null,
        raw: res,
      };
    }
  } catch (proxyError) {
    console.warn('[Worker API Lookup Proxy] Failed, trying direct fetch...', proxyError);
  }

  // 2. Direct client-side fetch fallback
  try {
    const response = await fetch('https://rough-meadow-6435.happyiyate.workers.dev/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let result: any = null;
    try {
      result = await response.json();
    } catch {
      result = await response.text();
    }

    const exists = !!(
      result?.exists === true ||
      result?.token ||
      (result?.success === true && result?.data) ||
      result?.found === true
    );

    return {
      exists,
      token: result?.token || result?.data || null,
      raw: result,
    };
  } catch (error: any) {
    console.error('[Worker API Lookup Direct] Error fetching token by address:', error);
    return {
      exists: false,
      error: error.message || 'Worker connection failed',
    };
  }
}

/**
 * Fetches global token directory from Cloudflare Worker
 * Payload action: "getAllTokens"
 */
export async function getAllTokensFromWorker(
  page: number = 1,
  limit: number = 100
): Promise<{ success: boolean; tokens?: any[]; raw?: any; error?: string }> {
  const payload = {
    action: 'getAllTokens',
    page,
    limit,
  };

  // 1. Try server proxy first
  try {
    const proxyResponse = await fetch('/api/get-all-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      const res = data.result || data;
      const tokens = res?.tokens || res?.data || (Array.isArray(res) ? res : []);
      return {
        success: true,
        tokens,
        raw: res,
      };
    }
  } catch (proxyError) {
    console.warn('[Worker API Directory Proxy] Failed, trying direct fetch...', proxyError);
  }

  // 2. Direct fetch fallback
  try {
    const response = await fetch('https://rough-meadow-6435.happyiyate.workers.dev/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let result: any = null;
    try {
      result = await response.json();
    } catch {
      result = await response.text();
    }

    const tokens = result?.tokens || result?.data || (Array.isArray(result) ? result : []);

    return {
      success: response.ok,
      tokens,
      raw: result,
    };
  } catch (error: any) {
    console.error('[Worker API Directory Direct] Error fetching all tokens:', error);
    return {
      success: false,
      error: error.message || 'Worker directory connection failed',
    };
  }
}

/**
 * Uploads token metadata array to Cloudflare Worker endpoint
 * Primary path: Uses backend Express proxy route (/api/upload-tokens) to avoid browser CORS restrictions
 * Fallback path: Direct fetch to Worker endpoint
 */
export async function uploadTokensToWorker(
  tokens: WorkerTokenPayload[],
  blockchain: string = 'polygon'
): Promise<{ success: boolean; result?: any; error?: string }> {
  if (!tokens || tokens.length === 0) {
    return { success: false, error: 'No tokens provided for upload.' };
  }

  const payload = {
    action: 'uploadTokens',
    blockchain: blockchain.toLowerCase(),
    tokens: tokens.map((t) => ({
      name: t.name || 'Unknown Token',
      symbol: t.symbol || 'TOK',
      contractAddress: t.contractAddress || '0x0000000000000000000000000000000000000000',
      logoUrl: t.logoUrl || '',
      verified: t.verified ?? true,
    })),
  };

  // 1. Try server-side proxy route first (bypasses browser CORS)
  try {
    const proxyResponse = await fetch('/api/upload-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      console.log('[Worker API via Proxy] Success:', data);
      return { success: true, result: data.result };
    }
  } catch (proxyError) {
    console.warn('[Worker API Proxy] Proxy request failed, attempting direct fetch...', proxyError);
  }

  // 2. Direct client-side fetch fallback
  try {
    const response = await fetch('https://rough-meadow-6435.happyiyate.workers.dev/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let result: any = null;
    try {
      result = await response.json();
    } catch {
      result = await response.text();
    }

    console.log('[Worker API Direct] Response:', result);
    return { success: response.ok, result };
  } catch (error: any) {
    console.error('[Worker API Direct] Failed to upload tokens:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to Cloudflare Worker endpoint.',
    };
  }
}
