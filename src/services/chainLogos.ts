export interface ChainNetworkInfo {
  id: string;
  name: string;
  shortName: string;
  symbol: string;
  logoUrl: string;
  color: string;
  type: string;
}

export const NEUTRAL_CHAIN_LOGO =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%239CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';

export const NETWORK_MAP: Record<string, ChainNetworkInfo> = {
  ethereum: {
    id: '1',
    name: 'Ethereum',
    shortName: 'ETH',
    symbol: 'ETH',
    logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    color: '#627EEA',
    type: 'EVM',
  },
  '1': {
    id: '1',
    name: 'Ethereum',
    shortName: 'ETH',
    symbol: 'ETH',
    logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    color: '#627EEA',
    type: 'EVM',
  },
  base: {
    id: '8453',
    name: 'Base',
    shortName: 'BASE',
    symbol: 'ETH',
    logoUrl: 'https://assets.coingecko.com/coins/images/30561/small/base.png',
    color: '#0052FF',
    type: 'EVM',
  },
  '8453': {
    id: '8453',
    name: 'Base',
    shortName: 'BASE',
    symbol: 'ETH',
    logoUrl: 'https://assets.coingecko.com/coins/images/30561/small/base.png',
    color: '#0052FF',
    type: 'EVM',
  },
  polygon: {
    id: '137',
    name: 'Polygon',
    shortName: 'POL',
    symbol: 'POL',
    logoUrl: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
    color: '#8247E5',
    type: 'EVM',
  },
  '137': {
    id: '137',
    name: 'Polygon',
    shortName: 'POL',
    symbol: 'POL',
    logoUrl: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
    color: '#8247E5',
    type: 'EVM',
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    shortName: 'SOL',
    symbol: 'SOL',
    logoUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    color: '#14F195',
    type: 'SOLANA',
  },
  ton: {
    id: 'ton',
    name: 'TON Network',
    shortName: 'TON',
    symbol: 'TON',
    logoUrl: 'https://assets.coingecko.com/coins/images/17980/small/toncoin.png',
    color: '#0098EA',
    type: 'TON',
  },
  xrpl: {
    id: 'xrpl',
    name: 'XRP Ledger',
    shortName: 'XRPL',
    symbol: 'XRP',
    logoUrl: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
    color: '#23292F',
    type: 'XRPL',
  },
  xrp: {
    id: 'xrpl',
    name: 'XRP Ledger',
    shortName: 'XRPL',
    symbol: 'XRP',
    logoUrl: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
    color: '#23292F',
    type: 'XRPL',
  },
  near: {
    id: 'near',
    name: 'NEAR Protocol',
    shortName: 'NEAR',
    symbol: 'NEAR',
    logoUrl: 'https://assets.coingecko.com/coins/images/10365/small/near.png',
    color: '#000000',
    type: 'NEAR',
  },
  cardano: {
    id: 'cardano',
    name: 'Cardano',
    shortName: 'ADA',
    symbol: 'ADA',
    logoUrl: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
    color: '#0033AD',
    type: 'CARDANO',
  },
  sui: {
    id: 'sui',
    name: 'Sui',
    shortName: 'SUI',
    symbol: 'SUI',
    logoUrl: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.png',
    color: '#4DA2FF',
    type: 'SUI',
  },
  aptos: {
    id: 'aptos',
    name: 'Aptos',
    shortName: 'APT',
    symbol: 'APT',
    logoUrl: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
    color: '#202020',
    type: 'APTOS',
  },
  tron: {
    id: 'tron',
    name: 'TRON',
    shortName: 'TRX',
    symbol: 'TRX',
    logoUrl: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
    color: '#FF0013',
    type: 'TRON',
  },
  avalanche: {
    id: '43114',
    name: 'Avalanche',
    shortName: 'AVAX',
    symbol: 'AVAX',
    logoUrl: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
    color: '#E84142',
    type: 'EVM',
  },
  '43114': {
    id: '43114',
    name: 'Avalanche',
    shortName: 'AVAX',
    symbol: 'AVAX',
    logoUrl: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
    color: '#E84142',
    type: 'EVM',
  },
  arbitrum: {
    id: '42161',
    name: 'Arbitrum',
    shortName: 'ARB',
    symbol: 'ETH',
    logoUrl: 'https://assets.coingecko.com/coins/images/29422/small/arbitrum.png',
    color: '#28A0F0',
    type: 'EVM',
  },
  '42161': {
    id: '42161',
    name: 'Arbitrum',
    shortName: 'ARB',
    symbol: 'ETH',
    logoUrl: 'https://assets.coingecko.com/coins/images/29422/small/arbitrum.png',
    color: '#28A0F0',
    type: 'EVM',
  },
  optimism: {
    id: '10',
    name: 'Optimism',
    shortName: 'OP',
    symbol: 'ETH',
    logoUrl: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
    color: '#FF0420',
    type: 'EVM',
  },
  '10': {
    id: '10',
    name: 'Optimism',
    shortName: 'OP',
    symbol: 'ETH',
    logoUrl: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
    color: '#FF0420',
    type: 'EVM',
  },
  cosmos: {
    id: 'cosmos',
    name: 'Cosmos',
    shortName: 'ATOM',
    symbol: 'ATOM',
    logoUrl: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
    color: '#2E3148',
    type: 'COSMOS',
  },
  bsc: {
    id: '56',
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    symbol: 'BNB',
    logoUrl: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    color: '#F3BA2F',
    type: 'EVM',
  },
  '56': {
    id: '56',
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    symbol: 'BNB',
    logoUrl: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    color: '#F3BA2F',
    type: 'EVM',
  },
  linea: {
    id: '59144',
    name: 'Linea',
    shortName: 'LINEA',
    symbol: 'ETH',
    logoUrl: 'https://assets.coingecko.com/coins/images/31828/small/Linea_Icon_Green.png',
    color: '#61DFFF',
    type: 'EVM',
  },
  '59144': {
    id: '59144',
    name: 'Linea',
    shortName: 'LINEA',
    symbol: 'ETH',
    logoUrl: 'https://assets.coingecko.com/coins/images/31828/small/Linea_Icon_Green.png',
    color: '#61DFFF',
    type: 'EVM',
  },
};

