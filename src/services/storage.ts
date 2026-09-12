import { SubmittedToken, UserRewardWallet, RewardTransaction } from '../types';
import { REWARD_RATE_USD, REWARD_PER_SUBMISSION, REWARD_SAFETY_BONUS } from '../constants/chains';

export const INITIAL_WALLET: UserRewardWallet = {
  totalTokens: 0, totalUsd: 0, claimedTokens: 0, claimedUsd: 0, unclaimedTokens: 0, unclaimedUsd: 0,
  totalSubmissions: 0, walletAddress: '', isConnected: false, transactions: [],
};

export function sanitizeTokenForStorage(token: SubmittedToken): SubmittedToken {
  if (!token) return token;
  const clone = { ...token };
  if (clone.metadata) {
    const meta = { ...clone.metadata };
    if (meta.logoUrl && meta.logoUrl.startsWith('data:image/') && meta.logoUrl.length > 5000) meta.logoUrl = '';
    clone.metadata = meta;
  }
  if (clone.safety) clone.safety = { ...clone.safety, warnings: Array.isArray(clone.safety.warnings) ? clone.safety.warnings.slice(0, 5) : [], flags: Array.isArray(clone.safety.flags) ? clone.safety.flags.slice(0, 5) : [] };
  return clone;
}

export function safeSetItem(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true; } catch {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k !== key && !k.startsWith('sb-') && (k.startsWith('token_hub_explore_tokens') || k.startsWith('tokencare_cache_') || k.startsWith('tokencare_otp_') || k.startsWith('tokencare_temp_') || k.startsWith('tokencare_device_tracked_') || k.startsWith('tokencare_logo_') || k.startsWith('tokencare_cached_logo_'))) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch {} });
      localStorage.setItem(key, value);
      return true;
    } catch {
      try { const parsed = JSON.parse(value); if (Array.isArray(parsed) && parsed.length > 5) { localStorage.setItem(key, JSON.stringify(parsed.slice(0, 20))); return true; } } catch {}
      return false;
    }
  }
}

export function getSubmittedTokens(userId?: string): SubmittedToken[] {
  if (!userId) return [];
  try {
    const data = localStorage.getItem(`tokencare_user_tokens_${userId}`);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

/** Saves complete token identity without substituting an unknown chain with a default. */
export function saveSubmittedTokens(tokens: SubmittedToken[], userId?: string): void {
  if (!userId) return;
  try {
    const key = `tokencare_user_tokens_${userId}`;
    safeSetItem(key, JSON.stringify((tokens || []).slice(0, 80).map(sanitizeTokenForStorage)));

    if (tokens?.length) {
      import('./userTokenCacheWorker').then(({ saveUserTokensToWorker }) => {
        const workerItems = tokens.map((t) => {
          const metadata = t.metadata || ({} as any);
          const blockchainName = String(metadata.blockchainName || metadata.blockchain_name || metadata.chainName || '').trim();
          const blockchainSymbol = String(metadata.chainSymbol || '').trim();
          const chainId = String(t.chainId || metadata.chainId || '').trim();
          return {
            blockchain: blockchainName || chainId,
            chainId,
            blockchainName,
            blockchainSymbol,
            tokenStandard: metadata.tokenStandard || metadata.token_standard,
            id: t.address || t.id,
            name: metadata.name,
            symbol: metadata.symbol,
            logoUrl: metadata.logoUrl,
          };
        });
        saveUserTokensToWorker(userId, workerItems, false).catch((err) => console.warn('[Storage] Cloudflare Worker sync note:', err));
      }).catch(() => {});
    }
  } catch (e) { console.warn('[Storage] Notice saving user tokens:', e); }
}

export function getRewardWallet(userId?: string): UserRewardWallet {
  if (!userId) return INITIAL_WALLET;
  try { const data = localStorage.getItem(`tokencare_rewards_${userId}`); return data ? JSON.parse(data) : INITIAL_WALLET; } catch { return INITIAL_WALLET; }
}

export function saveRewardWallet(wallet: UserRewardWallet, userId?: string): void {
  if (!userId) return;
  try { safeSetItem(`tokencare_rewards_${userId}`, JSON.stringify({ ...wallet, transactions: Array.isArray(wallet?.transactions) ? wallet.transactions.slice(0, 50) : [] })); } catch (e) { console.warn('[Storage] Notice saving reward wallet:', e); }
}

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
        if (key.startsWith('tokencare_user_tokens_') || key.startsWith('tokencare_rewards_') || key.startsWith('tokencare_profile_') || key.startsWith('tokencare_notifications_') || key.startsWith('tokencare_withdrawals_') || key.startsWith('tokencare_cache_') || key.startsWith('token_hub_') || key.startsWith('sb-')) localStorage.removeItem(key);
      });
    }
  } catch (e) { console.error('[Storage] Error clearing local storage:', e); }
}

