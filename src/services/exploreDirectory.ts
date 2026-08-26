import { SubmittedToken } from '../types';
import { REWARD_RATE_USD } from '../constants/chains';
import { getAllTokensFromWorker } from './workerApi';
import { getNetworkInfo } from './chainLogos';
import { safeSetItem, sanitizeTokenForStorage } from './storage';
import { fetchAllGlobalTokensFromSupabase } from '../lib/supabase';

const EXPLORE_CACHE_KEY = 'tokencare_explore_directory_v2';

// Baseline tokens array is kept empty so no fake or hardcoded token documentation/data is baked into the app.
export const BASELINE_EXPLORE_TOKENS: SubmittedToken[] = [];

/**
 * Gets cached token directory synchronously from localStorage
 */
export function getCachedExploreTokens(): SubmittedToken[] {
  try {
    const raw = localStorage.getItem(EXPLORE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[ExploreCache] Failed to parse cached directory:', err);
  }
  return [];
}

/**
 * Saves token list to localStorage cache
 */
export function saveCachedExploreTokens(tokens: SubmittedToken[]): void {
  try {
    const sanitized = (tokens || []).slice(0, 60).map(sanitizeTokenForStorage);
    safeSetItem(EXPLORE_CACHE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('[ExploreCache] Notice saving token cache:', err);
  }
}

/**
 * Transforms raw API token item from Worker into full SubmittedToken format
 */
export function normalizeWorkerToken(item: any): SubmittedToken {
  const chainKey = item.blockchain || item.chainId || item.chain || 'polygon';
  const netInfo = getNetworkInfo(chainKey);

  const address = item.contractAddress || item.address || item.tokenAddress || '0x0000000000000000000000000000000000000000';
  const symbol = String(item.symbol || item.tokenSymbol || 'TOK').toUpperCase();
  const name = item.name || item.tokenName || symbol;
  const logoUrl = item.logoUrl || item.logo || netInfo.logoUrl;

  const trustScore = Number(item.trustScore || item.safetyScore || item.score || 95);

  return {
    id: item.id || `worker-${netInfo.id}-${address}-${symbol.toLowerCase()}`,
    address,
    chainId: netInfo.id,
    submittedBy: item.submittedBy || 'TokenCare Global Network',
    submittedAt: item.submittedAt || new Date().toISOString(),
    verified: item.verified !== false,
    rewardEarnedTokens: Number(item.rewardEarnedTokens || 50),
    rewardEarnedUsd: Number(item.rewardEarnedTokens || 50) * REWARD_RATE_USD,
    upvotes: Number(item.upvotes || 0),
    metadata: {
      address,
      chainId: netInfo.id,
      name,
      symbol,
      decimals: Number(item.decimals || 18),
      totalSupply: item.totalSupply || '1,000,000,000',
      logoUrl,
      blockchainName: netInfo.name,
    },
    marketData: {
      priceUsd: Number(item.priceUsd || item.price || 0),
      priceNative: Number(item.priceNative || 0),
      priceChange24h: Number(item.change24h || item.priceChange24h || 0),
      marketCapUsd: Number(item.marketCapUsd || item.marketCap || 0),
      volume24h: Number(item.volume24hUsd || item.volume24h || 0),
      liquidityUsd: Number(item.liquidityUsd || item.liquidity || 0),
      fdvUsd: Number(item.fdvUsd || item.marketCapUsd || 0),
    },
    safety: {
      score: trustScore,
      rating: trustScore >= 80 ? 'SAFE' : trustScore >= 50 ? 'CAUTION' : 'HIGH_RISK',
      recommendation: item.recommendation || `Verified smart contract on ${netInfo.name}.`,
      buyTaxPct: Number(item.buyTaxPct || 0),
      sellTaxPct: Number(item.sellTaxPct || 0),
      isHoneypot: Boolean(item.isHoneypot),
      isMintable: Boolean(item.isMintable),
      isProxy: Boolean(item.isProxy),
      isOpenSource: item.isOpenSource !== false,
      isOwnershipRenounced: item.isOwnershipRenounced !== false,
      isLiquidityLocked: item.isLiquidityLocked !== false,
      liquidityLockedPct: Number(item.liquidityLockedPct || 90),
      top10HoldersPct: Number(item.top10HoldersPct || 25),
      holdersCount: Number(item.holdersCount || 100),
      pairAgeDays: Number(item.pairAgeDays || 30),
      warnings: item.warnings || [],
      flags: item.flags || [],
    },
  };
}

/**
 * Initializes Explore token directory directly from Cloud Storage (Supabase Database + Worker Endpoint)
 * Architecture:
 * Check local cache -> Fetch live tokens directly from Cloud Storage (Supabase DB & Worker API) -> Update cache & trigger UI callback
 */
export async function initGlobalExploreDirectory(
  onUpdate?: (tokens: SubmittedToken[]) => void,
  userTokens: SubmittedToken[] = []
): Promise<SubmittedToken[]> {
  // 1. Immediately read existing local cache
  const cached = getCachedExploreTokens();

  // Merge helper
  const mergeLists = (base: SubmittedToken[], extra: SubmittedToken[]) => {
    const map = new Map<string, SubmittedToken>();
    base.forEach((t) => map.set(t.address.toLowerCase().trim(), t));
    extra.forEach((t) => map.set(t.address.toLowerCase().trim(), t));
    return Array.from(map.values());
  };

  const initialMerged = mergeLists(cached, userTokens);

  // 2. Fetch live data directly from Cloud Storage (Supabase DB + Worker Endpoint)
  (async () => {
    try {
      const [supabaseTokens, workerRes] = await Promise.all([
        fetchAllGlobalTokensFromSupabase().catch(() => []),
        getAllTokensFromWorker(1, 100).catch(() => ({ success: false, tokens: [] })),
      ]);

      let fetchedWorkerNormalized: SubmittedToken[] = [];
      if (workerRes.success && Array.isArray(workerRes.tokens)) {
        fetchedWorkerNormalized = workerRes.tokens.map(normalizeWorkerToken);
      }

      const allCloudTokens = mergeLists(supabaseTokens, fetchedWorkerNormalized);
      
      if (allCloudTokens.length > 0) {
        const finalUpdated = mergeLists(userTokens, allCloudTokens);
        saveCachedExploreTokens(finalUpdated);
        if (onUpdate) {
          onUpdate(finalUpdated);
        }
      } else if (onUpdate) {
        onUpdate(initialMerged);
      }
    } catch (err) {
      console.warn('[ExploreDirectory] Cloud storage fetch error:', err);
    }
  })();

  return initialMerged;
}
