import { ChainId, MarketData, TokenDiscovery } from '../types';
import {
  SUPPORTED_CHAINS,
  getChainInfo,
  isEvmChain,
  isXrplAddress,
  isSolanaAddress,
  isTronAddress,
  isTonAddress,
} from '../constants/chains';

/**
 * Resolves canonical network metadata from provider's chain identifier or address structure
 */
export function resolveNetworkFromProviderChainId(
  providerChainId: string,
  address: string,
  preferredChainId: string = '137'
): {
  blockchainType: string;
  blockchainName: string;
  chainId: string;
  tokenStandard: string;
} {
  const clean = (providerChainId || '').toLowerCase().trim();

  // Non-EVM Chains
  if (clean === 'ton' || clean === 'ton-network' || isTonAddress(address)) {
    return {
      blockchainType: 'ton',
      blockchainName: 'TON Network',
      chainId: 'ton',
      tokenStandard: 'Jetton',
    };
  }

  if (clean === 'xrpl' || clean === 'xrp' || clean === 'ripple' || isXrplAddress(address)) {
    return {
      blockchainType: 'xrpl',
      blockchainName: 'XRP Ledger',
      chainId: 'mainnet',
      tokenStandard: 'issued_asset',
    };
  }

  if (clean === 'solana' || clean === 'sol' || isSolanaAddress(address)) {
    return {
      blockchainType: 'solana',
      blockchainName: 'Solana',
      chainId: 'mainnet-beta',
      tokenStandard: 'SPL',
    };
  }

  if (clean === 'tron' || clean === 'trx' || isTronAddress(address)) {
    return {
      blockchainType: 'tron',
      blockchainName: 'TRON',
      chainId: 'mainnet',
      tokenStandard: 'TRC-20',
    };
  }

  // EVM chains mapping from provider IDs
  const evmChainMap: Record<string, { chainId: string; name: string }> = {
    polygon: { chainId: '137', name: 'Polygon' },
    polygon_pos: { chainId: '137', name: 'Polygon' },
    ethereum: { chainId: '1', name: 'Ethereum' },
    base: { chainId: '8453', name: 'Base' },
    arbitrum: { chainId: '42161', name: 'Arbitrum' },
    optimism: { chainId: '10', name: 'Optimism' },
    bsc: { chainId: '56', name: 'Binance Smart Chain' },
    avalanche: { chainId: '43114', name: 'Avalanche' },
    linea: { chainId: '59144', name: 'Linea' },
    blast: { chainId: '81457', name: 'Blast' },
    zksync: { chainId: '324', name: 'zkSync Era' },
    scroll: { chainId: '534352', name: 'Scroll' },
    fantom: { chainId: '250', name: 'Fantom' },
    celo: { chainId: '42220', name: 'Celo' },
  };

  if (evmChainMap[clean]) {
    return {
      blockchainType: 'evm',
      blockchainName: evmChainMap[clean].name,
      chainId: evmChainMap[clean].chainId,
      tokenStandard: 'ERC-20',
    };
  }

  const chainInfo = getChainInfo(clean || preferredChainId);
  const isEvm = isEvmChain(clean || preferredChainId);

  return {
    blockchainType: isEvm ? 'evm' : clean || 'unknown',
    blockchainName: chainInfo.name,
    chainId: String(chainInfo.id || preferredChainId),
    tokenStandard: isEvm ? 'ERC-20' : 'token',
  };
}

/**
 * Parses XRPL issued asset identifier into structured metadata
 */
export function parseXrplAssetIdentifier(address: string): {
  address: string;
  currency: string;
  issuer: string;
  name: string;
  symbol: string;
} {
  const clean = address.trim();
  if (clean.includes('.')) {
    const [currCode, issuerAddr] = clean.split('.');
    let symbol = currCode;
    // Hex currency code (e.g. 41524D5900000000000000000000000000000000)
    if (currCode.length === 40 && /^[0-9a-fA-F]+$/.test(currCode)) {
      try {
        let str = '';
        for (let i = 0; i < currCode.length; i += 2) {
          const code = parseInt(currCode.substr(i, 2), 16);
          if (code > 0) str += String.fromCharCode(code);
        }
        if (str.trim()) symbol = str.trim();
      } catch {
        symbol = currCode.slice(0, 6);
      }
    }
    return {
      address: clean,
      currency: currCode,
      issuer: issuerAddr || '',
      name: `${symbol} (XRPL Asset)`,
      symbol: symbol ? String(symbol).toUpperCase() : 'XRPL',
    };
  }
  return {
    address: clean,
    currency: 'XRP',
    issuer: clean,
    name: 'XRPL Issued Token',
    symbol: 'XRPL',
  };
}

