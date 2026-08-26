import { ChainInfo, ChainId } from '../types';
import { ApiKeyConfig } from '../services/apiKeys';

export interface EVMChainDefinition {
  name: string;
  symbol: string;
  chainId: number;
  rpcUrl: string;
  coingeckoId: string;
  themeColor: string;
  type: 'evm';
  requiresAlchemy?: boolean;
  hasNativeToken?: boolean;
  explorer?: string;
  provider: 'infura' | 'alchemy';
  dexScreenerChain: string;
  coingeckoPlatform: string;
}

// Complete list of EVM chains provided by user (Non-EVM chains removed)
export const RAW_EVM_CHAINS: Record<string, EVMChainDefinition> = {
  "1": {
    name: "Ethereum",
    symbol: "ETH",
    chainId: 1,
    rpcUrl: "https://mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "ethereum",
    themeColor: "#627EEA",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "ethereum",
    coingeckoPlatform: "ethereum",
    explorer: "https://etherscan.io"
  },
  "137": {
    name: "Polygon",
    symbol: "POL",
    chainId: 137,
    rpcUrl: "https://polygon-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "polygon-ecosystem-token",
    themeColor: "#8247E5",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "polygon",
    coingeckoPlatform: "polygon-pos",
    explorer: "https://polygonscan.com"
  },
  "8453": {
    name: "Base",
    symbol: "ETH",
    chainId: 8453,
    rpcUrl: "https://base-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "ethereum",
    themeColor: "#0052FF",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "base",
    coingeckoPlatform: "base",
    explorer: "https://basescan.org"
  },
  "59144": {
    name: "Linea",
    symbol: "ETH",
    chainId: 59144,
    rpcUrl: "https://linea-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "ethereum",
    themeColor: "#333333",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "linea",
    coingeckoPlatform: "linea",
    explorer: "https://lineascan.build"
  },
  "10": {
    name: "Optimism",
    symbol: "ETH",
    chainId: 10,
    rpcUrl: "https://optimism-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "ethereum",
    themeColor: "#FF0420",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "optimism",
    coingeckoPlatform: "optimistic-ethereum",
    explorer: "https://optimistic.etherscan.io"
  },
  "42161": {
    name: "Arbitrum",
    symbol: "ETH",
    chainId: 42161,
    rpcUrl: "https://arbitrum-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "ethereum",
    themeColor: "#28A0F0",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "arbitrum",
    coingeckoPlatform: "arbitrum-one",
    explorer: "https://arbiscan.io"
  },
  "81457": {
    name: "Blast",
    symbol: "BLAST",
    chainId: 81457,
    rpcUrl: "https://blast-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "blast",
    themeColor: "#FCFC03",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "blast",
    coingeckoPlatform: "blast",
    explorer: "https://blastscan.io"
  },
  "43114": {
    name: "Avalanche",
    symbol: "AVAX",
    chainId: 43114,
    rpcUrl: "https://avalanche-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "avalanche-2",
    themeColor: "#E84142",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "avalanche",
    coingeckoPlatform: "avalanche",
    explorer: "https://snowtrace.io"
  },
  "56": {
    name: "BSC",
    symbol: "BNB",
    chainId: 56,
    rpcUrl: "https://bsc-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "binancecoin",
    themeColor: "#F3BA2F",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "bsc",
    coingeckoPlatform: "binance-smart-chain",
    explorer: "https://bscscan.com"
  },
  "42220": {
    name: "Celo",
    symbol: "CELO",
    chainId: 42220,
    rpcUrl: "https://celo-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "celo",
    themeColor: "#FBCC5C",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "celo",
    coingeckoPlatform: "celo",
    explorer: "https://celoscan.io"
  },
  "324": {
    name: "ZKsync",
    symbol: "ETH",
    chainId: 324,
    rpcUrl: "https://zksync-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "ethereum",
    themeColor: "#333333",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "zksync",
    coingeckoPlatform: "zksync",
    explorer: "https://explorer.zksync.io"
  },
  "534352": {
    name: "Scroll",
    symbol: "ETH",
    chainId: 534352,
    rpcUrl: "https://scroll-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "ethereum",
    themeColor: "#333333",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "scroll",
    coingeckoPlatform: "scroll",
    explorer: "https://scrollscan.com"
  },
  "1329": {
    name: "Sei",
    symbol: "SEI",
    chainId: 1329,
    rpcUrl: "https://sei-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "sei-network",
    themeColor: "#B22222",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "sei",
    coingeckoPlatform: "sei-network",
    explorer: "https://seitrace.com"
  },
  "5000": {
    name: "Mantle",
    symbol: "MNT",
    chainId: 5000,
    rpcUrl: "https://mantle-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "mantle",
    themeColor: "#333333",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "mantle",
    coingeckoPlatform: "mantle",
    explorer: "https://explorer.mantle.xyz"
  },
  "204": {
    name: "opBNB",
    symbol: "BNB",
    chainId: 204,
    rpcUrl: "https://opbnb-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "binancecoin",
    themeColor: "#F3BA2F",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "opbnb",
    coingeckoPlatform: "opbnb",
    explorer: "https://opbnbscan.com"
  },
  "34443": {
    name: "Mode",
    symbol: "ETH",
    chainId: 34443,
    rpcUrl: "https://mode-mainnet.infura.io/v3/{API_KEY}",
    coingeckoId: "ethereum",
    themeColor: "#DFFE00",
    type: "evm",
    provider: "infura",
    dexScreenerChain: "mode",
    coingeckoPlatform: "mode",
    explorer: "https://modescan.io"
  },
  "480": {
    name: "Worldchain",
    symbol: "WLD",
    chainId: 480,
    rpcUrl: "https://worldchain-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "worldcoin-wld",
    themeColor: "#333333",
    type: "evm",
    requiresAlchemy: true,
    hasNativeToken: false,
    provider: "alchemy",
    dexScreenerChain: "worldchain",
    coingeckoPlatform: "worldchain",
    explorer: "https://worldscan.org"
  },
  "1101": {
    name: "Polygon zkEVM",
    symbol: "ETH",
    chainId: 1101,
    rpcUrl: "https://polygonzkevm-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "ethereum",
    themeColor: "#8247E5",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "polygonzkevm",
    coingeckoPlatform: "polygon-zkevm",
    explorer: "https://zkevm.polygonscan.com"
  },
  "7777777": {
    name: "Zora",
    symbol: "ETH",
    chainId: 7777777,
    rpcUrl: "https://zora-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "ethereum",
    themeColor: "#8B5CF6",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "zora",
    coingeckoPlatform: "zora",
    explorer: "https://explorer.zora.energy"
  },
  "1514": {
    name: "Story",
    symbol: "IP",
    chainId: 1514,
    rpcUrl: "https://story-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "story-protocol",
    themeColor: "#FF0000",
    type: "evm",
    requiresAlchemy: true,
    hasNativeToken: false,
    provider: "alchemy",
    dexScreenerChain: "story",
    coingeckoPlatform: "story",
    explorer: "https://storyscan.xyz"
  },
  "80084": {
    name: "Berachain",
    symbol: "BERA",
    chainId: 80084,
    rpcUrl: "https://berachain-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "berachain",
    themeColor: "#FF8C00",
    type: "evm",
    requiresAlchemy: true,
    hasNativeToken: false,
    provider: "alchemy",
    dexScreenerChain: "berachain",
    coingeckoPlatform: "berachain",
    explorer: "https://berascan.com"
  },
  "42170": {
    name: "Arbitrum Nova",
    symbol: "ETH",
    chainId: 42170,
    rpcUrl: "https://arbnova-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "ethereum",
    themeColor: "#FF9100",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "arbitrumnova",
    coingeckoPlatform: "arbitrum-nova",
    explorer: "https://nova.arbiscan.io"
  },
  "592": {
    name: "Astar",
    symbol: "ASTR",
    chainId: 592,
    rpcUrl: "https://astar-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "astar",
    themeColor: "#00E5FF",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "astar",
    coingeckoPlatform: "astar",
    explorer: "https://astar.subscan.io"
  },
  "7000": {
    name: "ZetaChain",
    symbol: "ZETA",
    chainId: 7000,
    rpcUrl: "https://zetachain-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "zetachain",
    themeColor: "#005A33",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "zetachain",
    coingeckoPlatform: "zetachain",
    explorer: "https://explorer.zetachain.com"
  },
  "2020": {
    name: "Ronin",
    symbol: "RON",
    chainId: 2020,
    rpcUrl: "https://ronin-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "ronin",
    themeColor: "#1273EA",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "ronin",
    coingeckoPlatform: "ronin",
    explorer: "https://app.roninchain.com"
  },
  "60808": {
    name: "BOB",
    symbol: "BOB",
    chainId: 60808,
    rpcUrl: "https://bob-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "bob-token",
    themeColor: "#FF9100",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "bob",
    coingeckoPlatform: "bob",
    explorer: "https://explorer.gobob.xyz"
  },
  "30": {
    name: "Rootstock",
    symbol: "RBTC",
    chainId: 30,
    rpcUrl: "https://rootstock-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "rootstock",
    themeColor: "#FF9100",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "rootstock",
    coingeckoPlatform: "rootstock",
    explorer: "https://explorer.rsk.co"
  },
  "146": {
    name: "Sonic",
    symbol: "S",
    chainId: 146,
    rpcUrl: "https://sonic-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "sonic",
    themeColor: "#F7931A",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "sonic",
    coingeckoPlatform: "sonic",
    explorer: "https://sonicscan.org"
  },
  "1088": {
    name: "Metis",
    symbol: "METIS",
    chainId: 1088,
    rpcUrl: "https://metis-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "metis-token",
    themeColor: "#00D2FF",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "metis",
    coingeckoPlatform: "metis-andromeda",
    explorer: "https://explorer.metis.io"
  },
  "33139": {
    name: "ApeChain",
    symbol: "APE",
    chainId: 33139,
    rpcUrl: "https://apechain-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "apecoin",
    themeColor: "#0054FA",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "apechain",
    coingeckoPlatform: "apechain",
    explorer: "https://apescan.io"
  },
  "1284": {
    name: "Moonbeam",
    symbol: "GLMR",
    chainId: 1284,
    rpcUrl: "https://moonbeam-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "moonbeam",
    themeColor: "#53CBC9",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "moonbeam",
    coingeckoPlatform: "moonbeam",
    explorer: "https://moonbeam.moonscan.io"
  },
  "666666666": {
    name: "Degen",
    symbol: "DEGEN",
    chainId: 666666666,
    rpcUrl: "https://degen-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "degen-base",
    themeColor: "#521B93",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "degen",
    coingeckoPlatform: "degen",
    explorer: "https://explorer.degen.tips"
  },
  "747": {
    name: "Flow",
    symbol: "FLOW",
    chainId: 747,
    rpcUrl: "https://flow-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "flow",
    themeColor: "#00EF8B",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "flow",
    coingeckoPlatform: "flow",
    explorer: "https://evm.flowscan.io"
  },
  "288": {
    name: "Boba",
    symbol: "BOBA",
    chainId: 288,
    rpcUrl: "https://boba-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "boba-network",
    themeColor: "#CBFF00",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "boba",
    coingeckoPlatform: "boba",
    explorer: "https://bobascan.com"
  },
  "100": {
    name: "Gnosis",
    symbol: "xDAI",
    chainId: 100,
    rpcUrl: "https://gnosis-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "gnosis",
    themeColor: "#04795B",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "gnosis",
    coingeckoPlatform: "xdai",
    explorer: "https://gnosisscan.io"
  },
  "252": {
    name: "Frax",
    symbol: "FRAX",
    chainId: 252,
    rpcUrl: "https://frax-mainnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "frax",
    themeColor: "#333333",
    type: "evm",
    requiresAlchemy: true,
    provider: "alchemy",
    dexScreenerChain: "frax",
    coingeckoPlatform: "frax",
    explorer: "https://fraxscan.com"
  },
  "10102": {
    name: "Robinhood",
    symbol: "RBD",
    chainId: 10102,
    rpcUrl: "https://robinhood-testnet.g.alchemy.com/v2/{API_KEY}",
    coingeckoId: "robinhood",
    themeColor: "#00C805",
    type: "evm",
    requiresAlchemy: true,
    hasNativeToken: false,
    provider: "alchemy",
    dexScreenerChain: "robinhood",
    coingeckoPlatform: "robinhood",
    explorer: "https://explorer.robinhood.com"
  }
};

