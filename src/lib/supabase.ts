import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SubmittedToken, UserRewardWallet } from '../types';
import { REWARD_RATE_USD, getChainInfo, isEvmChain, validateTokenIdentifier } from '../constants/chains';
import { getDetailedDeviceAndNetworkInfo, DeviceAndNetworkInfo } from './deviceDetector';
import { saveSubmittedTokens, safeSetItem } from '../services/storage';

/**
 * Helper to ensure user ID passed to Postgres is a valid UUID format
 */
export function ensureValidUUID(id: string): string {
  if (!id) return '00000000-0000-0000-0000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.slice(0, 8)}-1111-4111-8111-${hex.padEnd(12, '0').slice(0, 12)}`;
}

const SUPABASE_URL_KEY = 'token_hub_supabase_url';
const SUPABASE_ANON_KEY_STORAGE = 'token_hub_supabase_anon_key';

// Hardcoded public Supabase configuration values (Public URL & Anon/Public Key only)
export const SUPABASE_URL = 'https://pqqomaveycjeorgurpev.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcW9tYXZleWNqZW9yZ3VycGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzkwMTAsImV4cCI6MjEwMTYxNTAxMH0.iLP3IXux4cc-ACPLBtciuauo2JXD8plcB3CAIXtzwEs';

export function getSupabaseConfig() {
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(SUPABASE_ANON_KEY_STORAGE, anonKey.trim());
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseInstance;
}

export interface SupabaseUserProfile {
  id: string;
  email: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  total_reward_balance: number;
  unclaimed_reward_balance: number;
  wallet_address?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Global token lookup by chain_id + contract_address using RPC find_token or query fallback
 */
export async function findTokenInSupabase(
  chainId: string,
  contractAddress: string
): Promise<any | null> {
  if (!contractAddress || !contractAddress.trim()) return null;
  const cleanAddress = contractAddress.trim().toLowerCase();
  const cleanChain = (chainId || '137').trim().toLowerCase();
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase.rpc('find_token', {
      p_chain_id: cleanChain,
      p_contract_address: cleanAddress,
    });

    if (!error && data && data.length > 0) {
      return data[0];
    }

    const { data: directData } = await supabase
      .from('tokens')
      .select('*')
      .ilike('contract_address', cleanAddress)
      .or(`chain_id.eq.${cleanChain},chain_id.ilike.${cleanChain}`)
      .maybeSingle();

    return directData || null;
  } catch (e) {
    console.warn('[Supabase] findToken error:', e);
    return null;
  }
}

/**
 * Explicit helper to check if a token is already saved for a specific user using RPC token_exists_for_user or fallback
 */
export async function checkTokenAlreadySaved(
  userId: string,
  chainId: string | number,
  contractAddress: string
): Promise<boolean> {
  if (!contractAddress || !contractAddress.trim()) return false;
  const cleanAddress = contractAddress.trim().toLowerCase();
  const cleanChain = String(chainId || '137').trim().toLowerCase();
  const supabase = getSupabase();

  console.log('[Supabase RPC Check] TOKEN DUPLICATE CHECK:', {
    userId,
    chainId: cleanChain,
    contractAddress: cleanAddress,
  });

  try {
    if (userId) {
      const { data: rpcVal, error: rpcErr } = await supabase.rpc('token_exists_for_user', {
        p_user_id: userId,
        p_chain_id: cleanChain,
        p_contract_address: cleanAddress,
      });

      if (!rpcErr && typeof rpcVal === 'boolean') {
        console.log('[Supabase RPC Check] TOKEN ALREADY EXISTS (rpc token_exists_for_user):', rpcVal);
        return rpcVal;
      }
    }

    const userCheck = await findUserTokenInSupabase(cleanChain, cleanAddress, userId);
    console.log('[Supabase RPC Check] TOKEN ALREADY EXISTS (findUserTokenInSupabase):', userCheck.exists);
    return userCheck.exists;
  } catch (err) {
    console.warn('[Supabase RPC Check] checkTokenAlreadySaved error:', err);
    return false;
  }
}

/**
 * Check whether THIS specific user has already saved a token on a given chain
 */