/**
 * Normalized token discovery engine. Queries provider data and returns a standardized TokenDiscovery object.
 */
export async function discoverToken(
  rawAddress: string,
  preferredChainId: ChainId = '137'
): Promise<TokenDiscovery | null> {
  const address = rawAddress.trim();
  if (!address) return null;

  // Derive clean base address if address contains suffix like __NOT or _NOT
  const baseAddress = address.includes('__')
    ? address.split('__')[0]
    : address.includes('_') && isTonAddress(address)
      ? address.split('_')[0]
      : address;

  // 1. DexScreener discovery
  try {
    let response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    let data = response.ok ? await response.json() : null;

    // Fallback query with baseAddress if original full string produced no pairs
    if ((!data || !data.pairs || data.pairs.length === 0) && baseAddress !== address) {
      const baseResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${baseAddress}`);
      if (baseResponse.ok) {
        data = await baseResponse.json();
      }
    }

    if (data && data.pairs && data.pairs.length > 0) {
      const sorted = [...data.pairs].sort(
        (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      );
      const bestPair = sorted[0];
      const dexChainId = (bestPair.chainId || '').toLowerCase().trim();

      const netInfo = resolveNetworkFromProviderChainId(dexChainId, address, preferredChainId);

      return {
        address: bestPair.baseToken?.address || address,
        name: bestPair.baseToken?.name || 'Discovered Token',
        symbol: String(bestPair.baseToken?.symbol || 'TOK').toUpperCase(),
        decimals: 18,
        blockchainType: netInfo.blockchainType,
        blockchainName: netInfo.blockchainName,
        chainId: netInfo.chainId,
        tokenStandard: netInfo.tokenStandard,
        asset_identifier_type: netInfo.tokenStandard === 'issued_asset' ? 'issued_asset' : 'contract_address',
        logoUrl: bestPair.info?.imageUrl || bestPair.info?.header || undefined,
        source: 'dexscreener',
        marketData: {
          priceUsd: parseFloat(bestPair.priceUsd || '0'),
          priceNative: parseFloat(bestPair.priceNative || '0'),
          priceChange24h: bestPair.priceChange?.h24 || 0,
          volume24h: bestPair.volume?.h24 || 0,
          liquidityUsd: bestPair.liquidity?.usd || 0,
          fdvUsd: bestPair.fdv || 0,
          marketCapUsd: bestPair.marketCap || bestPair.fdv || 0,
          pairAddress: bestPair.pairAddress,
          dexName: String(bestPair.dexId || 'DEX').toUpperCase(),
          pairUrl: bestPair.url,
        },
      };
    }
  } catch (err) {
    console.warn('[Discovery Engine] DexScreener fetch error:', err);
  }

  // 2. TON fallback discovery
  if (isTonAddress(address)) {
    let extractedSymbol = 'TON';
    if (address.includes('__')) {
      const suffix = address.split('__')[1]?.trim();
      if (suffix) extractedSymbol = String(suffix).toUpperCase();
    } else if (address.includes('_')) {
      const parts = address.split('_');
      const suffix = parts[parts.length - 1]?.trim();
      if (suffix && suffix.length <= 10) extractedSymbol = String(suffix).toUpperCase();
    }

    const tokenName = extractedSymbol !== 'TON' ? `${extractedSymbol} (TON Jetton)` : 'TON Jetton Token';

    return {
      address,
      name: tokenName,
      symbol: extractedSymbol,
      decimals: 9,
      blockchainType: 'ton',
      blockchainName: 'TON Network',
      chainId: 'ton',
      tokenStandard: 'Jetton',
      asset_identifier_type: 'contract_address',
      source: 'ton-provider',
    };
  }

  // 3. XRPL fallback discovery
  if (isXrplAddress(address)) {
    const xrpl = parseXrplAssetIdentifier(address);
    return {
      address: xrpl.address,
      name: xrpl.name,
      symbol: xrpl.symbol,
      decimals: 15,
      blockchainType: 'xrpl',
      blockchainName: 'XRP Ledger',
      chainId: 'mainnet',
      tokenStandard: 'issued_asset',
      asset_identifier_type: 'issued_asset',
      source: 'xrpl-provider',
    };
  }

  // 4. Solana fallback discovery
  if (isSolanaAddress(address)) {
    return {
      address,
      name: 'Solana Token',
      symbol: 'SOL',
      decimals: 9,
      blockchainType: 'solana',
      blockchainName: 'Solana',
      chainId: 'mainnet-beta',
      tokenStandard: 'SPL',
      asset_identifier_type: 'mint',
      source: 'solana-provider',
    };
  }

  // 5. TRON fallback discovery
  if (isTronAddress(address)) {
    return {
      address,
      name: 'TRON Token',
      symbol: 'TRX',
      decimals: 6,
      blockchainType: 'tron',
      blockchainName: 'TRON',
      chainId: 'mainnet',
      tokenStandard: 'TRC-20',
      asset_identifier_type: 'contract_address',
      source: 'tron-provider',
    };
  }

  // Return null if token metadata could not be discovered via indexers or providers
  return null;
}

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  priceChange: {
    h24?: number;
  };
  volume: {
    h24?: number;
  };
  liquidity?: {
    usd?: number;
  };
  fdv?: number;
  marketCap?: number;
}

/**
 * Fetches market data (price, liquidity, volume, market cap, DEX pairs) via DexScreener API
 */
export async function fetchDexScreenerData(
  address: string,
  chainId: ChainId
): Promise<Partial<MarketData> | null> {
  try {
    const baseAddress = address.includes('__')
      ? address.split('__')[0]
      : address.includes('_') && isTonAddress(address)
        ? address.split('_')[0]
        : address;

    let response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    let data = response.ok ? await response.json() : null;

    if ((!data || !data.pairs || data.pairs.length === 0) && baseAddress !== address) {
      const baseRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${baseAddress}`);
      if (baseRes.ok) {
        data = await baseRes.json();
      }
    }

    if (!data || !data.pairs || data.pairs.length === 0) return null;

    // Filter or sort pairs by highest liquidity
    const targetChain = SUPPORTED_CHAINS[chainId]?.dexScreenerChain || chainId;
    const chainPairs = data.pairs.filter(
      (p: DexScreenerPair) => p.chainId.toLowerCase() === targetChain.toLowerCase()
    );

    const bestPair: DexScreenerPair = (chainPairs.length > 0 ? chainPairs : data.pairs).sort(
      (a: DexScreenerPair, b: DexScreenerPair) =>
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];

    if (!bestPair) return null;

    const priceUsd = parseFloat(bestPair.priceUsd || '0');
    const priceNative = parseFloat(bestPair.priceNative || '0');
    const priceChange24h = bestPair.priceChange?.h24 || 0;
    const volume24h = bestPair.volume?.h24 || 0;
    const liquidityUsd = bestPair.liquidity?.usd || 0;
    const fdvUsd = bestPair.fdv || 0;
    const marketCapUsd = bestPair.marketCap || fdvUsd;

    return {
      priceUsd,
      priceNative,
      priceChange24h,
      volume24h,
      liquidityUsd,
      marketCapUsd,
      fdvUsd,
      pairAddress: bestPair.pairAddress,
      dexName: (bestPair.dexId ? String(bestPair.dexId).toUpperCase() : 'DEX'),
      pairUrl: bestPair.url,
      logoUrl: (bestPair as any).info?.imageUrl || (bestPair as any).info?.header || undefined,
    } as any;
  } catch (err) {
    console.warn('[API] DexScreener fetch error:', err);
    return null;
  }
}

