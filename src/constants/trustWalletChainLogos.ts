/**
 * Centralized Blockchain Logo Mapping
 * Sourced from verified 'info/logo.png' in the official Trust Wallet assets repository.
 * 
 * Target local location:
 * "assets/blockchains/<id>.png"
 * 
 * Works completely offline without runtime dependence on GitHub or raw.githubusercontent.com.
 */

export class BlockchainLogo {
  // Primary canonical constants
  static readonly ethereum = 'assets/blockchains/ethereum.png';
  static readonly bitcoin = 'assets/blockchains/bitcoin.png';
  static readonly solana = 'assets/blockchains/solana.png';
  static readonly polygon = 'assets/blockchains/polygon.png';
  static readonly arbitrum = 'assets/blockchains/arbitrum.png';
  static readonly optimism = 'assets/blockchains/optimism.png';
  static readonly bsc = 'assets/blockchains/smartchain.png';
  static readonly base = 'assets/blockchains/base.png';
  static readonly avalanche = 'assets/blockchains/avalanchec.png';
  static readonly tron = 'assets/blockchains/tron.png';
  static readonly ton = 'assets/blockchains/ton.png';
  static readonly ripple = 'assets/blockchains/ripple.png';
  static readonly litecoin = 'assets/blockchains/litecoin.png';
  static readonly dogecoin = 'assets/blockchains/doge.png';

  /**
   * Centralized mapping of all supported internal blockchain IDs,
   * chain IDs, and canonical keys to their local asset files.
   */
  static readonly map: Record<string, string> = {
    // EVM numeric chain IDs
    '1': 'assets/blockchains/1.png',
    '10': 'assets/blockchains/10.png',
    '30': 'assets/blockchains/30.png',
    '56': 'assets/blockchains/56.png',
    '100': 'assets/blockchains/100.png',
    '137': 'assets/blockchains/137.png',
    '146': 'assets/blockchains/146.png',
    '204': 'assets/blockchains/204.png',
    '288': 'assets/blockchains/288.png',
    '324': 'assets/blockchains/324.png',
    '1088': 'assets/blockchains/1088.png',
    '1101': 'assets/blockchains/1101.png',
    '1284': 'assets/blockchains/1284.png',
    '1329': 'assets/blockchains/1329.png',
    '2020': 'assets/blockchains/2020.png',
    '5000': 'assets/blockchains/5000.png',
    '7000': 'assets/blockchains/7000.png',
    '8453': 'assets/blockchains/8453.png',
    '10102': 'assets/blockchains/10102.png',
    '42161': 'assets/blockchains/42161.png',
    '42220': 'assets/blockchains/42220.png',
    '43114': 'assets/blockchains/43114.png',
    '59144': 'assets/blockchains/59144.png',
    '81457': 'assets/blockchains/81457.png',
    '534352': 'assets/blockchains/534352.png',

    // EVM canonical slugs
    'ethereum': 'assets/blockchains/ethereum.png',
    'optimism': 'assets/blockchains/optimism.png',
    'rootstock': 'assets/blockchains/rootstock.png',
    'smartchain': 'assets/blockchains/smartchain.png',
    'bsc': 'assets/blockchains/smartchain.png',
    'binance': 'assets/blockchains/smartchain.png',
    'xdai': 'assets/blockchains/xdai.png',
    'gnosis': 'assets/blockchains/xdai.png',
    'polygon': 'assets/blockchains/polygon.png',
    'sonic': 'assets/blockchains/sonic.png',
    'opbnb': 'assets/blockchains/opbnb.png',
    'boba': 'assets/blockchains/boba.png',
    'zksync': 'assets/blockchains/zksync.png',
    'metis': 'assets/blockchains/metis.png',
    'polygonzkevm': 'assets/blockchains/polygonzkevm.png',
    'moonbeam': 'assets/blockchains/moonbeam.png',
    'sei': 'assets/blockchains/sei.png',
    'ronin': 'assets/blockchains/ronin.png',
    'mantle': 'assets/blockchains/mantle.png',
    'zetachain': 'assets/blockchains/zetachain.png',
    'base': 'assets/blockchains/base.png',
    'robinhood': 'assets/blockchains/robinhoodchain.png',
    'robinhoodchain': 'assets/blockchains/robinhoodchain.png',
    'arbitrum': 'assets/blockchains/arbitrum.png',
    'celo': 'assets/blockchains/celo.png',
    'avalanche': 'assets/blockchains/avalanchec.png',
    'avalanchec': 'assets/blockchains/avalanchec.png',
    'linea': 'assets/blockchains/linea.png',
    'blast': 'assets/blockchains/blast.png',
    'scroll': 'assets/blockchains/scroll.png',

    // Major non-EVM blockchains
    'solana': 'assets/blockchains/solana.png',
    'tron': 'assets/blockchains/tron.png',
    'ton': 'assets/blockchains/ton.png',
    'xrpl': 'assets/blockchains/ripple.png',
    'ripple': 'assets/blockchains/ripple.png',
    'bitcoin': 'assets/blockchains/bitcoin.png',
    'btc': 'assets/blockchains/bitcoin.png',
    'litecoin': 'assets/blockchains/litecoin.png',
    'ltc': 'assets/blockchains/litecoin.png',
    'dogecoin': 'assets/blockchains/doge.png',
    'doge': 'assets/blockchains/doge.png',
    'bitcoin-cash': 'assets/blockchains/bitcoincash.png',
    'bitcoincash': 'assets/blockchains/bitcoincash.png',
    'bch': 'assets/blockchains/bitcoincash.png',
    'dash': 'assets/blockchains/dash.png',
    'zcash': 'assets/blockchains/zcash.png',
    'ravencoin': 'assets/blockchains/ravencoin.png',
    'qtum': 'assets/blockchains/qtum.png',

    // Cosmos / IBC & Layer 1s
    'cosmos': 'assets/blockchains/cosmos.png',
    'atom': 'assets/blockchains/cosmos.png',
    'osmosis': 'assets/blockchains/osmosis.png',
    'akash': 'assets/blockchains/akash.png',
    'axelar': 'assets/blockchains/axelar.png',
    'band': 'assets/blockchains/band.png',
    'juno': 'assets/blockchains/juno.png',
    'kava': 'assets/blockchains/kava.png',
    'secret': 'assets/blockchains/secret.png',
    'stargaze': 'assets/blockchains/stargaze.png',
    'stride': 'assets/blockchains/stride.png',
    'terra': 'assets/blockchains/terra.png',
    'terrav2': 'assets/blockchains/terrav2.png',
    'umee': 'assets/blockchains/umee.png',
    'algorand': 'assets/blockchains/algorand.png',
    'aptos': 'assets/blockchains/aptos.png',
    'sui': 'assets/blockchains/sui.png',
    'stellar': 'assets/blockchains/stellar.png',
    'tezos': 'assets/blockchains/tezos.png',
    'vechain': 'assets/blockchains/vechain.png',
    'thorchain': 'assets/blockchains/thorchain.png',
    'theta': 'assets/blockchains/theta.png',
    'zilliqa': 'assets/blockchains/zilliqa.png',
    'xdc': 'assets/blockchains/xdc.png',
    'waves': 'assets/blockchains/waves.png',
    'polkadot': 'assets/blockchains/polkadot.png',
    'kusama': 'assets/blockchains/kusama.png',
    'acala': 'assets/blockchains/acala.png',
    'acalaevm': 'assets/blockchains/acalaevm.png',
    'aeternity': 'assets/blockchains/aeternity.png',
    'agoric': 'assets/blockchains/agoric.png',
    'aion': 'assets/blockchains/aion.png',
    'ark': 'assets/blockchains/ark.png',
    'aurora': 'assets/blockchains/aurora.png',
    'avalanchex': 'assets/blockchains/avalanchex.png',
    'hedera': 'assets/blockchains/hedera.png',
    'near': 'assets/blockchains/near.png',
    'neo': 'assets/blockchains/neo.png',
    'ontology': 'assets/blockchains/ontology.png',
    'icon': 'assets/blockchains/icon.png',
    'iost': 'assets/blockchains/iost.png',
    'tomochain': 'assets/blockchains/tomochain.png',
    'verge': 'assets/blockchains/verge.png',
    'viacoin': 'assets/blockchains/viacoin.png',
    'wanchain': 'assets/blockchains/wanchain.png',
    'wemix': 'assets/blockchains/wemix.png',
    'xrplevm': 'assets/blockchains/xrplevm.png',
    'zetaevm': 'assets/blockchains/zetaevm.png',
    'zklink': 'assets/blockchains/zklink.png',
    'fantom': 'assets/blockchains/fantom.png',
    'cronos': 'assets/blockchains/cronos.png',
    'cardano': 'assets/blockchains/cardano.png',
  };