export async function findUserTokenInSupabase(
  chainId: string,
  contractAddress: string,
  userId?: string,
  blockchainType?: string
): Promise<{
  exists: boolean;
  userTokenId?: string;
  tokenId?: string;
  tokenData?: any;
}> {
  if (!contractAddress || !contractAddress.trim()) return { exists: false };
  const rawAddress = contractAddress.trim();
  const cleanChain = (chainId || '137').trim().toLowerCase();
  const isEvm = isEvmChain(cleanChain, blockchainType);
  const cleanAddress = isEvm ? rawAddress.toLowerCase() : rawAddress;
  const supabase = getSupabase();

  try {
    // 1. Try RPC function find_user_token
    const { data, error } = await supabase.rpc('find_user_token', {
      p_chain_id: cleanChain,
      p_contract_address: cleanAddress,
    });

    if (!error && data && data.length > 0) {
      const row = data[0];
      return {
        exists: true,
        userTokenId: row.user_token_id || row.id,
        tokenId: row.token_id || row.id,
        tokenData: row,
      };
    }

    // 2. Fallback query if RPC isn't available
    if (userId) {
      const { data: utData } = await supabase
        .from('user_tokens')
        .select('id, token_id, tokens!inner(*)')
        .eq('user_id', userId)
        .eq('tokens.chain_id', cleanChain)
        .ilike('tokens.contract_address', cleanAddress)
        .maybeSingle();

      if (utData) {
        return {
          exists: true,
          userTokenId: utData.id,
          tokenId: utData.token_id,
          tokenData: utData.tokens,
        };
      }

      // Legacy query fallback on tokens table directly
      const { data: tokenData } = await supabase
        .from('tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('chain_id', cleanChain)
        .ilike('contract_address', cleanAddress)
        .maybeSingle();

      if (tokenData) {
        return {
          exists: true,
          tokenId: tokenData.id,
          tokenData,
        };
      }
    }

    return { exists: false };
  } catch (e) {
    console.warn('[Supabase] findUserToken error:', e);
    return { exists: false };
  }
}

/**
 * Validate address format per blockchain and check if THIS USER already saved this token
 */
export async function verifyTokenContractUnique(
  contractAddress: string,
  chainId: string = '137',
  userId?: string,
  blockchainType?: string
): Promise<{
  isUnique: boolean;
  existingToken?: any;
  error?: string;
}> {
  if (!contractAddress || !contractAddress.trim()) {
    return { isUnique: false, error: 'Token address is required.' };
  }

  const rawAddress = contractAddress.trim();
  const cleanChain = (chainId || '137').trim().toLowerCase();

  // Validate according to blockchain type (EVM vs non-EVM)
  const validation = validateTokenIdentifier(blockchainType || cleanChain, rawAddress);
  if (!validation.isValid) {
    return {
      isUnique: false,
      error: validation.error || `Invalid address format "${contractAddress}".`,
    };
  }

  const check = await findUserTokenInSupabase(cleanChain, rawAddress, userId, blockchainType);

  if (check.exists) {
    return {
      isUnique: false,
      existingToken: check.tokenData,
      error: `You have already saved token address "${contractAddress}" on chain "${cleanChain}" to your account! Duplicate entries in your portfolio are prohibited.`,
    };
  }

  return { isUnique: true };
}

/**
 * Award token submission bounty in profile & trigger central notification
 */
export async function awardTokenSubmissionRewardInSupabase(userId: string, token: SubmittedToken) {
  if (!userId) return;
  const supabase = getSupabase();
  try {
    const reward = token.rewardEarnedTokens || 15;
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_reward_balance, unclaimed_reward_balance')
      .eq('id', userId)
      .maybeSingle();

    const currentTot = Number(profile?.total_reward_balance || 0);
    const currentUnclaimed = Number(profile?.unclaimed_reward_balance || profile?.total_reward_balance || 0);

    await supabase
      .from('profiles')
      .update({
        total_reward_balance: currentTot + reward,
        unclaimed_reward_balance: currentUnclaimed + reward,
      })
      .eq('id', userId);

    await createNotificationInSupabase({
      userId,
      type: 'reward',
      title: 'Reward Received',
      message: `💰 You received +${reward} TCR for adding ${token.metadata.name} (${token.metadata.symbol}).`,
      icon: 'reward',
      status: 'success',
      actionUrl: '/tokens',
      metadata: { symbol: token.metadata.symbol, reward },
    });
  } catch (balErr) {
    console.warn('[Supabase Profile Update Error]:', balErr);
  }
}

/**
 * Add token to global catalog and attach to user portfolio atomically
 * Uses strictly authenticated Supabase user ID from auth.getUser()
 */
export async function addTokenToUserInSupabase(
  token: SubmittedToken,
  userId?: string
): Promise<{
  success: boolean;
  alreadyExists?: boolean;
  error?: string;
  tokenId?: string;
  userTokenId?: string;
  tokenData?: any;
}> {
  const supabase = getSupabase();

  // 1. Obtain current authenticated user directly from Supabase session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated. Please log in to add tokens.' };
  }

  const activeUserId = user.id; // STRICTLY authenticated user ID! Never trust UI parameter or cached user ID.

  const meta = (token.metadata as any) || {};
  const cleanChain = (token.chainId || '137').trim().toLowerCase();

  const bType =
    meta.blockchainType ||
    meta.blockchain_type ||
    (isEvmChain(cleanChain, meta.blockchainType) ? 'evm' : cleanChain);

  const rawAddress = token.address.trim();
  const isEvm = isEvmChain(cleanChain, bType);
  const cleanAddress = isEvm ? rawAddress.toLowerCase() : rawAddress;

  try {
    // 2. Verify user doesn't already have it saved
    const userCheck = await findUserTokenInSupabase(cleanChain, rawAddress, activeUserId, bType);
    if (userCheck.exists) {
      return {
        success: true,
        alreadyExists: true,
        tokenId: userCheck.tokenId,
        userTokenId: userCheck.userTokenId,
        tokenData: userCheck.tokenData,
        error: `Token with address "${token.address}" on chain "${cleanChain}" is already in your saved account!`,
      };
    }

    const chainDetails = getChainInfo(cleanChain);
    const bName =
      meta.blockchainName ||
      meta.blockchain_name ||
      meta.blockchain ||
      meta.chainName ||
      meta.network ||
      chainDetails.name;

    const tStandard =
      meta.tokenStandard ||
      meta.token_standard ||
      (bType === 'evm' ? 'ERC-20' : bType === 'solana' || bType === 'spl' ? 'SPL' : bType === 'tron' || bType === 'trc20' ? 'TRC-20' : (bType ? String(bType).toUpperCase() : 'ERC-20'));

    const enrichedMetadata = {
      ...token.metadata,
      blockchainType: bType,
      blockchain_type: bType,
      blockchainName: bName,
      blockchain_name: bName,
      blockchain: bName,
      tokenStandard: tStandard,
      token_standard: tStandard,
      chainId: cleanChain,
      chain_id: cleanChain,
      chainName: bName,
      network: bName,
      chainSymbol: meta.chainSymbol || chainDetails.symbol,
    };

    // 3. Call RPC add_token_to_user
    const { data: rpcData, error: rpcError } = await supabase.rpc('add_token_to_user', {
      p_chain_id: cleanChain,
      p_contract_address: cleanAddress,
      p_name: token.metadata.name,
      p_symbol: token.metadata.symbol,
      p_decimals: token.metadata.decimals ?? 18,
      p_logo_url: token.metadata.logoUrl || '',
      p_verified: token.verified ?? true,
    });

    if (!rpcError && rpcData) {
      const alreadyExists = Boolean(rpcData.already_exists);
      const tokenId = rpcData.token_id;
      const userTokenId = rpcData.user_token_id;

      if (tokenId) {
        await supabase
          .from('tokens')
          .update({
            total_supply: token.metadata.totalSupply || '0',
            price_usd: token.marketData?.priceUsd || 0,
            safety_score: token.safety?.score || 0,
            safety_rating: token.safety?.rating || 'SAFE',
            reward_earned_tokens: token.rewardEarnedTokens || 15,
            metadata: enrichedMetadata,
            safety_data: token.safety,
            market_data: token.marketData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tokenId);
      }

      if (!alreadyExists) {
        await awardTokenSubmissionRewardInSupabase(activeUserId, token);
      }

      // Update user-scoped tokens cache
      const freshTokens = await fetchTokensFromSupabase(activeUserId);
      saveSubmittedTokens(freshTokens, activeUserId);

      return {
        success: true,
        alreadyExists,
        tokenId,
        userTokenId,
      };
    }

    // 4. Fallback to saveTokenToSupabase if RPC fails or isn't installed
    return await saveTokenToSupabase(token, activeUserId);
  } catch (err: any) {
    console.error('[Supabase] addTokenToUser error:', err);
    return { success: false, error: err.message || 'Failed to save token to database.' };
  }
}

/**
 * Remove saved token for current user
 * Uses strictly authenticated Supabase user ID
 */
export async function removeUserTokenFromSupabase(
  tokenId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated.' };
  }

  const activeUserId = user.id;

  try {
    const { error: rpcError } = await supabase.rpc('remove_user_token', {
      p_token_id: tokenId,
    });

    if (!rpcError) {
      const freshTokens = await fetchTokensFromSupabase(activeUserId);
      saveSubmittedTokens(freshTokens, activeUserId);
      return { success: true };
    }

    await supabase.from('user_tokens').delete().eq('user_id', activeUserId).eq('token_id', tokenId);
    await supabase.from('tokens').delete().eq('id', tokenId).eq('user_id', activeUserId);

    const freshTokens = await fetchTokensFromSupabase(activeUserId);
    saveSubmittedTokens(freshTokens, activeUserId);

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to remove token.' };
  }
}