/**
  * Chain logo resolver priority:
  * 1. Exact chain ID mapping
  * 2. Exact normalized network-name mapping
  * 3. Known chain logo registry
  * 4. External logo source
  * 5. Neutral generic blockchain icon (NEVER fallback to Ethereum!)
  */
export function resolveChainLogo(network?: string, chainId?: string): ChainNetworkInfo {
  const cid = chainId ? chainId.toString().trim().toLowerCase() : '';
  const net = network ? network.toString().trim().toLowerCase() : '';

  // 1. Exact chain ID mapping
  if (cid && NETWORK_MAP[cid]) {
    return NETWORK_MAP[cid];
  }

  // 2. Exact normalized network name mapping
  if (net && NETWORK_MAP[net]) {
    return NETWORK_MAP[net];
  }

  // 3. Known chain logo registry string checks
  const combo = `${cid} ${net}`;

  if (combo.includes('137') || combo.includes('poly') || combo.includes('matic')) return NETWORK_MAP.polygon;
  if (combo.includes('8453') || combo.includes('base')) return NETWORK_MAP.base;
  if (combo.includes('42161') || combo.includes('arbi')) return NETWORK_MAP.arbitrum;
  if (combo.includes('10') || combo.includes('opti')) return NETWORK_MAP.optimism;
  if (combo.includes('56') || combo.includes('bsc') || combo.includes('binance') || combo.includes('bnb')) return NETWORK_MAP.bsc;
  if (combo.includes('43114') || combo.includes('avax') || combo.includes('aval')) return NETWORK_MAP.avalanche;
  if (combo.includes('59144') || combo.includes('linea')) return NETWORK_MAP.linea;
  if (combo.includes('sol')) return NETWORK_MAP.solana;
  if (combo.includes('ton')) return NETWORK_MAP.ton;
  if (combo.includes('xrp') || combo.includes('ripple')) return NETWORK_MAP.xrpl;
  if (combo.includes('near')) return NETWORK_MAP.near;
  if (combo.includes('cardano') || combo.includes('ada')) return NETWORK_MAP.cardano;
  if (combo.includes('sui')) return NETWORK_MAP.sui;
  if (combo.includes('aptos') || combo.includes('apt')) return NETWORK_MAP.aptos;
  if (combo.includes('tron') || combo.includes('trx')) return NETWORK_MAP.tron;
  if (combo.includes('cosmos') || combo.includes('atom')) return NETWORK_MAP.cosmos;
  if (combo.includes('1') || combo.includes('eth')) return NETWORK_MAP.ethereum;

  // 4. Default to Neutral generic blockchain icon (NEVER Ethereum logo!)
  const fallbackKey = net || cid || 'unknown';
  return {
    id: fallbackKey,
    name: net ? net.charAt(0).toUpperCase() + net.slice(1) : 'Chain',
    shortName: net ? net.slice(0, 4).toUpperCase() : 'CHAIN',
    symbol: 'TOK',
    logoUrl: NEUTRAL_CHAIN_LOGO,
    color: '#9CA3AF',
    type: 'GENERIC',
  };
}

/**
 * Legacy compatibility wrapper around resolveChainLogo
 */
export function getNetworkInfo(chainKey?: string): ChainNetworkInfo {
  return resolveChainLogo(chainKey, chainKey);
}

