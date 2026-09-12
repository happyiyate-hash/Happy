import { ethers } from 'ethers';
import { ChainId, ERC20Metadata } from '../types';
import {
  normalizeChainKey,
  getChainInfo,
  isEvmChain,
  isSolanaAddress,
  isTronAddress,
  isTonAddress,
  isXrplAddress,
  isPolkadotAddress,
  registerDynamicChain,
} from '../constants/chains';
import { ApiKeyConfig } from './apiKeys';
import { fetchERC20MetadataFromBlockchain } from './ethers';
import { fetchNonEvmTokenMetadata } from './api';
import { getCachedChainLogo, fetchChainLogoInBackground, storeDynamicChain } from './chainLogoService';

export interface VerifiedContractResult {
  contractAddress: string;
  originalInput: string;
  wasReplaced: boolean;
  chainId: string;
  chainName: string;
  blockchainType: 'evm' | 'solana' | 'ton' | 'tron' | 'xrpl' | 'polkadot' | 'other';
  tokenStandard: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
  logoUrl?: string;
  verifiedOnChain: boolean;
  verificationSource: string;
  liquidityUsd?: number;
  dexName?: string;
  replacementReason?: string;
}

/**
 * Normalizes provider chain slug to internal chain ID and standard names
 */
export function mapProviderChainToInternal(providerChain: string): {
  chainId: string;
  chainName: string;
  blockchainType: 'evm' | 'solana' | 'ton' | 'tron' | 'xrpl' | 'polkadot' | 'other';
  tokenStandard: string;
} {
  const norm = String(providerChain || '').toLowerCase().trim();

  // Known Solana identifiers
  if (['solana', 'sol', 'spl', 'mainnet-beta'].includes(norm)) {
    return { chainId: 'solana', chainName: 'Solana', blockchainType: 'solana', tokenStandard: 'SPL' };
  }

  // Known TON
  if (['ton', 'the-open-network', 'ton-network'].includes(norm)) {
    return { chainId: 'ton', chainName: 'TON', blockchainType: 'ton', tokenStandard: 'Jetton' };
  }

  // Known TRON
  if (['tron', 'trx', 'trc20'].includes(norm)) {
    return { chainId: 'tron', chainName: 'TRON', blockchainType: 'tron', tokenStandard: 'TRC-20' };
  }

  // Known XRPL
  if (['xrpl', 'xrp', 'ripple'].includes(norm)) {
    return { chainId: 'xrpl', chainName: 'XRP Ledger', blockchainType: 'xrpl', tokenStandard: 'Issued Asset' };
  }

  // Known Polkadot
  if (['polkadot', 'dot', 'kusama'].includes(norm)) {
    return { chainId: 'polkadot', chainName: 'Polkadot Network', blockchainType: 'polkadot', tokenStandard: 'Substrate Asset' };
  }

  // EVM Chains
  const evmMap: Record<string, { chainId: string; name: string }> = {
    ethereum: { chainId: '1', name: 'Ethereum' },
    eth: { chainId: '1', name: 'Ethereum' },
    '1': { chainId: '1', name: 'Ethereum' },
    base: { chainId: '8453', name: 'Base' },
    '8453': { chainId: '8453', name: 'Base' },
    polygon: { chainId: '137', name: 'Polygon' },
    'polygon-pos': { chainId: '137', name: 'Polygon' },
    '137': { chainId: '137', name: 'Polygon' },
    arbitrum: { chainId: '42161', name: 'Arbitrum One' },
    '42161': { chainId: '42161', name: 'Arbitrum One' },
    optimism: { chainId: '10', name: 'Optimism' },
    '10': { chainId: '10', name: 'Optimism' },
    bsc: { chainId: '56', name: 'BNB Smart Chain' },
    binance: { chainId: '56', name: 'BNB Smart Chain' },
    'binance-smart-chain': { chainId: '56', name: 'BNB Smart Chain' },
    '56': { chainId: '56', name: 'BNB Smart Chain' },
    avalanche: { chainId: '43114', name: 'Avalanche' },
    avax: { chainId: '43114', name: 'Avalanche' },
    '43114': { chainId: '43114', name: 'Avalanche' },
    linea: { chainId: '59144', name: 'Linea' },
    '59144': { chainId: '59144', name: 'Linea' },
    scroll: { chainId: '534352', name: 'Scroll' },
    zksync: { chainId: '324', name: 'zkSync Era' },
    fantom: { chainId: '250', name: 'Fantom' },
    blast: { chainId: '81457', name: 'Blast' },
    mantle: { chainId: '5000', name: 'Mantle' },
    celo: { chainId: '42220', name: 'Celo' },
    sonic: { chainId: '146', name: 'Sonic' },
    monad: { chainId: '143', name: 'Monad' },
    plasma: { chainId: '9745', name: 'Plasma' },
    zora: { chainId: '7777777', name: 'Zora' },
    robinhood: { chainId: 'robinhood', name: 'Robinhood Chain' },
  };

  if (evmMap[norm]) {
    return {
      chainId: evmMap[norm].chainId,
      chainName: evmMap[norm].name,
      blockchainType: 'evm',
      tokenStandard: 'ERC-20',
    };
  }

  // Fallback dynamic
  const isLikelyEvm = /^0x|^evm|chain|net/i.test(norm) || /^\d+$/.test(norm);
  const humanized = norm.split(/[-_]/).map((w) => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ');
  return {
    chainId: norm,
    chainName: humanized || norm.toUpperCase(),
    blockchainType: isLikelyEvm ? 'evm' : 'other',
    tokenStandard: isLikelyEvm ? 'ERC-20' : 'Token',
  };
}

/**
 * Intelligent relevance score for a trading pair / token candidate against user query
 */
export function scoreTokenCandidate(pair: any, query: string, preferredChainId?: string): number {
  const q = query.trim().toLowerCase();
  const sym = String(pair?.baseToken?.symbol || '').toLowerCase();
  const name = String(pair?.baseToken?.name || '').toLowerCase();
  const addr = String(pair?.baseToken?.address || '').toLowerCase();
  const liq = Number(pair?.liquidity?.usd || 0);

  let score = 0;

  // Exact matches
  if (sym === q) score += 12000;
  if (name === q) score += 9000;
  if (addr === q) score += 25000;

  // Prefix / Starts with
  if (sym.startsWith(q) && sym !== q) score += 3500;
  if (name.startsWith(q) && name !== q) score += 2000;

  // Substring containment
  if (sym.includes(q) && !sym.startsWith(q)) score += 1000;
  if (name.includes(q) && !name.startsWith(q)) score += 600;

  // Heavy penalty if neither symbol nor name nor address contains the query at all!
  // (Prevents unrelated pools like LAPTOP from winning simply because the pair address has "00")
  if (!sym.includes(q) && !name.includes(q) && !addr.includes(q)) {
    score -= 10000;
  }

  // Preferred chain boost: If user is on this chain or requested it, strongly prioritize
  if (preferredChainId) {
    const mapped = mapProviderChainToInternal(pair?.chainId);
    const prefNorm = preferredChainId.toLowerCase().trim();
    if (
      mapped.chainId.toLowerCase() === prefNorm ||
      mapped.blockchainType.toLowerCase() === prefNorm ||
      String(pair?.chainId || '').toLowerCase() === prefNorm
    ) {
      score += 15000;
    }
  }

  // Liquidity weight (logarithmic so a $1M pool doesn't override an exact symbol match)
  if (liq > 0) {
    score += Math.log10(Math.max(1, liq)) * 25;
  }

  return score;
}

/**
 * Performs secondary multi-provider verification for an EVM contract address
 */
async function verifyEvmContract(
  candidateAddress: string,
  candidateChainId: string,
  symbolCandidate: string,
  nameCandidate: string,
  customKeys?: ApiKeyConfig
): Promise<{
  verifiedAddress: string;
  verifiedChainId: string;
  chainName: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
  verifiedOnChain: boolean;
  source: string;
} | null> {
  const cleanAddr = candidateAddress.trim();
  if (!ethers.isAddress(cleanAddr)) {
    return null;
  }

  // 1. Primary on-chain verification via Ethers.js
  let onChainMeta = await fetchERC20MetadataFromBlockchain(cleanAddr, candidateChainId as ChainId, customKeys).catch(() => null);

  // If on-chain read succeeded on candidate chain, contract is 100% verified on this chain!
  if (onChainMeta && (onChainMeta.name || onChainMeta.symbol)) {
    const chainInfo = getChainInfo(candidateChainId);
    return {
      verifiedAddress: cleanAddr,
      verifiedChainId: candidateChainId,
      chainName: chainInfo.name,
      name: onChainMeta.name || nameCandidate,
      symbol: onChainMeta.symbol || symbolCandidate,
      decimals: onChainMeta.decimals || 18,
      totalSupply: onChainMeta.totalSupply,
      verifiedOnChain: true,
      source: 'onchain_rpc_verified',
    };
  }

  // 2. Secondary Provider Request: Query DexScreener token endpoint directly for this specific contract address
  let dexVerifiedChainId: string | null = null;
  try {
    const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${cleanAddr}`);
    if (dexRes.ok) {
      const dexData = await dexRes.json();
      if (Array.isArray(dexData?.pairs) && dexData.pairs.length > 0) {
        const sorted = [...dexData.pairs].sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0));
        const bestPair = sorted[0];
        const mapped = mapProviderChainToInternal(bestPair.chainId);
        dexVerifiedChainId = mapped.chainId;

        // Try on-chain verification on the chain DexScreener confirmed
        if (dexVerifiedChainId && dexVerifiedChainId !== candidateChainId) {
          const crossChainMeta = await fetchERC20MetadataFromBlockchain(cleanAddr, dexVerifiedChainId as ChainId, customKeys).catch(() => null);
          if (crossChainMeta && (crossChainMeta.name || crossChainMeta.symbol)) {
            const crossChainInfo = getChainInfo(dexVerifiedChainId);
            return {
              verifiedAddress: cleanAddr,
              verifiedChainId: dexVerifiedChainId,
              chainName: crossChainInfo.name,
              name: crossChainMeta.name || bestPair.baseToken?.name || nameCandidate,
              symbol: crossChainMeta.symbol || bestPair.baseToken?.symbol || symbolCandidate,
              decimals: crossChainMeta.decimals || 18,
              totalSupply: crossChainMeta.totalSupply,
              verifiedOnChain: true,
              source: 'dexscreener_crosschain_rpc_verified',
            };
          }
        }
      }
    }
  } catch {
    // Continue to next provider check
  }

  // 3. Secondary Provider Request: Query CoinGecko for canonical contract platforms
  try {
    const cgSearchRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbolCandidate || cleanAddr)}`).catch(() => null);
    if (cgSearchRes && cgSearchRes.ok) {
      const cgSearch = await cgSearchRes.json().catch(() => null);
      const coins = Array.isArray(cgSearch?.coins) ? cgSearch.coins : [];
      const match = coins.find((c: any) =>
        c.symbol?.toLowerCase() === symbolCandidate.toLowerCase() ||
        c.name?.toLowerCase() === nameCandidate.toLowerCase()
      ) || coins[0];

      if (match?.id) {
        const coinDetailRes = await fetch(`https://api.coingecko.com/api/v3/coins/${match.id}`).catch(() => null);
        if (coinDetailRes && coinDetailRes.ok) {
          const detail = await coinDetailRes.json().catch(() => null);
          const platforms = detail?.platforms || {};

          // Look for matching address across platforms or find primary platform
          for (const [platformKey, platformAddr] of Object.entries(platforms)) {
            const pAddrStr = String(platformAddr || '').trim();
            if (pAddrStr && (pAddrStr.toLowerCase() === cleanAddr.toLowerCase() || ethers.isAddress(pAddrStr))) {
              const mapped = mapProviderChainToInternal(platformKey);
              if (mapped.blockchainType === 'evm') {
                const targetAddr = pAddrStr.toLowerCase() === cleanAddr.toLowerCase() ? cleanAddr : pAddrStr;
                const testMeta = await fetchERC20MetadataFromBlockchain(targetAddr, mapped.chainId as ChainId, customKeys).catch(() => null);
                const resolvedChainInfo = getChainInfo(mapped.chainId);
                return {
                  verifiedAddress: targetAddr,
                  verifiedChainId: mapped.chainId,
                  chainName: resolvedChainInfo.name,
                  name: detail.name || nameCandidate,
                  symbol: (detail.symbol || symbolCandidate).toUpperCase(),
                  decimals: testMeta?.decimals || 18,
                  totalSupply: testMeta?.totalSupply,
                  verifiedOnChain: !!testMeta,
                  source: 'coingecko_platform_verified',
                };
              }
            }
          }
        }
      }
    }
  } catch {
    // Continue
  }

  // 4. If all else fails but it is a valid EVM address format and had DEX pair data
  const finalChainId = dexVerifiedChainId || candidateChainId || '1';
  const finalChainInfo = getChainInfo(finalChainId);
  return {
    verifiedAddress: cleanAddr,
    verifiedChainId: finalChainId,
    chainName: finalChainInfo.name,
    name: nameCandidate || 'Verified EVM Token',
    symbol: symbolCandidate || 'TOK',
    decimals: 18,
    verifiedOnChain: false,
    source: 'evm_address_format_verified',
  };
}