/**
 * Save token metadata to Supabase 'tokens' table and update user reward balance
 * Uses strictly authenticated Supabase user ID
 */
export async function saveTokenToSupabase(
  token: SubmittedToken,
  userId?: string
): Promise<{ success: boolean; error?: string; tokenData?: any }> {
  const supabase = getSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated. Please log in to save tokens.' };
  }

  const activeUserId = user.id; // STRICTLY authenticated user ID

  const meta = (token.metadata as any) || {};
  const cleanChain = (token.chainId || 'polygon').trim().toLowerCase();

  const bType =
    meta.blockchainType ||
    meta.blockchain_type ||
    (isEvmChain(cleanChain, meta.blockchainType) ? 'evm' : cleanChain);

  const rawAddress = token.address.trim();
  const isEvm = isEvmChain(cleanChain, bType);
  const cleanAddress = isEvm ? rawAddress.toLowerCase() : rawAddress;

  // 1. Verify Uniqueness on this specific chain for this user
  const check = await verifyTokenContractUnique(rawAddress, cleanChain, activeUserId, bType);
  if (!check.isUnique) {
    return {
      success: false,
      error: check.error || `Token address already exists in your account.`,
    };
  }

  try {
    const chainDetails = getChainInfo(cleanChain);
    const bName =
      meta.blockchainName ||
      meta.blockchain_name ||
      meta.blockchain ||
      meta.chainName ||
      meta.network ||
      chainDetails.name;

    const tStandard =
      meta.tokenStandard ||
      meta.token_standard ||
      (bType === 'evm' ? 'ERC-20' : bType === 'solana' || bType === 'spl' ? 'SPL' : bType === 'tron' || bType === 'trc20' ? 'TRC-20' : (bType ? String(bType).toUpperCase() : 'ERC-20'));

    const enrichedMetadata = {
      ...token.metadata,
      blockchainType: bType,
      blockchain_type: bType,
      blockchainName: bName,
      blockchain_name: bName,
      blockchain: bName,
      tokenStandard: tStandard,
      token_standard: tStandard,
      chainId: cleanChain,
      chain_id: cleanChain,
      chainName: bName,
      network: bName,
      chainSymbol: meta.chainSymbol || chainDetails.symbol,
    };

    const payload = {
      user_id: activeUserId, // STRICTLY authenticated user ID!
      contract_address: cleanAddress,
      chain_id: cleanChain,
      name: token.metadata.name,
      symbol: token.metadata.symbol,
      decimals: token.metadata.decimals || 18,
      total_supply: token.metadata.totalSupply || '0',
      logo_url: token.metadata.logoUrl || '',
      price_usd: token.marketData?.priceUsd || 0,
      safety_score: token.safety?.score || 0,
      safety_rating: token.safety?.rating || 'SAFE',
      verified: token.verified ?? true,
      reward_earned_tokens: token.rewardEarnedTokens || 15,
      submitted_at: token.submittedAt || new Date().toISOString(),
      metadata: enrichedMetadata,
      safety_data: token.safety,
      market_data: token.marketData,
    };

    const { data, error } = await supabase.from('tokens').insert([payload]).select().single();

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: `Database constraint violation: Token with contract address "${token.address}" has already been saved!`,
        };
      }
      console.warn('[Supabase Insert Error]:', error);
      if (error.code !== '42P01') {
        return { success: false, error: error.message };
      }
    }

    await awardTokenSubmissionRewardInSupabase(activeUserId, token);

    // Refresh user-scoped cache
    const freshTokens = await fetchTokensFromSupabase(activeUserId);
    saveSubmittedTokens(freshTokens, activeUserId);

    return { success: true, tokenData: data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save token to Supabase.' };
  }
}

/**
 * Fetch all saved tokens for the authenticated user from Supabase
 * Strictly protected by Supabase session and user_id filtering
 */
export async function fetchTokensFromSupabase(userId?: string): Promise<SubmittedToken[]> {
  const supabase = getSupabase();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const activeUserId = user?.id || userId;

    if (!activeUserId) {
      // Unauthenticated users must NOT receive private user tokens
      return [];
    }

    let items: any[] = [];

    // Query user_tokens where user_id = activeUserId
    const { data: userTokensData, error: utError } = await supabase
      .from('user_tokens')
      .select('*, tokens(*)')
      .eq('user_id', activeUserId)
      .order('created_at', { ascending: false });

    if (!utError && userTokensData && userTokensData.length > 0) {
      items = userTokensData.map((ut: any) => ut.tokens).filter(Boolean);
    }

    // Fallback query on tokens table strictly by user_id = activeUserId
    if (items.length === 0) {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('user_id', activeUserId)
        .order('submitted_at', { ascending: false });

      if (!error && data) {
        items = data;
      }
    }

    const mappedTokens: SubmittedToken[] = items.map((item: any) => {
      const meta = item.metadata || {};
      const chainDetails = getChainInfo(item.chain_id);
      const bType = meta.blockchainType || meta.blockchain_type || item.blockchain_type || (isEvmChain(item.chain_id, meta.blockchainType) ? 'evm' : item.chain_id);
      const bName = meta.blockchainName || meta.blockchain_name || meta.blockchain || item.blockchain_name || meta.chainName || meta.network || chainDetails.name;
      const tStandard = meta.tokenStandard || meta.token_standard || item.token_standard || (bType === 'evm' ? 'ERC-20' : (bType ? String(bType).toUpperCase() : 'ERC-20'));

      const fullMetadata = {
        ...meta,
        address: item.contract_address,
        chainId: item.chain_id,
        blockchainType: bType,
        blockchain_type: bType,
        blockchainName: bName,
        blockchain_name: bName,
        blockchain: bName,
        tokenStandard: tStandard,
        token_standard: tStandard,
        chainName: bName,
        network: bName,
        name: item.name || meta.name,
        symbol: item.symbol || meta.symbol,
        decimals: item.decimals ?? meta.decimals,
        totalSupply: item.total_supply || meta.totalSupply,
        logoUrl: item.logo_url || meta.logoUrl,
      };

      return {
        id: item.id,
        address: item.contract_address,
        chainId: item.chain_id,
        metadata: fullMetadata,
        marketData: item.market_data || {
          priceUsd: item.price_usd || 0,
        },
        safety: item.safety_data || {
          score: item.safety_score || 80,
          rating: item.safety_rating || 'SAFE',
        },
        submittedAt: item.submitted_at || item.created_at,
        submittedBy: item.user_id ? `${String(item.user_id).slice(0, 6)}...` : 'Community',
        rewardEarnedTokens: item.reward_earned_tokens || 15,
        rewardEarnedUsd: (item.reward_earned_tokens || 15) * REWARD_RATE_USD,
        upvotes: item.upvotes || 1,
        verified: item.verified,
      };
    });

    // Save strictly to active user's local cache key
    saveSubmittedTokens(mappedTokens, activeUserId);

    return mappedTokens;
  } catch {
    return [];
  }
}