// Aliases mapping string name/id to key
const NAME_ALIAS_MAP: Record<string, string> = {
  ethereum: "1",
  eth: "1",
  mainnet: "1",
  "1": "1",
  polygon: "137",
  pol: "137",
  matic: "137",
  "polygon-pos": "137",
  "137": "137",
  base: "8453",
  "8453": "8453",
  linea: "59144",
  "59144": "59144",
  optimism: "10",
  op: "10",
  "optimistic-ethereum": "10",
  "10": "10",
  arbitrum: "42161",
  arb: "42161",
  "arbitrum-one": "42161",
  "42161": "42161",
  blast: "81457",
  "81457": "81457",
  avalanche: "43114",
  avax: "43114",
  "43114": "43114",
  bsc: "56",
  binance: "56",
  bnb: "56",
  "binance-smart-chain": "56",
  smartchain: "56",
  "56": "56",
  celo: "42220",
  "42220": "42220",
  zksync: "324",
  "324": "324",
  scroll: "534352",
  "534352": "534352",
  sei: "1329",
  "1329": "1329",
  mantle: "5000",
  "5000": "5000",
  opbnb: "204",
  "204": "204",
  mode: "34443",
  "34443": "34443",
  fantom: "250",
  ftm: "250",
  "250": "250",
  cronos: "25",
  cro: "25",
  "25": "25",
  pulsechain: "369",
  pulse: "369",
  pls: "369",
  "369": "369",
  xrpl: "xrpl",
  xrp: "xrpl",
  ripple: "xrpl",
  solana: "solana",
  sol: "solana",
  tron: "tron",
  trx: "tron",
  ton: "ton",
  sui: "sui",
  aptos: "aptos",
};

