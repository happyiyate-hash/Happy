import { SubmittedToken, UserRewardWallet, RewardTransaction, ChainId } from '../types';
import { REWARD_RATE_USD, REWARD_PER_SUBMISSION, REWARD_SAFETY_BONUS } from '../constants/chains';

const STORAGE_KEYS = {
  SUBMITTED_TOKENS: 'token_hub_submitted_tokens_v1',
  REWARD_WALLET: 'token_hub_reward_wallet_v1',
};

// User-scoped cache helpers
export const INITIAL_WALLET: UserRewardWallet = {
  totalTokens: 0,
  totalUsd: 0,
  claimedTokens: 0,
  claimedUsd: 0,
  unclaimedTokens: 0,
  unclaimedUsd: 0,
  totalSubmissions: 0,
  walletAddress: '',
  isConnected: false,
  transactions: [],
};

/**
 * Truncates giant base64 data URIs and heavy unused fields from token objects
 * before storing in LocalStorage to prevent QuotaExceeded errors.
 */
export function sanitizeTokenForStorage(token: SubmittedToken): SubmittedToken {
  if (!token) return token;
  const clone = { ...token };
  if (clone.metadata) {
    const meta = { ...clone.metadata };
    // If logoUrl is a giant base64 data URI (>5KB), remove or omit it from local cache
    if (meta.logoUrl && meta.logoUrl.startsWith('data:image/') && meta.logoUrl.length > 5000) {
      meta.logoUrl = '';
    }
    clone.metadata = meta;
  }
  if (clone.safety) {
    clone.safety = {
      ...clone.safety,
      warnings: Array.isArray(clone.safety.warnings) ? clone.safety.warnings.slice(0, 5) : [],
      flags: Array.isArray(clone.safety.flags) ? clone.safety.flags.slice(0, 5) : [],
    };
  }
  if (clone.verificationReport) {
    const vr = { ...clone.verificationReport } as any;
    if (Array.isArray(vr.checks)) {
      vr.checks = vr.checks.slice(0, 10);
    }
    clone.verificationReport = vr;
  }
  return clone;
}

/**
 * Safely saves data to localStorage with automatic QuotaExceeded error handling,
 * cache eviction of non-critical items, and fallback payload reduction.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[Storage] localStorage quota reached for key "${key}". Evicting non-critical caches...`);

    // 1. Evict non-essential / stale cache keys to free up browser storage space
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k !== key) {
          if (
            k.startsWith('token_hub_explore_tokens') ||
            k.startsWith('tokencare_cache_') ||
            k.startsWith('tokencare_otp_') ||
            k.startsWith('tokencare_temp_') ||
            k.startsWith('tokencare_device_tracked_')
          ) {
            keysToRemove.push(k);
          }
        }
      }
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });
    } catch {}

    // 2. Retry setItem after clearing non-essential cache keys
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      // Still exceeding quota
    }

    // 3. If payload is a JSON array (e.g. user tokens list or notifications), trim to smaller batch
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 5) {
        // Save top 20 items only
        const trimmed = parsed.slice(0, 20);
        localStorage.setItem(key, JSON.stringify(trimmed));
        return true;
      }
    } catch {}

    // 4. Swallow remaining exception gracefully so the app never crashes
    return false;
  }
}

/**
 * Get cached tokens for a specific authenticated user
 */