/**
 * Fetch all public tokens from Cloud Storage / Supabase DB 'tokens' table
 */
export async function fetchAllGlobalTokensFromSupabase(): Promise<SubmittedToken[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error || !data || !Array.isArray(data)) return [];

    return data.map((item: any) => {
      const meta = item.metadata || {};
      const chainDetails = getChainInfo(item.chain_id);
      const bType = meta.blockchainType || meta.blockchain_type || item.blockchain_type || (isEvmChain(item.chain_id, meta.blockchainType) ? 'evm' : item.chain_id);
      const bName = meta.blockchainName || meta.blockchain_name || meta.blockchain || item.blockchain_name || meta.chainName || meta.network || chainDetails.name;
      const tStandard = meta.tokenStandard || meta.token_standard || item.token_standard || (bType === 'evm' ? 'ERC-20' : (bType ? String(bType).toUpperCase() : 'ERC-20'));

      const fullMetadata = {
        ...meta,
        address: item.contract_address,
        chainId: item.chain_id,
        blockchainType: bType,
        blockchain_type: bType,
        blockchainName: bName,
        blockchain_name: bName,
        blockchain: bName,
        tokenStandard: tStandard,
        token_standard: tStandard,
        chainName: bName,
        network: bName,
        name: item.name || meta.name || 'Token',
        symbol: item.symbol || meta.symbol || 'TOK',
        decimals: item.decimals ?? meta.decimals,
        totalSupply: item.total_supply || meta.totalSupply,
        logoUrl: item.logo_url || meta.logoUrl,
      };

      return {
        id: item.id,
        address: item.contract_address,
        chainId: item.chain_id,
        metadata: fullMetadata,
        marketData: item.market_data || {
          priceUsd: item.price_usd || 0,
        },
        safety: item.safety_data || {
          score: item.safety_score || 80,
          rating: item.safety_rating || 'SAFE',
        },
        submittedAt: item.submitted_at || item.created_at,
        submittedBy: item.user_id ? `${String(item.user_id).slice(0, 6)}...` : 'Community',
        rewardEarnedTokens: item.reward_earned_tokens || 15,
        rewardEarnedUsd: (item.reward_earned_tokens || 15) * REWARD_RATE_USD,
        upvotes: item.upvotes || 1,
        verified: item.verified,
      };
    });
  } catch (e) {
    console.warn('[Supabase fetchAllGlobalTokensFromSupabase] Error:', e);
    return [];
  }
}

/**
 * Fetch user profile combining LocalStorage cache, Supabase 'profiles' table, and Auth session metadata.
 * Automatically checks the 'profiles' table and creates a row if none exists!
 */
export async function getUserProfile(userId: string, sessionUser?: any): Promise<SupabaseUserProfile> {
  const supabase = getSupabase();
  let cachedProfile: Partial<SupabaseUserProfile> = {};

  // 1. Check local storage cache
  try {
    const raw = localStorage.getItem(`tokencare_profile_${userId}`);
    if (raw) {
      cachedProfile = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[Supabase Profile] LocalStorage cache read error:', e);
  }

  // 2. Fetch from Supabase 'profiles' table
  let dbProfile: any = null;
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      dbProfile = data;
    } else if (!error && userId) {
      // Profile row DOES NOT EXIST yet in Supabase! Automatically create row in profiles table.
      const email = sessionUser?.email || cachedProfile.email || '';
      const defaultUsername = email ? email.split('@')[0] : `user_${String(userId || '').slice(0, 6)}`;
      const autoProfilePayload = {
        id: userId,
        email: email,
        username: defaultUsername,
        avatar_url: sessionUser?.user_metadata?.avatar_url || cachedProfile.avatar_url || '',
        total_reward_balance: 0,
        unclaimed_reward_balance: 0,
        wallet_address: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        const { data: insertedData } = await supabase
          .from('profiles')
          .insert([autoProfilePayload])
          .select()
          .maybeSingle();
        if (insertedData) {
          dbProfile = insertedData;
        } else {
          dbProfile = autoProfilePayload;
        }
      } catch (insertErr) {
        console.warn('[Supabase Profile] Auto-create profile row note:', insertErr);
        dbProfile = autoProfilePayload;
      }
    }
  } catch (err) {
    console.warn('[Supabase Profile] DB fetch error:', err);
  }

  // 3. Fallback to auth session metadata
  const meta = sessionUser?.user_metadata || {};
  const email = sessionUser?.email || dbProfile?.email || cachedProfile.email || '';
  const defaultUsername = email ? email.split('@')[0] : `user_${String(userId || '').slice(0, 6)}`;

  const mergedProfile: SupabaseUserProfile = {
    id: userId,
    email: email,
    username:
      dbProfile?.username ||
      cachedProfile.username ||
      meta.username ||
      defaultUsername,
    display_name:
      dbProfile?.username ||
      cachedProfile.display_name ||
      meta.full_name ||
      meta.display_name ||
      defaultUsername,
    avatar_url:
      dbProfile?.avatar_url ||
      cachedProfile.avatar_url ||
      meta.avatar_url ||
      '',
    total_reward_balance: Number(
      dbProfile?.total_reward_balance ??
        cachedProfile.total_reward_balance ??
        0
    ),
    unclaimed_reward_balance: Number(
      dbProfile?.unclaimed_reward_balance ??
        cachedProfile.unclaimed_reward_balance ??
        0
    ),
    wallet_address: dbProfile?.wallet_address || cachedProfile.wallet_address || null,
    created_at: dbProfile?.created_at || cachedProfile.created_at || new Date().toISOString(),
    updated_at: dbProfile?.updated_at || cachedProfile.updated_at || new Date().toISOString(),
  };

  // Cache back to LocalStorage
  try {
    safeSetItem(`tokencare_profile_${userId}`, JSON.stringify(mergedProfile));
  } catch {}

  return mergedProfile;
}