/**
 * Dynamically registers an unknown or newly detected blockchain into memory
 */
export function registerDynamicChain(
  chainIdKey: string,
  chainName?: string,
  symbol?: string,
  logoUrl?: string,
  explorer?: string
): ChainInfo {
  if (!chainIdKey) return getChainInfo("137");

  const cleanKey = String(chainIdKey).toLowerCase().trim();
  const existingKey = NAME_ALIAS_MAP[cleanKey] || cleanKey;

  if (RAW_EVM_CHAINS[existingKey]) {
    return getChainInfo(existingKey);
  }

  let formattedName = chainName;
  if (!formattedName) {
    if (cleanKey === 'bsc' || cleanKey === '56') formattedName = 'Binance Smart Chain';
    else if (cleanKey === 'fantom' || cleanKey === '250') formattedName = 'Fantom Opera';
    else if (cleanKey === 'pulsechain' || cleanKey === '369') formattedName = 'PulseChain';
    else if (cleanKey === 'cronos' || cleanKey === '25') formattedName = 'Cronos';
    else if (cleanKey === 'solana') formattedName = 'Solana';
    else if (cleanKey === 'tron') formattedName = 'TRON Network';
    else formattedName = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
  }

  const formattedSymbol = symbol ? String(symbol).toUpperCase() : (cleanKey.includes('bsc') || cleanKey === '56' ? 'BNB' : cleanKey ? cleanKey.toUpperCase().slice(0, 4) : 'EVM');

  RAW_EVM_CHAINS[cleanKey] = {
    name: formattedName,
    symbol: formattedSymbol,
    chainId: Number(cleanKey) || 9999,
    rpcUrl: `https://rpc.ankr.com/${cleanKey}`,
    coingeckoId: cleanKey,
    themeColor: '#333333',
    type: 'evm',
    provider: 'infura',
    dexScreenerChain: cleanKey,
    coingeckoPlatform: cleanKey,
    explorer: explorer || `https://etherscan.io`,
  };

  NAME_ALIAS_MAP[cleanKey] = cleanKey;
  SUPPORTED_CHAINS[cleanKey] = getChainInfo(cleanKey);

  return getChainInfo(cleanKey);
}