export interface CoinGeckoTokenData {
  name?: string;
  symbol?: string;
  logoUrl?: string;
  priceUsd?: number;
  priceChange24h?: number;
  marketCapUsd?: number;
  circulatingSupply?: number;
  totalSupplyCG?: number;
  maxSupplyCG?: number;
}

/**
 * Fetches token supply and market details from CoinGecko public endpoints
 */
export async function fetchCoinGeckoSupplyData(
  address: string,
  chainId: ChainId
): Promise<CoinGeckoTokenData | null> {
  try {
    const platform = SUPPORTED_CHAINS[chainId]?.coingeckoPlatform || 'ethereum';
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${platform}/contract/${address.toLowerCase()}`
    );

    if (!res.ok) return null;

    const data = await res.json();
    const marketData = data.market_data;

    return {
      name: data.name || undefined,
      symbol: data.symbol ? data.symbol.toUpperCase() : undefined,
      logoUrl: data.image?.large || data.image?.small || undefined,
      priceUsd: marketData?.current_price?.usd || undefined,
      priceChange24h: marketData?.price_change_percentage_24h || undefined,
      marketCapUsd: marketData?.market_cap?.usd || undefined,
      circulatingSupply: marketData?.circulating_supply || undefined,
      totalSupplyCG: marketData?.total_supply || marketData?.max_supply || undefined,
      maxSupplyCG: marketData?.max_supply || undefined,
    };
  } catch (err) {
    console.warn('[API] CoinGecko supply fetch error:', err);
    return null;
  }
}