/**
 * Update user profile in Supabase profiles table using strictly existing columns (id, email, username, avatar_url, wallet_address, updated_at)
 */
export async function updateUserProfile(
  userId: string,
  updates: { username?: string; display_name?: string; avatar_url?: string; wallet_address?: string },
  sessionUser?: any
): Promise<{ success: boolean; error?: string; profile?: SupabaseUserProfile }> {
  const supabase = getSupabase();
  try {
    const username = updates.username?.trim();
    const avatarUrl = updates.avatar_url !== undefined ? updates.avatar_url?.trim() : undefined;
    const walletAddress = updates.wallet_address !== undefined ? updates.wallet_address?.trim() : undefined;

    const email = sessionUser?.email || '';

    // Only include schema-supported columns in profiles table
    const payload: any = {
      id: userId,
      updated_at: new Date().toISOString(),
    };
    if (email) payload.email = email;
    if (username) payload.username = username;
    if (avatarUrl !== undefined) payload.avatar_url = avatarUrl;
    if (walletAddress !== undefined) payload.wallet_address = walletAddress;

    // 1. Immediately update LocalStorage so user data is NEVER lost on page reload
    let localCache: Partial<SupabaseUserProfile> = {};
    try {
      const raw = localStorage.getItem(`tokencare_profile_${userId}`);
      if (raw) localCache = JSON.parse(raw);
    } catch {}

    const updatedProfile: SupabaseUserProfile = {
      ...localCache,
      id: userId,
      email: email || localCache.email || '',
      username: username || localCache.username || '',
      display_name: updates.display_name || username || localCache.display_name || '',
      avatar_url: avatarUrl !== undefined ? avatarUrl : (localCache.avatar_url || ''),
      wallet_address: walletAddress !== undefined ? walletAddress : (localCache.wallet_address || null),
      total_reward_balance: localCache.total_reward_balance || 0,
      unclaimed_reward_balance: localCache.unclaimed_reward_balance || 0,
      updated_at: payload.updated_at,
    };

    try {
      safeSetItem(`tokencare_profile_${userId}`, JSON.stringify(updatedProfile));
    } catch (lsErr) {
      console.warn('LocalStorage save error:', lsErr);
    }

    // 2. Upsert into Supabase 'profiles' table
    let dbResult: any = null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (data) {
        dbResult = data;
      } else if (error) {
        console.warn('Supabase profiles upsert notice:', error.message);
      }
    } catch (dbErr) {
      console.warn('Supabase DB connection note:', dbErr);
    }

    // 3. Sync into Supabase Auth User Metadata
    try {
      await supabase.auth.updateUser({
        data: {
          username: username,
          avatar_url: avatarUrl,
        },
      });
    } catch (authErr) {
      console.warn('Supabase Auth metadata update note:', authErr);
    }

    const finalProfile: SupabaseUserProfile = dbResult
      ? { ...updatedProfile, ...dbResult }
      : updatedProfile;

    try {
      safeSetItem(`tokencare_profile_${userId}`, JSON.stringify(finalProfile));
    } catch {}

    return {
      success: true,
      profile: finalProfile,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update profile.' };
  }
}

/**
 * Delete current user account and profile entry
 */
export async function deleteUserAccount(): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return { success: false, error: 'No active session found.' };
    }

    const userId = session.user.id;

    // Remove from profiles table if exists
    await supabase.from('profiles').delete().eq('id', userId);

    // Sign out user session
    await supabase.auth.signOut();

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete user account.' };
  }
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount_tokens: number;
  amount_usd: number;
  wallet_address: string;
  chain_id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  tx_hash?: string;
  error_message?: string;
  created_at: string;
  processing_started_at?: string;
  completed_at?: string;
  failed_at?: string;
  updated_at?: string;
}

/**
 * Submit a withdrawal request to Supabase DB and deduct unclaimed reward balance
 */