/**
 * Resolves chain info for a given ChainId string or number key
 */
export function getChainInfo(chainIdKey: ChainId): ChainInfo {
  if (!chainIdKey) return getChainInfo("137");

  const cleanKey = String(chainIdKey).toLowerCase().trim();
  const resolvedKey = NAME_ALIAS_MAP[cleanKey] || NAME_ALIAS_MAP[chainIdKey] || String(chainIdKey);
  let raw = RAW_EVM_CHAINS[resolvedKey];

  if (!raw) {
    // Register dynamically if not in registry
    registerDynamicChain(cleanKey);
    raw = RAW_EVM_CHAINS[cleanKey] || RAW_EVM_CHAINS["137"] || RAW_EVM_CHAINS["1"];
  }

  return {
    id: chainIdKey,
    name: raw.name,
    symbol: raw.symbol,
    icon: getChainIcon(raw.symbol, raw.name),
    rpcUrl: raw.rpcUrl,
    explorerUrl: raw.explorer || `https://etherscan.io`,
    coingeckoPlatform: raw.coingeckoPlatform,
    dexScreenerChain: raw.dexScreenerChain,
  };
}

/**
 * Checks whether a chain or blockchain type is EVM based
 */
export function isEvmChain(chainId?: string, blockchainType?: string): boolean {
  if (blockchainType) {
    const typeLower = String(blockchainType).toLowerCase().trim();
    if (typeLower === 'evm') return true;
    if (
      [
        'solana',
        'tron',
        'near',
        'sui',
        'aptos',
        'cosmos',
        'xrp',
        'ripple',
        'stellar',
        'algorand',
        'hedera',
        'cardano',
        'ton',
        'polkadot',
        'spl',
        'trc20',
        'trc-20',
      ].includes(typeLower)
    ) {
      return false;
    }
  }

  if (!chainId) return true;
  const clean = String(chainId).toLowerCase().trim();

  // Known non-EVM chain identifiers
  const nonEvmIdentifiers = [
    'solana',
    'solana-mainnet',
    'mainnet-beta',
    'tron',
    'near',
    'sui',
    'aptos',
    'ton',
    'cardano',
    'algorand',
    'stellar',
    'ripple',
    'xrpl',
    'xrp',
    'polkadot',
    'cosmos',
    'spl',
    'trc20',
    'trc-20',
  ];

  if (nonEvmIdentifiers.includes(clean)) {
    return false;
  }

  // Check if registered in RAW_EVM_CHAINS
  const resolvedKey = NAME_ALIAS_MAP[clean] || clean;
  const raw = RAW_EVM_CHAINS[resolvedKey];
  if (raw && raw.type === 'evm') {
    return true;
  }

  // Numeric chain ID (e.g. 1, 137, 8453, 56, 250, 42161) is EVM
  if (/^\d+$/.test(clean)) {
    return true;
  }

  // EVM chain aliases
  const evmKeywords = [
    'polygon',
    'ethereum',
    'eth',
    'bsc',
    'base',
    'arbitrum',
    'optimism',
    'avalanche',
    'fantom',
    'linea',
    'zksync',
    'scroll',
    'blast',
    'mantle',
    'celo',
    'gnosis',
    'cronos',
    'pulsechain',
    'moonbeam',
    'aurora',
    'metis',
  ];

  if (evmKeywords.some((k) => clean.includes(k))) {
    return true;
  }

  return false;
}