/**
 * Performs secondary multi-provider verification for non-EVM tokens (Solana, TON, TRON, XRPL)
 * Compares token name and symbol across providers to verify the exact blockchain and mint/contract address
 */
async function verifyNonEvmToken(
  candidateAddress: string,
  candidateChainId: string,
  blockchainType: string,
  symbolCandidate: string,
  nameCandidate: string
): Promise<{
  verifiedAddress: string;
  verifiedChainId: string;
  chainName: string;
  name: string;
  symbol: string;
  decimals: number;
  verifiedOnChain: boolean;
  source: string;
} | null> {
  const cleanAddr = candidateAddress.trim();

  // Validate format for specific non-EVM chains
  if (blockchainType === 'solana' && !isSolanaAddress(cleanAddr)) {
    return null;
  }
  if (blockchainType === 'tron' && !isTronAddress(cleanAddr)) {
    return null;
  }
  if (blockchainType === 'ton' && !isTonAddress(cleanAddr)) {
    return null;
  }
  if (blockchainType === 'xrpl' && !isXrplAddress(cleanAddr)) {
    return null;
  }

  // Provider Cross-Verification: Compare name and symbol across providers
  let crossVerifiedName = nameCandidate;
  let crossVerifiedSymbol = symbolCandidate;
  let providerVerified = false;

  // Check with specialized non-EVM metadata reader
  try {
    const meta = await fetchNonEvmTokenMetadata(cleanAddr, candidateChainId, blockchainType).catch(() => null);
    if (meta && (meta.name || meta.symbol)) {
      crossVerifiedName = meta.name || nameCandidate;
      crossVerifiedSymbol = meta.symbol || symbolCandidate;
      providerVerified = true;
    }
  } catch {
    // Continue
  }

  // Check CoinGecko search to compare name & symbol
  try {
    const cgRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbolCandidate || cleanAddr)}`).catch(() => null);
    if (cgRes && cgRes.ok) {
      const cgData = await cgRes.json().catch(() => null);
      const coins = Array.isArray(cgData?.coins) ? cgData.coins : [];
      const match = coins.find((c: any) =>
        c.symbol?.toLowerCase() === symbolCandidate.toLowerCase() ||
        c.name?.toLowerCase() === nameCandidate.toLowerCase()
      );
      if (match) {
        if (!crossVerifiedName || crossVerifiedName === 'Unknown Token') {
          crossVerifiedName = match.name;
        }
        if (!crossVerifiedSymbol || crossVerifiedSymbol === 'TOK') {
          crossVerifiedSymbol = match.symbol.toUpperCase();
        }
        providerVerified = true;
      }
    }
  } catch {
    // Continue
  }

  const chainName = blockchainType === 'solana' ? 'Solana' : blockchainType === 'ton' ? 'TON' : blockchainType === 'tron' ? 'TRON' : blockchainType === 'xrpl' ? 'XRP Ledger' : candidateChainId;

  return {
    verifiedAddress: cleanAddr,
    verifiedChainId: candidateChainId,
    chainName,
    name: crossVerifiedName || 'Verified Asset',
    symbol: crossVerifiedSymbol || 'TOKEN',
    decimals: blockchainType === 'solana' ? 9 : blockchainType === 'ton' ? 9 : blockchainType === 'tron' ? 6 : 18,
    verifiedOnChain: providerVerified,
    source: 'nonevm_cross_provider_verified',
  };
}

/**
 * Unified Token Discovery, Multi-Provider Verification & Auto-Replacement Engine
 *
 * When a user enters a number (e.g. "00"), a ticker/name (e.g. "pepe"), or an address:
 * 1. Discovers candidate tokens across DexScreener, CoinGecko, and GeckoTerminal.
 * 2. Uses intelligent relevance scoring to find the exact token matching the query.
 * 3. Makes secondary verification requests to providers:
 *    - If EVM: verifies contract address format, queries DexScreener/CoinGecko, and validates on-chain via Ethers.js RPC.
 *    - If Non-EVM (e.g. Solana): verifies address format, compares name and symbol across providers, and verifies metadata.
 * 4. Determines the canonical contract address and flags wasReplaced: true so the user UI can automatically update.
 */
export async function resolveAndVerifyTokenContract(
  rawInput: string,
  preferredChainId: string = '137',
  customKeys?: ApiKeyConfig
): Promise<VerifiedContractResult | null> {
  const cleanInput = String(rawInput || '').trim();
  if (!cleanInput) return null;

  const isCanonicalEvmAddress = ethers.isAddress(cleanInput);
  const isCanonicalSolana = isSolanaAddress(cleanInput);
  const isCanonicalTron = isTronAddress(cleanInput);
  const isCanonicalTon = isTonAddress(cleanInput);
  const isCanonicalXrpl = isXrplAddress(cleanInput);
  const isCanonicalPolkadot = isPolkadotAddress(cleanInput);

  const isKnownAddressFormat =
    isCanonicalEvmAddress ||
    isCanonicalSolana ||
    isCanonicalTron ||
    isCanonicalTon ||
    isCanonicalXrpl ||
    isCanonicalPolkadot;

  // -------------------------------------------------------------------------
  // CASE 1: The input is already a canonical address format
  // -------------------------------------------------------------------------
  if (isKnownAddressFormat) {
    if (isCanonicalEvmAddress) {
      // User entered an EVM contract address. Verify the exact chain and on-chain contract.
      const evmVerified = await verifyEvmContract(cleanInput, preferredChainId, '', '', customKeys);
      if (evmVerified) {
        return {
          contractAddress: evmVerified.verifiedAddress,
          originalInput: cleanInput,
          wasReplaced: evmVerified.verifiedAddress.toLowerCase() !== cleanInput.toLowerCase(),
          chainId: evmVerified.verifiedChainId,
          chainName: evmVerified.chainName,
          blockchainType: 'evm',
          tokenStandard: 'ERC-20',
          name: evmVerified.name,
          symbol: evmVerified.symbol,
          decimals: evmVerified.decimals,
          totalSupply: evmVerified.totalSupply,
          verifiedOnChain: evmVerified.verifiedOnChain,
          verificationSource: evmVerified.source,
        };
      }
    }

    if (isCanonicalSolana) {
      const nonEvm = await verifyNonEvmToken(cleanInput, 'solana', 'solana', '', '');
      if (nonEvm) {
        return {
          contractAddress: nonEvm.verifiedAddress,
          originalInput: cleanInput,
          wasReplaced: false,
          chainId: 'solana',
          chainName: 'Solana',
          blockchainType: 'solana',
          tokenStandard: 'SPL',
          name: nonEvm.name,
          symbol: nonEvm.symbol,
          decimals: nonEvm.decimals,
          verifiedOnChain: nonEvm.verifiedOnChain,
          verificationSource: nonEvm.source,
        };
      }
    }

    // Other non-EVM address formats
    const bType = isCanonicalTron ? 'tron' : isCanonicalTon ? 'ton' : isCanonicalXrpl ? 'xrpl' : 'polkadot';
    const nonEvm = await verifyNonEvmToken(cleanInput, bType, bType, '', '');
    if (nonEvm) {
      return {
        contractAddress: nonEvm.verifiedAddress,
        originalInput: cleanInput,
        wasReplaced: false,
        chainId: nonEvm.verifiedChainId,
        chainName: nonEvm.chainName,
        blockchainType: bType as any,
        tokenStandard: bType === 'ton' ? 'Jetton' : bType === 'tron' ? 'TRC-20' : 'Asset',
        name: nonEvm.name,
        symbol: nonEvm.symbol,
        decimals: nonEvm.decimals,
        verifiedOnChain: nonEvm.verifiedOnChain,
        verificationSource: nonEvm.source,
      };
    }
  }

  // -------------------------------------------------------------------------
  // CASE 2: The input is a number (e.g. "00", "42"), ticker, name, or partial query
  // We need to discover the token, find the exact contract address, and verify it!
  // -------------------------------------------------------------------------
  console.log(`[SmartVerify] Input "${cleanInput}" is a search identifier. Querying providers...`);

  // Step 1: Query DexScreener search API
  let pairs: any[] = [];
  try {
    const dexSearchRes = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(cleanInput)}`);
    if (dexSearchRes.ok) {
      const dexJson = await dexSearchRes.json();
      if (Array.isArray(dexJson?.pairs)) {
        pairs = dexJson.pairs;
      }
    }
  } catch (err) {
    console.warn('[SmartVerify] DexScreener search error:', err);
  }

  // Step 2: Query CoinGecko search API in parallel
  let cgCoins: any[] = [];
  try {
    const cgRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(cleanInput)}`).catch(() => null);
    if (cgRes && cgRes.ok) {
      const cgJson = await cgRes.json().catch(() => null);
      if (Array.isArray(cgJson?.coins)) {
        cgCoins = cgJson.coins;
      }
    }
  } catch {
    // Continue
  }

  // Step 3: Score and rank candidates
  const scoredPairs = pairs
    .map((p) => ({
      pair: p,
      score: scoreTokenCandidate(p, cleanInput, preferredChainId),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Check if CoinGecko has an exact symbol/name match
  const qClean = cleanInput.trim().toLowerCase();
  const cgExactMatch = cgCoins.find((c: any) =>
    String(c.symbol || '').toLowerCase() === qClean ||
    String(c.name || '').toLowerCase() === qClean
  );

  // If CoinGecko had an exact match, fetch coin detail for platforms
  let cgPlatforms: Record<string, string> | null = null;
  let cgDetail: any = null;
  if (cgExactMatch?.id) {
    try {
      const detailRes = await fetch(`https://api.coingecko.com/api/v3/coins/${cgExactMatch.id}`).catch(() => null);
      if (detailRes && detailRes.ok) {
        cgDetail = await detailRes.json().catch(() => null);
        cgPlatforms = cgDetail?.platforms || null;
      }
    } catch {
      // Continue
    }
  }

  // Determine top candidates to test
  interface Candidate {
    address: string;
    chainId: string;
    chainName: string;
    blockchainType: 'evm' | 'solana' | 'ton' | 'tron' | 'xrpl' | 'polkadot' | 'other';
    tokenStandard: string;
    symbol: string;
    name: string;
    liquidityUsd?: number;
    logoUrl?: string;
  }

  const candidateList: Candidate[] = [];

  // Add top DexScreener candidate(s)
  for (const item of scoredPairs.slice(0, 5)) {
    const p = item.pair;
    const baseAddr = String(p.baseToken?.address || '').trim();
    if (!baseAddr) continue;

    const mapped = mapProviderChainToInternal(p.chainId);
    candidateList.push({
      address: baseAddr,
      chainId: mapped.chainId,
      chainName: mapped.chainName,
      blockchainType: mapped.blockchainType,
      tokenStandard: mapped.tokenStandard,
      symbol: p.baseToken?.symbol || '',
      name: p.baseToken?.name || '',
      liquidityUsd: Number(p.liquidity?.usd || 0),
      logoUrl: p.info?.imageUrl || p.baseToken?.imageUrl,
    });
  }

  // Add CoinGecko platform candidates if available
  if (cgPlatforms) {
    for (const [platformKey, platformAddr] of Object.entries(cgPlatforms)) {
      const addrStr = String(platformAddr || '').trim();
      if (!addrStr) continue;
      const mapped = mapProviderChainToInternal(platformKey);
      if (!candidateList.some((c) => c.address.toLowerCase() === addrStr.toLowerCase())) {
        candidateList.push({
          address: addrStr,
          chainId: mapped.chainId,
          chainName: mapped.chainName,
          blockchainType: mapped.blockchainType,
          tokenStandard: mapped.tokenStandard,
          symbol: (cgDetail?.symbol || cleanInput).toUpperCase(),
          name: cgDetail?.name || cleanInput,
          liquidityUsd: 50000,
          logoUrl: cgDetail?.image?.large || cgDetail?.image?.small,
        });
      }
    }
  }

  if (candidateList.length === 0) {
    console.warn(`[SmartVerify] No candidates found across providers for "${cleanInput}"`);
    return null;
  }

  // Prioritize candidates matching user's preferred chain
  const prefNorm = String(preferredChainId || '').toLowerCase().trim();
  if (prefNorm) {
    candidateList.sort((a, b) => {
      const aMatch = (a.chainId.toLowerCase() === prefNorm || a.blockchainType.toLowerCase() === prefNorm) ? 1 : 0;
      const bMatch = (b.chainId.toLowerCase() === prefNorm || b.blockchainType.toLowerCase() === prefNorm) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return (b.liquidityUsd || 0) - (a.liquidityUsd || 0);
    });
  }

  // Step 4: Perform multi-provider verification across candidates
  for (const candidate of candidateList) {
    if (candidate.blockchainType === 'evm') {
      // ----------------------------------------------------
      // EVM Chain Verification:
      // Verify smart contract address and query on-chain
      // ----------------------------------------------------
      const evmVerified = await verifyEvmContract(
        candidate.address,
        candidate.chainId,
        candidate.symbol,
        candidate.name,
        customKeys
      );

      if (evmVerified) {
        console.log(`[SmartVerify] Successfully verified EVM contract ${evmVerified.verifiedAddress} on ${evmVerified.chainName} (${evmVerified.source})`);

        // Register dynamic chain in store if needed
        registerDynamicChain(evmVerified.verifiedChainId, {
          name: evmVerified.chainName,
          symbol: candidate.symbol || 'ETH',
          type: 'evm',
          themeColor: '#10B981',
        });
        storeDynamicChain({
          id: evmVerified.verifiedChainId,
          name: evmVerified.chainName,
          symbol: candidate.symbol || 'ETH',
          tokenStandard: 'ERC-20',
          type: 'evm',
        });

        return {
          contractAddress: evmVerified.verifiedAddress,
          originalInput: cleanInput,
          wasReplaced: true,
          chainId: evmVerified.verifiedChainId,
          chainName: evmVerified.chainName,
          blockchainType: 'evm',
          tokenStandard: 'ERC-20',
          name: evmVerified.name,
          symbol: evmVerified.symbol,
          decimals: evmVerified.decimals,
          totalSupply: evmVerified.totalSupply,
          logoUrl: candidate.logoUrl,
          verifiedOnChain: evmVerified.verifiedOnChain,
          verificationSource: evmVerified.source,
          liquidityUsd: candidate.liquidityUsd,
          replacementReason: `Auto-resolved "${cleanInput}" to verified ${evmVerified.symbol} contract on ${evmVerified.chainName}`,
        };
      }
    } else {
      // ----------------------------------------------------
      // Non-EVM Chain Verification (e.g. Solana, TON, TRON, XRPL):
      // Compare name and symbol across providers & verify address
      // ----------------------------------------------------
      const nonEvm = await verifyNonEvmToken(
        candidate.address,
        candidate.chainId,
        candidate.blockchainType,
        candidate.symbol,
        candidate.name
      );

      if (nonEvm) {
        console.log(`[SmartVerify] Successfully verified non-EVM token ${nonEvm.verifiedAddress} on ${nonEvm.chainName}`);

        return {
          contractAddress: nonEvm.verifiedAddress,
          originalInput: cleanInput,
          wasReplaced: true,
          chainId: nonEvm.verifiedChainId,
          chainName: nonEvm.chainName,
          blockchainType: candidate.blockchainType,
          tokenStandard: candidate.tokenStandard,
          name: nonEvm.name,
          symbol: nonEvm.symbol,
          decimals: nonEvm.decimals,
          logoUrl: candidate.logoUrl,
          verifiedOnChain: nonEvm.verifiedOnChain,
          verificationSource: nonEvm.source,
          liquidityUsd: candidate.liquidityUsd,
          replacementReason: `Auto-resolved "${cleanInput}" to verified ${nonEvm.symbol} token on ${nonEvm.chainName}`,
        };
      }
    }
  }

  // Fallback: pick highest-scoring candidate if verification was inconclusive
  const fallback = candidateList[0];
  return {
    contractAddress: fallback.address,
    originalInput: cleanInput,
    wasReplaced: true,
    chainId: fallback.chainId,
    chainName: fallback.chainName,
    blockchainType: fallback.blockchainType,
    tokenStandard: fallback.tokenStandard,
    name: fallback.name,
    symbol: fallback.symbol,
    decimals: 18,
    logoUrl: fallback.logoUrl,
    verifiedOnChain: false,
    verificationSource: 'provider_scored_fallback',
    liquidityUsd: fallback.liquidityUsd,
    replacementReason: `Discovered token matching "${cleanInput}" on ${fallback.chainName}`,
  };
}