export async function submitWithdrawalRequest(
  userId: string,
  amountTokens: number,
  walletAddress: string,
  chainId: string = '137'
): Promise<{ success: boolean; request?: WithdrawalRequest; error?: string }> {
  const supabase = getSupabase();
  const amountUsd = amountTokens * REWARD_RATE_USD;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim())) {
    return { success: false, error: 'Invalid EVM wallet address format (must be 0x followed by 40 hex chars).' };
  }

  if (amountTokens <= 0) {
    return { success: false, error: 'Withdrawal amount must be greater than 0.' };
  }

  const fallbackReq: WithdrawalRequest = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `wtx-${Date.now()}`,
    user_id: userId,
    amount_tokens: amountTokens,
    amount_usd: amountUsd,
    wallet_address: walletAddress.trim(),
    chain_id: chainId,
    status: 'PENDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let createdRecord: WithdrawalRequest = fallbackReq;

  // 1. First try calling SQL RPC create_withdrawal_request (Atomic DB function)
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('create_withdrawal_request', {
      p_amount_tokens: amountTokens,
      p_amount_usd: amountUsd,
      p_wallet_address: walletAddress.trim(),
      p_chain_id: chainId,
    });

    if (!rpcErr && rpcData) {
      createdRecord = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    } else {
      if (rpcErr && rpcErr.message && rpcErr.message.includes('Insufficient reward balance')) {
        return { success: false, error: rpcErr.message };
      }
      // Fallback to standard table insert if RPC isn't deployed yet
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: userId,
          amount_tokens: amountTokens,
          amount_usd: amountUsd,
          wallet_address: walletAddress.trim(),
          chain_id: chainId,
          status: 'PENDING',
        })
        .select()
        .maybeSingle();

      if (data) {
        createdRecord = data;
      } else if (error) {
        console.warn('[Supabase] withdrawal_requests table insert note:', error.message);
      }
    }
  } catch (dbErr) {
    console.warn('[Supabase] withdrawal_requests RPC/DB note:', dbErr);
  }

  // 2. LocalStorage sync & cache
  try {
    const cacheKey = `tokencare_withdrawals_${userId}`;
    const raw = localStorage.getItem(cacheKey);
    const history: WithdrawalRequest[] = raw ? JSON.parse(raw) : [];
    history.unshift(createdRecord);
    safeSetItem(cacheKey, JSON.stringify(history.slice(0, 50)));
  } catch (lsErr) {
    console.warn('LocalStorage save error for withdrawals:', lsErr);
  }

  // 3. Deduct unclaimed_reward_balance in profile
  try {
    const profileKey = `tokencare_profile_${userId}`;
    const rawP = localStorage.getItem(profileKey);
    let currentUnclaimed = 0;
    let totalBal = 0;
    if (rawP) {
      const p = JSON.parse(rawP);
      currentUnclaimed = Number(p.unclaimed_reward_balance || 0);
      totalBal = Number(p.total_reward_balance || 0);
    }

    const newUnclaimed = Math.max(0, currentUnclaimed - amountTokens);

    // Update Local Storage
    safeSetItem(
      profileKey,
      JSON.stringify({
        ...(rawP ? JSON.parse(rawP) : {}),
        unclaimed_reward_balance: newUnclaimed,
      })
    );

    // Update DB profiles table
    await supabase
      .from('profiles')
      .update({
        unclaimed_reward_balance: newUnclaimed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (e) {
    console.warn('Profile balance deduction note:', e);
  }

  // 4. Trigger persistent notification in Supabase DB & LocalStorage
  try {
    const wAddr = String(walletAddress || '');
    await createNotificationInSupabase({
      userId,
      type: 'withdrawal',
      title: 'Withdrawal Request Submitted',
      message: `💸 Withdrawal request for ${amountTokens} REWARD ($${amountUsd.toFixed(2)}) sent to ${wAddr ? `${wAddr.slice(0, 6)}...${wAddr.slice(-4)}` : 'Wallet'}.`,
      icon: 'withdrawal',
      status: 'pending',
      actionUrl: '/withdrawals',
      metadata: {
        amountTokens,
        amountUsd,
        walletAddress,
        chainId,
      },
    });
  } catch (notifErr) {
    console.warn('Withdrawal notification creation note:', notifErr);
  }

  return {
    success: true,
    request: createdRecord,
  };
}

/**
 * Fetch all withdrawal requests for a user from Supabase / LocalStorage
 */
export async function fetchWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]> {
  const supabase = getSupabase();
  let dbRequests: WithdrawalRequest[] = [];

  // 1. Try DB
  try {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      dbRequests = data;
    }
  } catch (err) {
    console.warn('[Supabase] fetchWithdrawalRequests note:', err);
  }

  // 2. Read LocalStorage cache
  let localRequests: WithdrawalRequest[] = [];
  try {
    const raw = localStorage.getItem(`tokencare_withdrawals_${userId}`);
    if (raw) {
      localRequests = JSON.parse(raw);
    }
  } catch (lsErr) {
    console.warn('LocalStorage read error for withdrawals:', lsErr);
  }

  // Merge and deduplicate by id
  const map = new Map<string, WithdrawalRequest>();
  localRequests.forEach((req) => map.set(req.id, req));
  dbRequests.forEach((req) => map.set(req.id, req));

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return merged;
}

export interface SavedUserAddress {
  id?: string;
  user_id: string;
  wallet_address: string;
  chain_id: string;
  verified: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Verify EVM address format & check validity on Polygon network via RPC
 */
export async function verifyAddressOnPolygon(address: string): Promise<{ isValid: boolean; isContract?: boolean; error?: string }> {
  if (!address || !address.trim()) {
    return { isValid: false, error: 'Address cannot be empty.' };
  }

  const clean = address.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(clean)) {
    return { isValid: false, error: 'Invalid EVM address format. Must start with 0x followed by 40 hex characters.' };
  }

  try {
    // Public Polygon RPC endpoint
    const res = await fetch('https://polygon-rpc.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [clean, 'latest'],
        id: 1,
      }),
    });

    const data = await res.json();
    if (data && data.result !== undefined) {
      return { isValid: true };
    }
  } catch (err) {
    console.warn('[Polygon RPC Address Check] RPC network note:', err);
  }

  // Fallback: Valid 0x EVM hex format passes
  return { isValid: true };
}

/**
 * Save or update single user payout address in Supabase 'user_addresses' or 'profiles' table
 */
export async function saveUserWithdrawalAddress(
  userId: string,
  address: string
): Promise<{ success: boolean; address?: string; error?: string }> {
  const cleanAddr = address.trim();

  // 1. Verify on Polygon RPC
  const verification = await verifyAddressOnPolygon(cleanAddr);
  if (!verification.isValid) {
    return { success: false, error: verification.error || 'Address verification failed on Polygon network.' };
  }

  const supabase = getSupabase();

  // 2. Save in LocalStorage
  try {
    localStorage.setItem(`tokencare_saved_address_${userId}`, cleanAddr);
  } catch (e) {
    console.warn('LocalStorage save error for address:', e);
  }

  // 3. Upsert into 'user_addresses' table
  try {
    const { error } = await supabase
      .from('user_addresses')
      .upsert(
        {
          user_id: userId,
          wallet_address: cleanAddr,
          chain_id: '137',
          verified: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error && error.code !== '42P01') {
      console.warn('user_addresses table upsert notice:', error.message);
    }
  } catch (dbErr) {
    console.warn('Supabase user_addresses save note:', dbErr);
  }

  // Also sync address directly into profiles table (wallet_address column)
  try {
    await supabase.from('profiles').update({ wallet_address: cleanAddr, updated_at: new Date().toISOString() }).eq('id', userId);
  } catch (e) {
    console.warn('Profile wallet_address sync note:', e);
  }

  return { success: true, address: cleanAddr };
}

/**
 * Upload profile avatar image to Supabase Storage 'avatars' bucket
 */
export async function uploadAvatarToSupabaseStorage(
  userId: string,
  file: File
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  const supabase = getSupabase();
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    // Upload image to 'avatars' bucket in Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadErr) {
      console.warn('[Supabase Storage Upload Warning]:', uploadErr.message);
      // Fallback if bucket is not public/created or upload fails: convert file to Base64/DataURL so user profile photo ALWAYS displays!
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            success: true,
            publicUrl: reader.result as string,
          });
        };
        reader.onerror = () => {
          resolve({ success: false, error: uploadErr.message });
        };
        reader.readAsDataURL(file);
      });
    }

    // Get public URL from Supabase Storage 'avatars' bucket
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl || '';

    return { success: true, publicUrl };
  } catch (err: any) {
    console.error('[Avatar Upload Error]:', err);
    return { success: false, error: err.message || 'Failed to upload avatar.' };
  }
}