/**
 * Checks if an address string matches XRPL issued asset (currency.issuer) or account address (r...) format
 */
export function isXrplAddress(address: string): boolean {
  if (!address) return false;
  const clean = address.trim();
  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length === 2 && /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(parts[1])) {
      return true;
    }
  }
  if (/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(clean)) {
    return true;
  }
  return false;
}

/**
 * Validates XRPL issued asset identifier (e.g. 41524D59...000.rGG3wQ4kUzd7Jnmk1n5NWPZjjut62kCBfC) or account address
 */
export function validateXrplAssetIdentifier(address: string): { isValid: boolean; error?: string } {
  const clean = address.trim();
  if (clean.includes('.')) {
    const [currency, issuer] = clean.split('.');
    if (!currency || currency.length < 1) {
      return { isValid: false, error: 'Invalid XRPL issued asset: Missing currency code.' };
    }
    if (!issuer || !/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(issuer)) {
      return { isValid: false, error: 'Invalid XRPL issued asset: Issuer must be a valid XRPL account address starting with "r".' };
    }
    return { isValid: true };
  }
  if (/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(clean)) {
    return { isValid: true };
  }
  return {
    isValid: false,
    error: `Invalid XRPL asset identifier format "${address}". Expected issued asset "currency.issuer" or XRPL account "r..."`,
  };
}

/**
 * Checks if an address matches Solana Base58 format
 */
export function isSolanaAddress(address: string): boolean {
  if (!address) return false;
  const clean = address.trim();
  return !clean.startsWith('0x') && !clean.startsWith('r') && !clean.startsWith('T') && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean);
}

/**
 * Validates Solana Base58 address format
 */
export function validateSolanaAddress(address: string): { isValid: boolean; error?: string } {
  const clean = address.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean)) {
    return { isValid: false, error: `Invalid Solana token address format. Must be 32-44 Base58 characters.` };
  }
  return { isValid: true };
}

/**
 * Checks if an address matches TRON format
 */