export function recordTokenSubmissionReward(token: SubmittedToken, wallet: UserRewardWallet, userId?: string): { updatedWallet: UserRewardWallet; rewardEarnedTokens: number; rewardEarnedUsd: number } {
  let rewardTokens = REWARD_PER_SUBMISSION;
  if (token.safety.score >= 80) rewardTokens += REWARD_SAFETY_BONUS;
  const rewardUsd = rewardTokens * REWARD_RATE_USD;
  const newTx: RewardTransaction = { id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, type: token.safety.score >= 80 ? 'SAFETY_BONUS' : 'SUBMISSION_BONUS', amountTokens: rewardTokens, amountUsd: rewardUsd, tokenAddress: token.address, tokenSymbol: token.metadata.symbol, timestamp: new Date().toISOString(), status: 'COMPLETED' };
  const updatedWallet: UserRewardWallet = { ...wallet, totalTokens: wallet.totalTokens + rewardTokens, totalUsd: (wallet.totalTokens + rewardTokens) * REWARD_RATE_USD, unclaimedTokens: wallet.unclaimedTokens + rewardTokens, unclaimedUsd: (wallet.unclaimedTokens + rewardTokens) * REWARD_RATE_USD, totalSubmissions: wallet.totalSubmissions + 1, transactions: [newTx, ...wallet.transactions] };
  saveRewardWallet(updatedWallet, userId);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tokencare_wallet_updated', { detail: { wallet: updatedWallet, earnedTC: rewardTokens } }));
  }

  return { updatedWallet, rewardEarnedTokens: rewardTokens, rewardEarnedUsd: rewardUsd };
}

/**
 * Credits 15 TC per token for batch-verified tokens to the user's reward balance.
 */
export function recordBatchSubmissionReward(
  savedTokens: Array<{ name?: string; symbol?: string; contractAddress?: string; address?: string; blockchain?: string; [key: string]: any }>,
  userId?: string
): { updatedWallet: UserRewardWallet; earnedTC: number; earnedUsd: number } {
  const count = savedTokens.length;
  const currentWallet = getRewardWallet(userId);
  if (count <= 0) {
    return { updatedWallet: currentWallet, earnedTC: 0, earnedUsd: 0 };
  }

  const earnedTC = count * REWARD_PER_SUBMISSION; // 15 TC each
  const earnedUsd = earnedTC * REWARD_RATE_USD;

  const symbols = savedTokens.map((t) => t.symbol || 'TOK').filter(Boolean);
  const symbolsSummary = symbols.slice(0, 3).join(', ') + (symbols.length > 3 ? ` +${symbols.length - 3}` : '');

  const newTx: RewardTransaction = {
    id: `tx-batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: 'SUBMISSION_BONUS',
    amountTokens: earnedTC,
    amountUsd: earnedUsd,
    tokenAddress: savedTokens[0]?.contractAddress || savedTokens[0]?.address || 'batch',
    tokenSymbol: symbolsSummary || 'BATCH',
    timestamp: new Date().toISOString(),
    status: 'COMPLETED',
  };

  const updatedWallet: UserRewardWallet = {
    ...currentWallet,
    totalTokens: currentWallet.totalTokens + earnedTC,
    totalUsd: (currentWallet.totalTokens + earnedTC) * REWARD_RATE_USD,
    unclaimedTokens: currentWallet.unclaimedTokens + earnedTC,
    unclaimedUsd: (currentWallet.unclaimedTokens + earnedTC) * REWARD_RATE_USD,
    totalSubmissions: currentWallet.totalSubmissions + count,
    transactions: [newTx, ...currentWallet.transactions],
  };

  saveRewardWallet(updatedWallet, userId);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tokencare_wallet_updated', { detail: { wallet: updatedWallet, earnedTC } }));
  }

  return { updatedWallet, earnedTC, earnedUsd };
}