/**
 * Fetch saved withdrawal address for user from profiles table or user_addresses or LocalStorage
 */
export async function getUserWithdrawalAddress(userId: string): Promise<string | null> {
  const supabase = getSupabase();

  // 1. Try DB profiles table (wallet_address column)
  try {
    const { data } = await supabase.from('profiles').select('wallet_address').eq('id', userId).maybeSingle();
    if (data?.wallet_address && /^0x[a-fA-F0-9]{40}$/.test(data.wallet_address.trim())) {
      return data.wallet_address.trim();
    }
  } catch {}

  // 2. Try DB user_addresses table
  try {
    const { data } = await supabase.from('user_addresses').select('wallet_address').eq('user_id', userId).maybeSingle();
    if (data?.wallet_address && /^0x[a-fA-F0-9]{40}$/.test(data.wallet_address.trim())) {
      return data.wallet_address.trim();
    }
  } catch {}

  // 3. Try LocalStorage
  try {
    const local = localStorage.getItem(`tokencare_saved_address_${userId}`);
    if (local && /^0x[a-fA-F0-9]{40}$/.test(local)) return local;
  } catch {}

  return null;
}

/**
 * Realtime Database Subscription Helper to auto-update UI when DB changes (e.g. token deleted)
 */
export function subscribeToDatabaseChanges(
  onTokensChanged: () => void,
  onProfileChanged?: () => void
) {
  const supabase = getSupabase();

  try {
    const channel = supabase
      .channel('db_changes_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tokens' },
        () => {
          console.log('[Supabase Realtime] Tokens table updated!');
          onTokensChanged();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          console.log('[Supabase Realtime] Profiles table updated!');
          if (onProfileChanged) onProfileChanged();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[Supabase Realtime] Setup error:', err);
    return () => {};
  }
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  icon?: string | null;
  status?: string | null;
  action_url?: string | null;
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  expires_at?: string | null;
}

/**
 * Central generic notification creation API function (saves to Supabase DB and LocalStorage)
 */
export async function createNotificationInSupabase(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  icon?: string;
  status?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  expiresAt?: string;
}): Promise<string> {
  const supabase = getSupabase();
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const validUuid = ensureValidUUID(params.userId);

  const newNotif: AppNotification = {
    id,
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    icon: params.icon || null,
    status: params.status || null,
    action_url: params.actionUrl || null,
    metadata: params.metadata || {},
    is_read: false,
    created_at: new Date().toISOString(),
    expires_at: params.expiresAt || null,
  };

  // 1. LocalStorage cache insert across both original userId and UUID key
  try {
    const keys = Array.from(new Set([`tokencare_notifications_${params.userId}`, `tokencare_notifications_${validUuid}`]));
    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      const list: AppNotification[] = raw ? JSON.parse(raw) : [];
      // Unshift new notification
      list.unshift(newNotif);
      safeSetItem(key, JSON.stringify(list.slice(0, 30)));
    });
  } catch (e) {
    console.warn('LocalStorage notification insert note:', e);
  }

  // 2. Database RPC and Direct Table Insert
  try {
    const { data: rpcId, error: rpcErr } = await supabase.rpc('create_notification', {
      p_user_id: validUuid,
      p_type: params.type,
      p_title: params.title,
      p_message: params.message,
      p_icon: params.icon || null,
      p_status: params.status || null,
      p_action_url: params.actionUrl || null,
      p_metadata: params.metadata || {},
      p_expires_at: params.expiresAt || null,
    });

    if (!rpcErr && rpcId) {
      return rpcId as string;
    }

    // Direct table insert fallback
    const { data: insertData, error: insertErr } = await supabase
      .from('notifications')
      .insert({
        user_id: validUuid,
        type: params.type,
        title: params.title,
        message: params.message,
        icon: params.icon || null,
        status: params.status || null,
        action_url: params.actionUrl || null,
        metadata: params.metadata || {},
        is_read: false,
        expires_at: params.expiresAt || null,
      })
      .select('id')
      .maybeSingle();

    if (insertData?.id) return insertData.id;
    if (insertErr) {
      console.warn('[Supabase] Notifications table insert note:', insertErr.message);
    }
  } catch (err) {
    console.warn('[Supabase] createNotificationInSupabase error:', err);
  }

  return id;
}

/**
 * Multi-device login tracking helper with real browser, device & IP detection
 */
export async function trackUserDeviceInSupabase(
  userId: string,
  customInfo?: Partial<DeviceAndNetworkInfo>
): Promise<DeviceAndNetworkInfo> {
  const supabase = getSupabase();
  const validUuid = ensureValidUUID(userId);

  // 1. Detect user device, browser, operating system & IP network location
  const detected = await getDetailedDeviceAndNetworkInfo();
  const info: DeviceAndNetworkInfo = {
    ...detected,
    ...customInfo,
  };

  let deviceId = '';
  try {
    deviceId = localStorage.getItem('tokencare_device_id') || '';
    if (!deviceId) {
      deviceId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('tokencare_device_id', deviceId);
    }
  } catch {
    deviceId = `dev-session-${Date.now()}`;
  }

  try {
    // 2. Try DB RPC
    const { error: rpcErr } = await supabase.rpc('track_user_device', {
      p_user_id: validUuid,
      p_device_id: deviceId,
      p_device_name: info.deviceName,
      p_platform: info.platform,
      p_app_version: '1.0.0',
      p_country: info.locationString,
      p_last_ip: info.ip,
    });

    // 3. Fallback table check & insert
    const localTrackKey = `tokencare_device_tracked_${userId}_${deviceId}`;
    const trackedLocally = localStorage.getItem(localTrackKey);

    const { data: existing } = await supabase
      .from('user_devices')
      .select('id')
      .eq('user_id', validUuid)
      .eq('device_id', deviceId)
      .maybeSingle();

    if (!existing && !trackedLocally) {
      localStorage.setItem(localTrackKey, 'true');

      try {
        await supabase.from('user_devices').insert({
          user_id: validUuid,
          device_id: deviceId,
          device_name: info.deviceName,
          platform: info.platform,
          country: info.locationString,
          ip_address: info.ip,
        });
      } catch {}

      // Trigger Security Notification with full Browser, Device, IP and Location details
      await createNotificationInSupabase({
        userId,
        type: 'security',
        title: 'New Security Alert: Login Detected',
        message: `📢 New login detected from ${info.deviceName} (${info.browser} on ${info.os}). IP: ${info.ip} (${info.locationString}).`,
        icon: 'security',
        status: 'warning',
        actionUrl: '/settings',
        metadata: {
          ip: info.ip,
          browser: info.browser,
          os: info.os,
          deviceType: info.deviceType,
          location: info.locationString,
          timestamp: new Date().toISOString(),
        },
      });
    } else if (existing?.id) {
      try {
        await supabase
          .from('user_devices')
          .update({
            last_seen: new Date().toISOString(),
            ip_address: info.ip,
          })
          .eq('id', existing.id);
      } catch {}
    }
  } catch (err) {
    console.warn('[Supabase] trackUserDeviceInSupabase error:', err);
  }

  return info;
}

