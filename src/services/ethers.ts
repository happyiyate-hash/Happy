import { ethers } from 'ethers';
import { ChainId, ERC20Metadata } from '../types';
import { SUPPORTED_CHAINS, RAW_EVM_CHAINS, getResolvedRpcUrl, normalizeChainKey, getChainInfo, registerDynamicChain, isEvmChain } from '../constants/chains';
import { ApiKeyConfig, getStoredApiKeys } from './apiKeys';
import { getChainLogoUrl } from '../components/ChainSelectorModal';

// Standard ERC-20 ABI functions
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function owner() view returns (address)',
  'function getOwner() view returns (address)',
];

// Fallback public RPCs for common EVM chains
const PUBLIC_BACKUP_RPCS: Record<string, string[]> = {
  "1": [
    'https://ethereum-rpc.publicnode.com',
    'https://rpc.ankr.com/eth',
    'https://1rpc.io/eth',
    'https://eth.drpc.org',
  ],
  "137": [
    'https://polygon-bor-rpc.publicnode.com',
    'https://polygon-rpc.com',
    'https://rpc.ankr.com/polygon',
    'https://1rpc.io/matic',
  ],
  "8453": [
    'https://mainnet.base.org',
    'https://base-rpc.publicnode.com',
    'https://1rpc.io/base',
  ],
  "42161": [
    'https://arb1.arbitrum.io/rpc',
    'https://arbitrum-one-rpc.publicnode.com',
    'https://1rpc.io/arb',
  ],
  "10": [
    'https://mainnet.optimism.io',
    'https://optimism-rpc.publicnode.com',
  ],
  "56": [
    'https://bsc-dataseed.binance.org',
    'https://bsc-rpc.publicnode.com',
    'https://1rpc.io/bnb',
  ],
  "43114": [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://avalanche-c-chain-rpc.publicnode.com',
  ],
  "59144": [
    'https://rpc.linea.build',
  ],
};

/**
 * Reads EVM token metadata directly from smart contract using Ethers.js
 */
export async function fetchERC20MetadataFromBlockchain(
  address: string,
  chainId: ChainId = '137',
  customKeys?: ApiKeyConfig
): Promise<ERC20Metadata | null> {
  const cleanAddress = address.trim();

  // Validate chain type and EVM address format
  if (!isEvmChain(chainId) || !ethers.isAddress(cleanAddress)) {
    return null;
  }

  const keys = customKeys || getStoredApiKeys();
  const normalizedKey = normalizeChainKey(chainId);
  let staticNet: ethers.Network | undefined;
  try {
    const numId = Number(normalizedKey);
    if (!isNaN(numId) && numId > 0) {
      staticNet = ethers.Network.from(numId);
    }
  } catch {
    // Keep undefined
  }

  // 1. Resolved primary RPC URL (incorporating Infura/Alchemy API Key)
  const primaryRpc = getResolvedRpcUrl(normalizedKey, keys);
  const backups = PUBLIC_BACKUP_RPCS[normalizedKey] || [];
  const rpcList = [primaryRpc, ...backups];

  for (const rpcUrl of rpcList) {
    try {
      console.log(`[Ethers.js] Connecting to EVM chain (${normalizedKey}) via RPC: ${rpcUrl}`);
      const provider = new ethers.JsonRpcProvider(rpcUrl, staticNet, {
        staticNetwork: staticNet ?? true,
      });

      const contract = new ethers.Contract(cleanAddress, ERC20_ABI, provider);

      // Execute RPC calls in parallel with 3s timeout
      const timeoutMs = 3000;
      const fetchWithTimeout = <T>(promise: Promise<T>): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('RPC request timed out')), timeoutMs)
          ),
        ]);
      };

      const [name, symbol, decimals, rawTotalSupply, owner] = await Promise.all([
        fetchWithTimeout(contract.name()).catch(() => null),
        fetchWithTimeout(contract.symbol()).catch(() => null),
        fetchWithTimeout(contract.decimals()).catch(() => 18),
        fetchWithTimeout(contract.totalSupply()).catch(() => 0n),
        fetchWithTimeout(contract.owner())
          .catch(() => fetchWithTimeout(contract.getOwner()).catch(() => undefined)),
      ]);

      if (!name && !symbol) {
        // Continue to backup RPC if contract read returned empty
        continue;
      }

      const formattedDecimals = Number(decimals) || 18;
      const formattedSupply = ethers.formatUnits(rawTotalSupply || 0n, formattedDecimals);

      const isRenounced =
        !owner ||
        owner === ethers.ZeroAddress ||
        owner.toLowerCase() === '0x000000000000000000000000000000000000dEaD'.toLowerCase();

      return {
        address: cleanAddress,
        chainId: normalizedKey,
        name: String(name || 'Verified EVM Token'),
        symbol: String(symbol || 'TOK'),
        decimals: formattedDecimals,
        totalSupply: formattedSupply,
        rawTotalSupply: rawTotalSupply ? rawTotalSupply.toString() : '0',
        ownerAddress: owner ? String(owner) : undefined,
        isRenounced,
      };
    } catch (error) {
      console.warn(`[Ethers.js] Failed RPC ${rpcUrl} for address ${cleanAddress}:`, error);
    }
  }

  return null;
}

/**
 * Attempts auto-detection of network deployment for a contract address via DexScreener & RPC
 */
export async function detectEVMChainForContractAddress(
  address: string
): Promise<{ chainId: string; dexChainId: string; name: string; symbol: string; logoUrl: string } | null> {
  const clean = address.trim();
  if (!clean || clean.length < 1) return null;

  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${clean}`);
    if (response.ok) {
      const data = await response.json();
      if (data.pairs && data.pairs.length > 0) {
        // Sort by liquidity to find primary DEX deployment
        const sorted = [...data.pairs].sort(
          (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        );
        const topPair = sorted[0];
        const dexChainId = topPair.chainId?.toLowerCase();

        if (dexChainId) {
          const resolvedKey = normalizeChainKey(dexChainId);
          const chainInfo = getChainInfo(resolvedKey);
          const logoUrl = getChainLogoUrl(resolvedKey);

          return {
            chainId: resolvedKey,
            dexChainId,
            name: chainInfo.name,
            symbol: topPair.baseToken?.symbol || chainInfo.symbol,
            logoUrl,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Ethers.js] EVM Chain auto-detect error:', err);
  }

  return null;
}