export function isTronAddress(address: string): boolean {
  if (!address) return false;
  const clean = address.trim();
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(clean);
}

/**
 * Validates TRON Base58 address format
 */
export function validateTronAddress(address: string): { isValid: boolean; error?: string } {
  const clean = address.trim();
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(clean)) {
    return { isValid: false, error: `Invalid TRON token address format. Must start with "T" followed by 33 Base58 characters.` };
  }
  return { isValid: true };
}

/**
 * Checks if an address matches TON (The Open Network) address or Jetton contract format
 * Examples:
 * - EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM
 * - EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT
 * - UQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM
 * - 0:b5e15845...
 */
export function isTonAddress(address: string): boolean {
  if (!address) return false;
  const clean = address.trim();

  // 1. User-friendly TON base64url address starting with EQ, UQ, kQ, 0Q, Ef, Uf with optional suffix (__NOT, _NOT, etc.)
  if (/^(EQ|UQ|kQ|0Q|Ef|Uf)[A-Za-z0-9_-]{40,64}(__?[A-Za-z0-9]+)?$/i.test(clean)) {
    return true;
  }

  // 2. Raw TON address format: 0:hex or -1:hex (64 hex chars)
  if (/^(-1|0):[a-fA-F0-9]{64}$/.test(clean)) {
    return true;
  }

  // 3. 48-char Base64/Base64url string with underscore/hyphen starting with E, U, k, 0
  if (/^[A-Za-z0-9_-]{48}(__?[A-Za-z0-9]+)?$/.test(clean) && /^[EUK0euk0]/.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Validates TON address format
 */
export function validateTonAddress(address: string): { isValid: boolean; error?: string } {
  const clean = address.trim();
  if (!isTonAddress(clean)) {
    return {
      isValid: false,
      error: `Invalid TON contract address format "${address}". Expected TON address starting with EQ/UQ/0Q or raw 0:...`,
    };
  }
  return { isValid: true };
}

/**
 * Validates a token identifier according to its blockchain type.
 * EVM address format validation is ONLY applied when blockchainType/chainId is EVM.
 */
export function validateTokenIdentifier(
  blockchainTypeOrChainId: string,
  contractAddress: string,
  blockchainType?: string
): { isValid: boolean; error?: string } {
  const address = String(contractAddress || '').trim();

  if (!address) {
    return { isValid: false, error: 'Token address is required.' };
  }

  const bType = (blockchainType || blockchainTypeOrChainId || '').toLowerCase().trim();

  // 1. TON Validation
  if (bType === 'ton' || bType === 'ton-network' || isTonAddress(address)) {
    return validateTonAddress(address);
  }

  // 2. XRPL Validation
  if (bType === 'xrpl' || bType === 'xrp' || bType === 'ripple' || isXrplAddress(address)) {
    return validateXrplAssetIdentifier(address);
  }

  // 3. Solana Validation
  if (bType === 'solana' || bType === 'spl' || bType === 'mainnet-beta' || isSolanaAddress(address)) {
    return validateSolanaAddress(address);
  }

  // 4. TRON Validation
  if (bType === 'tron' || bType === 'trc20' || bType === 'trc-20' || isTronAddress(address)) {
    return validateTronAddress(address);
  }

  // 5. EVM Validation
  const isEvm = isEvmChain(blockchainTypeOrChainId, bType);
  if (isEvm && !isTonAddress(address) && !isSolanaAddress(address) && !isTronAddress(address) && !isXrplAddress(address)) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return {
        isValid: false,
        error: `Invalid EVM contract address format "${address}". Must start with 0x followed by 40 hex characters.`,
      };
    }
    return { isValid: true };
  }

  // Generic non-EVM fallback
  if (address.length < 3) {
    return { isValid: false, error: 'Token identifier is too short.' };
  }

  return { isValid: true };
}

/**
 * Normalizes any chain ID key into the standardized string key
 */
export function normalizeChainKey(key: string): string {
  if (!key) return "137";
  const cleanKey = String(key).toLowerCase().trim();
  if (RAW_EVM_CHAINS[cleanKey]) return cleanKey;
  if (NAME_ALIAS_MAP[cleanKey]) return NAME_ALIAS_MAP[cleanKey];
  if (RAW_EVM_CHAINS[key]) return key;
  registerDynamicChain(cleanKey);
  return cleanKey;
}

/**
 * Helper to construct RPC URL using Infura or Alchemy API Key
 */