/**
 * Get cached user notifications synchronously from LocalStorage
 */
export function getCachedNotifications(userId: string): AppNotification[] {
  if (!userId) return [];
  const validUuid = ensureValidUUID(userId);
  let localNotifications: AppNotification[] = [];

  try {
    const keys = Array.from(new Set([`tokencare_notifications_${userId}`, `tokencare_notifications_${validUuid}`]));
    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localNotifications = localNotifications.concat(parsed);
        }
      }
    });
  } catch (lsErr) {
    console.warn('LocalStorage read error for notifications:', lsErr);
  }

  // Filter out legacy default dummy notifications
  localNotifications = localNotifications.filter(
    (n) =>
      n &&
      typeof n === 'object' &&
      n.id &&
      !n.id.startsWith('notif-welcome-') &&
      !n.id.startsWith('notif-reward-info-') &&
      n.id !== 'n1' &&
      n.id !== 'n2' &&
      n.id !== 'n3' &&
      n.id !== 'n4' &&
      n.id !== 'n5' &&
      n.id !== 'n6'
  );

  // Deduplicate cached list by id while preserving read status
  const map = new Map<string, AppNotification>();
  localNotifications.forEach((n) => {
    if (!map.has(n.id)) {
      map.set(n.id, n);
    } else {
      const existing = map.get(n.id)!;
      map.set(n.id, {
        ...n,
        is_read: existing.is_read || n.is_read,
      });
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || Date.now()).getTime() - new Date(a.created_at || Date.now()).getTime()
  );
}

/**
 * Save cached user notifications to LocalStorage
 */
export function saveCachedNotifications(userId: string, notifications: AppNotification[]): void {
  if (!userId) return;
  const validUuid = ensureValidUUID(userId);
  try {
    const keys = Array.from(new Set([`tokencare_notifications_${userId}`, `tokencare_notifications_${validUuid}`]));
    const trimmed = (notifications || []).slice(0, 30);
    const jsonStr = JSON.stringify(trimmed);
    keys.forEach((key) => {
      safeSetItem(key, jsonStr);
    });
  } catch (e) {
    console.warn('LocalStorage saveCachedNotifications note:', e);
  }
}

/**
 * Fetch user notifications from Supabase DB, merge with LocalStorage cache and persist updated cache
 */
export async function fetchUserNotifications(userId: string): Promise<AppNotification[]> {
  const supabase = getSupabase();
  const validUuid = ensureValidUUID(userId);
  const cachedList = getCachedNotifications(userId);
  let dbNotifications: AppNotification[] = [];

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${validUuid},user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      dbNotifications = data;
    }
  } catch (err) {
    console.warn('[Supabase] fetchUserNotifications error:', err);
  }

  if (dbNotifications.length === 0 && cachedList.length === 0) {
    return [];
  }

  // Merge cached and db notifications while preserving read status
  const map = new Map<string, AppNotification>();
  cachedList.forEach((n) => map.set(n.id, n));
  dbNotifications.forEach((n) => {
    const existing = map.get(n.id);
    if (existing) {
      map.set(n.id, {
        ...n,
        is_read: existing.is_read || n.is_read,
      });
    } else {
      map.set(n.id, n);
    }
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || Date.now()).getTime() - new Date(a.created_at || Date.now()).getTime()
  );

  // Persist fresh merged notifications to cache
  saveCachedNotifications(userId, merged);

  return merged;
}

/**
 * Fetch unread notification count for a user
 */
export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const cached = getCachedNotifications(userId);
    if (cached.length > 0) {
      const unread = cached.filter((n) => !n.is_read).length;
      // Trigger background sync silently
      fetchUserNotifications(userId).catch(() => {});
      return unread;
    }
    const notifs = await fetchUserNotifications(userId);
    return notifs.filter((n) => !n.is_read).length;
  } catch (err) {
    console.warn('[Supabase] fetchUnreadNotificationCount warning:', err);
    return 0;
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(id: string, userId: string): Promise<void> {
  const supabase = getSupabase();

  // LocalStorage update
  try {
    const cached = getCachedNotifications(userId);
    const updated = cached.map((n) => (n.id === id ? { ...n, is_read: true } : n));
    saveCachedNotifications(userId, updated);
  } catch (e) {
    console.warn('LocalStorage notification mark read note:', e);
  }

  // DB update
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', userId);
  } catch (err) {
    console.warn('Supabase mark notification read note:', err);
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const supabase = getSupabase();

  // LocalStorage update
  try {
    const cached = getCachedNotifications(userId);
    const updated = cached.map((n) => ({ ...n, is_read: true }));
    saveCachedNotifications(userId, updated);
  } catch (e) {
    console.warn('LocalStorage mark all read note:', e);
  }

  // DB update
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  } catch (err) {
    console.warn('Supabase mark all read note:', err);
  }
}

/**
 * Realtime subscription helper for user notifications
 */
export function subscribeToRealtimeNotifications(
  userId: string,
  onNotificationChange: (newNotif?: AppNotification) => void
): () => void {
  const supabase = getSupabase();
  const validUuid = ensureValidUUID(userId);

  try {
    const channel = supabase
      .channel(`user_notifications_${userId}_${Math.random().toString(36).substring(2, 7)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload: any) => {
          const rowUser = payload.new?.user_id || payload.old?.user_id;
          if (rowUser === userId || rowUser === validUuid) {
            let newItem: AppNotification | undefined = undefined;
            if (payload.eventType === 'INSERT' && payload.new) {
              newItem = payload.new as AppNotification;
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              newItem = payload.new as AppNotification;
            }
            onNotificationChange(newItem);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[Supabase Realtime Notifications] Setup error:', err);
    return () => {};
  }
}