export function getSubmittedTokens(userId?: string): SubmittedToken[] {
  if (!userId) return [];
  try {
    const key = `tokencare_user_tokens_${userId}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save cached tokens for a specific authenticated user
 */
export function saveSubmittedTokens(tokens: SubmittedToken[], userId?: string): void {
  if (!userId) return;
  try {
    const key = `tokencare_user_tokens_${userId}`;
    const sanitized = (tokens || []).slice(0, 80).map(sanitizeTokenForStorage);
    safeSetItem(key, JSON.stringify(sanitized));
  } catch (e) {
    console.warn('[Storage] Notice saving user tokens:', e);
  }
}

/**
 * Get cached reward wallet for a specific authenticated user
 */
export function getRewardWallet(userId?: string): UserRewardWallet {
  if (!userId) return INITIAL_WALLET;
  try {
    const key = `tokencare_rewards_${userId}`;
    const data = localStorage.getItem(key);
    if (!data) return INITIAL_WALLET;
    return JSON.parse(data);
  } catch {
    return INITIAL_WALLET;
  }
}

/**
 * Save cached reward wallet for a specific authenticated user
 */
export function saveRewardWallet(wallet: UserRewardWallet, userId?: string): void {
  if (!userId) return;
  try {
    const key = `tokencare_rewards_${userId}`;
    const trimmedWallet = {
      ...wallet,
      transactions: Array.isArray(wallet?.transactions) ? wallet.transactions.slice(0, 50) : [],
    };
    safeSetItem(key, JSON.stringify(trimmedWallet));
  } catch (e) {
    console.warn('[Storage] Notice saving reward wallet:', e);
  }
}

/**
 * Completely clear local storage cache items for a specific user session or all user sessions
 */
export function clearAllAppStorage(userId?: string): void {
  try {
    if (userId) {
      localStorage.removeItem(`tokencare_user_tokens_${userId}`);
      localStorage.removeItem(`tokencare_rewards_${userId}`);
      localStorage.removeItem(`tokencare_profile_${userId}`);
      localStorage.removeItem(`tokencare_notifications_${userId}`);
      localStorage.removeItem(`tokencare_withdrawals_${userId}`);
      localStorage.removeItem(`tokencare_saved_address_${userId}`);
      localStorage.removeItem(`tokencare_cache_${userId}`);
    } else {
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith('tokencare_user_tokens_') ||
          key.startsWith('tokencare_rewards_') ||
          key.startsWith('tokencare_profile_') ||
          key.startsWith('tokencare_notifications_') ||
          key.startsWith('tokencare_withdrawals_') ||
          key.startsWith('tokencare_cache_') ||
          key.startsWith('token_hub_') ||
          key.startsWith('sb-')
        ) {
          localStorage.removeItem(key);
        }
      });
    }
    console.log('[Storage] User local storage cache items cleared successfully.');
  } catch (e) {
    console.error('[Storage] Error clearing local storage:', e);
  }
}

export function recordTokenSubmissionReward(
  token: SubmittedToken,
  wallet: UserRewardWallet,
  userId?: string
): { updatedWallet: UserRewardWallet; rewardEarnedTokens: number; rewardEarnedUsd: number } {
  let rewardTokens = REWARD_PER_SUBMISSION;
  if (token.safety.score >= 80) {
    rewardTokens += REWARD_SAFETY_BONUS;
  }

  const rewardUsd = rewardTokens * REWARD_RATE_USD;

  const newTx: RewardTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: token.safety.score >= 80 ? 'SAFETY_BONUS' : 'SUBMISSION_BONUS',
    amountTokens: rewardTokens,
    amountUsd: rewardUsd,
    tokenAddress: token.address,
    tokenSymbol: token.metadata.symbol,
    timestamp: new Date().toISOString(),
    status: 'COMPLETED',
  };

  const updatedWallet: UserRewardWallet = {
    ...wallet,
    totalTokens: wallet.totalTokens + rewardTokens,
    totalUsd: (wallet.totalTokens + rewardTokens) * REWARD_RATE_USD,
    unclaimedTokens: wallet.unclaimedTokens + rewardTokens,
    unclaimedUsd: (wallet.unclaimedTokens + rewardTokens) * REWARD_RATE_USD,
    totalSubmissions: wallet.totalSubmissions + 1,
    transactions: [newTx, ...wallet.transactions],
  };

  saveRewardWallet(updatedWallet, userId);
  return { updatedWallet, rewardEarnedTokens: rewardTokens, rewardEarnedUsd: rewardUsd };
}