  /**
   * Retrieves the canonical local logo path for a given blockchain ID or key.
   * Returns a web-resolvable path, e.g. '/assets/blockchains/ethereum.png'.
   */
  static get(keyOrId?: string | number | null): string | undefined {
    if (keyOrId === undefined || keyOrId === null) return undefined;
    const cleanKey = String(keyOrId).trim().toLowerCase();
    const local = BlockchainLogo.map[cleanKey];
    if (local) {
      return `/${local}`;
    }
    return undefined;
  }
}

const slugify = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '')
  .replace(/^the/, '');

/**
 * Returns the exact local verified blockchain coin-logo path for a known chain.
 * Uses local assets in 'assets/blockchains/' with zero external runtime dependencies.
 */
export function getTrustWalletChainLogoUrl(chain: {
  id?: string | number;
  chainId?: number;
  name?: string;
  trustWalletKey?: string;
  logoUrl?: string;
  dexScreenerChain?: string;
}): string | undefined {
  // If a local asset or custom non-github URL is provided, return it
  if (chain.logoUrl && !chain.logoUrl.includes('raw.githubusercontent.com')) {
    return chain.logoUrl;
  }

  // 1. Direct lookup by internal id
  if (chain.id !== undefined) {
    const byId = BlockchainLogo.get(chain.id);
    if (byId) return byId;
  }

  // 2. Lookup by numeric chainId
  if (chain.chainId !== undefined) {
    const byChainId = BlockchainLogo.get(chain.chainId);
    if (byChainId) return byChainId;
  }

  // 3. Lookup by trustWalletKey
  if (chain.trustWalletKey) {
    const byTwKey = BlockchainLogo.get(chain.trustWalletKey);
    if (byTwKey) return byTwKey;
  }

  // 4. Lookup by dexScreenerChain
  if (chain.dexScreenerChain) {
    const byDex = BlockchainLogo.get(chain.dexScreenerChain);
    if (byDex) return byDex;
  }

  // 5. Lookup by slugified name
  if (chain.name) {
    const byName = BlockchainLogo.get(slugify(chain.name));
    if (byName) return byName;
  }

  return undefined;
}