export function getResolvedRpcUrl(chainKey: string, apiKeys: ApiKeyConfig): string {
  const normalized = normalizeChainKey(chainKey);
  const def = RAW_EVM_CHAINS[normalized];
  if (!def) return "https://polygon-rpc.com";

  let keyToUse = "";
  if (def.provider === 'infura') {
    keyToUse = apiKeys.infuraKey.trim() || 'demo_infura_key';
  } else {
    keyToUse = apiKeys.alchemyKey.trim() || 'demo_alchemy_key';
  }

  if (def.rpcUrl.includes('{API_KEY}')) {
    return def.rpcUrl.replace('{API_KEY}', keyToUse);
  }
  return def.rpcUrl;
}

/**
 * Determines whether an EVM chain is enabled based on user's API keys
 */
export function isChainEnabledByKeys(chainKey: string, apiKeys: ApiKeyConfig): boolean {
  const normalized = normalizeChainKey(chainKey);
  const def = RAW_EVM_CHAINS[normalized];
  if (!def) return false;

  const hasInfura = apiKeys.infuraKey.trim().length > 0;
  const hasAlchemy = apiKeys.alchemyKey.trim().length > 0;

  // If user hasn't added any keys yet, all chains remain accessible in public/preview mode!
  if (!hasInfura && !hasAlchemy) {
    return true;
  }

  // If user submitted Infura key, enable Infura chains
  if (def.provider === 'infura') {
    return hasInfura;
  }

  // If user submitted Alchemy key, enable Alchemy chains
  if (def.provider === 'alchemy') {
    return hasAlchemy;
  }

  return true;
}

function getChainIcon(symbol: string, name: string): string {
  if (name.includes('Polygon')) return '💜';
  if (name.includes('Ethereum')) return '💎';
  if (name.includes('Base')) return '🔵';
  if (name.includes('Arbitrum')) return '💙';
  if (name.includes('Optimism')) return '🔴';
  if (name.includes('BSC') || name.includes('BNB')) return '🟡';
  if (name.includes('Avalanche')) return '🔺';
  if (name.includes('Celo')) return '🟢';
  if (name.includes('Berachain')) return '🐻';
  if (name.includes('Zora')) return '🔮';
  if (name.includes('Sei')) return '🔴';
  if (name.includes('Sonic')) return '⚡';
  if (name.includes('Ape')) return '🐵';
  return '🌐';
}

export const SUPPORTED_CHAINS: Record<string, ChainInfo> = Object.keys(RAW_EVM_CHAINS).reduce(
  (acc, key) => {
    acc[key] = getChainInfo(key);
    return acc;
  },
  {} as Record<string, ChainInfo>
);

export const REWARD_RATE_USD = 0.00015;
export const REWARD_PER_SUBMISSION = 15; // 15 tokens per verified submission
export const REWARD_SAFETY_BONUS = 0;

export const SAMPLE_TOKENS = [
  {
    name: 'Notcoin',
    symbol: 'NOT',
    address: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT',
    chainId: 'ton' as ChainId,
    description: 'Verified Smart Contract on TON (The Open Network)',
  },
  {
    name: 'Polygon Ecosystem Token',
    symbol: 'POL',
    address: '0x0000000000000000000000000000000000001010',
    chainId: '137' as ChainId,
    description: 'Native gas & staking token for Polygon PoS network',
  },
  {
    name: 'Chainlink',
    symbol: 'LINK',
    address: '0x514910771af9ca656af840dff83e8264ecf986ca',
    chainId: '1' as ChainId,
    description: 'Decentralized Oracle Network for Smart Contracts',
  },
  {
    name: 'Pepe',
    symbol: 'PEPE',
    address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
    chainId: '1' as ChainId,
    description: 'Deflationary memecoin launched on Ethereum',
  },
  {
    name: 'Uniswap',
    symbol: 'UNI',
    address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    chainId: '1' as ChainId,
    description: 'DeFi Governance token for Uniswap Protocol',
  },
  {
    name: 'Virtual Protocol',
    symbol: 'VIRTUAL',
    address: '0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b',
    chainId: '8453' as ChainId,
    description: 'AI Agent co-ownership layer on Base',
  },
  {
    name: 'Aave',
    symbol: 'AAVE',
    address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    chainId: '1' as ChainId,
    description: 'Liquidity protocol for lending & borrowing',
  },
];
