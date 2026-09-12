import { ChainId } from '../types';
import { RAW_EVM_CHAINS } from './chains';
import { getStoredDynamicChains, getCachedChainLogo } from '../services/chainLogoService';
import { BlockchainLogo } from './trustWalletChainLogos';

export type TokenChainType = 'evm' | 'solana' | 'tron' | 'ton' | 'other';

export interface TokenChainDefinition {
  id: ChainId;
  name: string;
  symbol: string;
  type: TokenChainType;
  chainId?: number;
  supported: boolean;
  tokenStandard: string;
  trustWalletKey?: string;
  dexScreenerChain?: string;
  coingeckoPlatform?: string;
  logoUrl?: string;
  note?: string;
}

const twLogo = (key: string) => BlockchainLogo.get(key) || `/assets/blockchains/${key}.png`;

/**
 * Known blockchain ecosystems exposed by the TokenCare manual selector.
 *
 * This is deliberately a local registry: opening the selector does not make a
 * network request. Trust Wallet's public asset repository is used only as the
 * stable source for the blockchain logo URLs. Trust Wallet documents roughly
 * 188 blockchain directories in its current assets repository.
 *
 * `supported` means TokenCare currently has a real token-data path for the
 * network. A chain being present here does NOT imply that TokenCare can yet
 * verify/donate on it. Unsupported networks remain visible so a user can
 * explicitly identify the chain instead of the app guessing incorrectly.
 */
export const TOKEN_CHAINS: TokenChainDefinition[] = [
  ...Object.entries(RAW_EVM_CHAINS).map(([id, chain]) => ({
    id,
    name: chain.name,
    symbol: chain.symbol,
    type: 'evm' as const,
    chainId: chain.chainId,
    supported: true,
    tokenStandard: 'ERC-20 / EVM token',
    dexScreenerChain: chain.dexScreenerChain,
    coingeckoPlatform: chain.coingeckoPlatform,
    trustWalletKey: id === '56' ? 'smartchain' : undefined,
  })),

  // Currently supported non-EVM token network.
  {
    id: 'solana', name: 'Solana', symbol: 'SOL', type: 'solana', supported: true,
    tokenStandard: 'SPL / Token-2022', trustWalletKey: 'solana',
    dexScreenerChain: 'solana', coingeckoPlatform: 'solana', logoUrl: twLogo('solana'),
  },

  // Known token ecosystems. All unlocked and selectable by users across ecosystems.
  { id: 'tron', name: 'TRON', symbol: 'TRX', type: 'tron', supported: true, tokenStandard: 'TRC-10 / TRC-20', trustWalletKey: 'tron', logoUrl: twLogo('tron') },
  { id: 'ton', name: 'TON', symbol: 'TON', type: 'ton', supported: true, tokenStandard: 'Jetton', trustWalletKey: 'ton', logoUrl: twLogo('ton') },
  { id: 'xrpl', name: 'XRP Ledger', symbol: 'XRP', type: 'other', supported: true, tokenStandard: 'Issued Asset', trustWalletKey: 'ripple', logoUrl: twLogo('ripple') },

  // Cosmos / IBC ecosystem
  { id: 'cosmos', name: 'Cosmos', symbol: 'ATOM', type: 'other', supported: true, tokenStandard: 'Cosmos / IBC', trustWalletKey: 'cosmos', logoUrl: twLogo('cosmos') },
  { id: 'osmosis', name: 'Osmosis', symbol: 'OSMO', type: 'other', supported: true, tokenStandard: 'Cosmos / IBC', trustWalletKey: 'osmosis', logoUrl: twLogo('osmosis') },
  { id: 'akash', name: 'Akash', symbol: 'AKT', type: 'other', supported: true, tokenStandard: 'Cosmos / IBC', trustWalletKey: 'akash', logoUrl: twLogo('akash') },
  { id: 'axelar', name: 'Axelar', symbol: 'AXL', type: 'other', supported: true, tokenStandard: 'Cosmos / IBC', trustWalletKey: 'axelar', logoUrl: twLogo('axelar') },
  { id: 'band', name: 'Band Protocol', symbol: 'BAND', type: 'other', supported: true, tokenStandard: 'Cosmos / IBC', trustWalletKey: 'band', logoUrl: twLogo('band') },
  { id: 'juno', name: 'Juno', symbol: 'JUNO', type: 'other', supported: true, tokenStandard: 'Cosmos / IBC', trustWalletKey: 'juno', logoUrl: twLogo('juno') },
  { id: 'kava', name: 'Kava', symbol: 'KAVA', type: 'other', supported: true, tokenStandard: 'Cosmos / IBC', trustWalletKey: 'kava', logoUrl: twLogo('kava') },
  { id: 'secret', name: 'Secret Network', symbol: 'SCRT', type: 'other', supported: true, tokenStandard: 'Cosmos / IBC', trustWalletKey: 'secret', logoUrl: twLogo('secret') },
  { id: 'sei', name: 'Sei', symbol: 'SEI', type: 'other', supported: true, tokenStandard: 'Cosmos / IBC', trustWalletKey: 'sei', logoUrl: twLogo('sei') },
  { id: 'stargaze', name: 'Stargaze', symbol: 'STARS', type: 'other', supported: true, tokenStandard: 'Cosmos / IBC', trustWalletKey: 'stargaze', logoUrl: twLogo('stargaze') },
  { id: 'stride', name: 'Stride', symbol: 'STRD', type: 'other', supported: true, tokenStandard: 'Cosmos / IBC', trustWalletKey: 'stride', logoUrl: twLogo('stride') },
  { id: 'terra', name: 'Terra', symbol: 'LUNA', type: 'other', supported: true, tokenStandard: 'Cosmos', trustWalletKey: 'terra', logoUrl: twLogo('terra') },
  { id: 'terrav2', name: 'Terra Classic', symbol: 'LUNC', type: 'other', supported: true, tokenStandard: 'Cosmos', trustWalletKey: 'terrav2', logoUrl: twLogo('terrav2') },
  { id: 'umee', name: 'Umee', symbol: 'UMEE', type: 'other', supported: true, tokenStandard: 'Cosmos / IBC', trustWalletKey: 'umee', logoUrl: twLogo('umee') },

  // Major non-EVM token ecosystems
  { id: 'algorand', name: 'Algorand', symbol: 'ALGO', type: 'other', supported: true, tokenStandard: 'ASA', trustWalletKey: 'algorand', logoUrl: twLogo('algorand') },
  { id: 'aptos', name: 'Aptos', symbol: 'APT', type: 'other', supported: true, tokenStandard: 'Move', trustWalletKey: 'aptos', logoUrl: twLogo('aptos') },
  { id: 'sui', name: 'Sui', symbol: 'SUI', type: 'other', supported: true, tokenStandard: 'Move / Coin', trustWalletKey: 'sui', logoUrl: twLogo('sui') },
  { id: 'stellar', name: 'Stellar', symbol: 'XLM', type: 'other', supported: true, tokenStandard: 'Stellar Asset', trustWalletKey: 'stellar', logoUrl: twLogo('stellar') },
  { id: 'tezos', name: 'Tezos', symbol: 'XTZ', type: 'other', supported: true, tokenStandard: 'FA1.2 / FA2', trustWalletKey: 'tezos', logoUrl: twLogo('tezos') },
  { id: 'vechain', name: 'VeChain', symbol: 'VET', type: 'other', supported: true, tokenStandard: 'VIP-180', trustWalletKey: 'vechain', logoUrl: twLogo('vechain') },
  { id: 'thorchain', name: 'THORChain', symbol: 'RUNE', type: 'other', supported: true, tokenStandard: 'THORChain', trustWalletKey: 'thorchain', logoUrl: twLogo('thorchain') },
  { id: 'theta', name: 'Theta', symbol: 'THETA', type: 'other', supported: true, tokenStandard: 'Theta', trustWalletKey: 'theta', logoUrl: twLogo('theta') },
  { id: 'zilliqa', name: 'Zilliqa', symbol: 'ZIL', type: 'other', supported: true, tokenStandard: 'ZRC-2', trustWalletKey: 'zilliqa', logoUrl: twLogo('zilliqa') },
  { id: 'xdc', name: 'XDC Network', symbol: 'XDC', type: 'other', supported: true, tokenStandard: 'XRC-20', trustWalletKey: 'xdc', logoUrl: twLogo('xdc') },
  { id: 'waves', name: 'Waves', symbol: 'WAVES', type: 'other', supported: true, tokenStandard: 'Waves Asset', trustWalletKey: 'waves', logoUrl: twLogo('waves') },
  { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', type: 'other', supported: true, tokenStandard: 'Substrate', trustWalletKey: 'polkadot', logoUrl: twLogo('polkadot') },
  { id: 'kusama', name: 'Kusama', symbol: 'KSM', type: 'other', supported: true, tokenStandard: 'Substrate', trustWalletKey: 'kusama', logoUrl: twLogo('kusama') },

  // UTXO / native-chain ecosystems represented by Trust Wallet assets.
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', type: 'other', supported: true, tokenStandard: 'Bitcoin', trustWalletKey: 'bitcoin', logoUrl: twLogo('bitcoin') },
  { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', type: 'other', supported: true, tokenStandard: 'UTXO', trustWalletKey: 'litecoin', logoUrl: twLogo('litecoin') },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', type: 'other', supported: true, tokenStandard: 'UTXO', trustWalletKey: 'dogecoin', logoUrl: twLogo('dogecoin') },
  { id: 'bitcoin-cash', name: 'Bitcoin Cash', symbol: 'BCH', type: 'other', supported: true, tokenStandard: 'UTXO', trustWalletKey: 'bitcoincash', logoUrl: twLogo('bitcoincash') },
  { id: 'dash', name: 'Dash', symbol: 'DASH', type: 'other', supported: true, tokenStandard: 'UTXO', trustWalletKey: 'dash', logoUrl: twLogo('dash') },
  { id: 'zcash', name: 'Zcash', symbol: 'ZEC', type: 'other', supported: true, tokenStandard: 'UTXO', trustWalletKey: 'zcash', logoUrl: twLogo('zcash') },
  { id: 'ravencoin', name: 'Ravencoin', symbol: 'RVN', type: 'other', supported: true, tokenStandard: 'UTXO', trustWalletKey: 'ravencoin', logoUrl: twLogo('ravencoin') },
  { id: 'qtum', name: 'Qtum', symbol: 'QTUM', type: 'other', supported: true, tokenStandard: 'UTXO / EVM', trustWalletKey: 'qtum', logoUrl: twLogo('qtum') },

  // Additional Trust Wallet ecosystems commonly encountered in token lists.
  { id: 'acala', name: 'Acala', symbol: 'ACA', type: 'other', supported: true, tokenStandard: 'Substrate', trustWalletKey: 'acala', logoUrl: twLogo('acala') },
  { id: 'acalaevm', name: 'Acala EVM', symbol: 'ACA', type: 'evm', supported: true, tokenStandard: 'ERC-20 / EVM', trustWalletKey: 'acalaevm', logoUrl: twLogo('acalaevm') },
  { id: 'aeternity', name: 'Aeternity', symbol: 'AE', type: 'other', supported: true, tokenStandard: 'Aeternity', trustWalletKey: 'aeternity', logoUrl: twLogo('aeternity') },
  { id: 'agoric', name: 'Agoric', symbol: 'BLD', type: 'other', supported: true, tokenStandard: 'Cosmos / IBC', trustWalletKey: 'agoric', logoUrl: twLogo('agoric') },
  { id: 'aion', name: 'Aion', symbol: 'AION', type: 'other', supported: true, tokenStandard: 'Aion', trustWalletKey: 'aion', logoUrl: twLogo('aion') },
  { id: 'ark', name: 'ARK', symbol: 'ARK', type: 'other', supported: true, tokenStandard: 'ARK', trustWalletKey: 'ark', logoUrl: twLogo('ark') },
  { id: 'aurora', name: 'Aurora', symbol: 'AURORA', type: 'evm', supported: true, tokenStandard: 'ERC-20 / EVM', trustWalletKey: 'aurora', logoUrl: twLogo('aurora') },
  { id: 'avalanchex', name: 'Avalanche X-Chain', symbol: 'AVAX', type: 'other', supported: true, tokenStandard: 'Avalanche X-Chain', trustWalletKey: 'avalanchex', logoUrl: twLogo('avalanchex') },
  { id: 'hedera', name: 'Hedera', symbol: 'HBAR', type: 'other', supported: true, tokenStandard: 'HTS', trustWalletKey: 'hedera', logoUrl: twLogo('hedera') },
  { id: 'near', name: 'NEAR Protocol', symbol: 'NEAR', type: 'other', supported: true, tokenStandard: 'NEP-141', trustWalletKey: 'near', logoUrl: twLogo('near') },
  { id: 'neo', name: 'NEO', symbol: 'NEO', type: 'other', supported: true, tokenStandard: 'NEP-5 / NEP-17', trustWalletKey: 'neo', logoUrl: twLogo('neo') },
  { id: 'ontology', name: 'Ontology', symbol: 'ONT', type: 'other', supported: true, tokenStandard: 'OEP-4', trustWalletKey: 'ontology', logoUrl: twLogo('ontology') },
  { id: 'icon', name: 'ICON', symbol: 'ICX', type: 'other', supported: true, tokenStandard: 'IRC-2', trustWalletKey: 'icon', logoUrl: twLogo('icon') },
  { id: 'iost', name: 'IOST', symbol: 'IOST', type: 'other', supported: true, tokenStandard: 'IOST', trustWalletKey: 'iost', logoUrl: twLogo('iost') },
  { id: 'kadena', name: 'Kadena', symbol: 'KDA', type: 'other', supported: true, tokenStandard: 'Kadena', trustWalletKey: 'kadena', logoUrl: twLogo('kadena') },
  { id: 'ronin', name: 'Ronin', symbol: 'RON', type: 'evm', supported: true, tokenStandard: 'ERC-20 / EVM', trustWalletKey: 'ronin', logoUrl: twLogo('ronin') },
  { id: 'rootstock', name: 'Rootstock', symbol: 'RBTC', type: 'evm', supported: true, tokenStandard: 'ERC-20 / EVM', trustWalletKey: 'rootstock', logoUrl: twLogo('rootstock') },
  { id: 'tomochain', name: 'TomoChain', symbol: 'TOMO', type: 'evm', supported: true, tokenStandard: 'ERC-20 / EVM', trustWalletKey: 'tomochain', logoUrl: twLogo('tomochain') },
  { id: 'verge', name: 'Verge', symbol: 'XVG', type: 'other', supported: true, tokenStandard: 'UTXO', trustWalletKey: 'verge', logoUrl: twLogo('verge') },
  { id: 'viacoin', name: 'Viacoin', symbol: 'VIA', type: 'other', supported: true, tokenStandard: 'UTXO', trustWalletKey: 'viacoin', logoUrl: twLogo('viacoin') },
  { id: 'wanchain', name: 'Wanchain', symbol: 'WAN', type: 'evm', supported: true, tokenStandard: 'ERC-20 / EVM', trustWalletKey: 'wanchain', logoUrl: twLogo('wanchain') },
  { id: 'wemix', name: 'WEMIX', symbol: 'WEMIX', type: 'evm', supported: true, tokenStandard: 'EVM', trustWalletKey: 'wemix', logoUrl: twLogo('wemix') },
  { id: 'xrplevm', name: 'XRPL EVM', symbol: 'XRP', type: 'evm', supported: true, tokenStandard: 'EVM', trustWalletKey: 'xrplevm', logoUrl: twLogo('xrplevm') },
  { id: 'zetachain', name: 'ZetaChain', symbol: 'ZETA', type: 'evm', supported: true, tokenStandard: 'EVM', trustWalletKey: 'zetachain', logoUrl: twLogo('zetachain') },
  { id: 'zetaevm', name: 'ZetaChain EVM', symbol: 'ZETA', type: 'evm', supported: true, tokenStandard: 'ERC-20 / EVM', trustWalletKey: 'zetaevm', logoUrl: twLogo('zetaevm') },
  { id: 'zklink', name: 'zkLink', symbol: 'ZKL', type: 'evm', supported: true, tokenStandard: 'EVM', trustWalletKey: 'zklink', logoUrl: twLogo('zklink') },
  { id: 'zksync', name: 'zkSync', symbol: 'ZK', type: 'evm', supported: true, tokenStandard: 'ERC-20 / EVM', trustWalletKey: 'zksync', logoUrl: twLogo('zksync') },
];

export const TOKEN_CHAIN_BY_ID: Record<string, TokenChainDefinition> = Object.fromEntries(
  TOKEN_CHAINS.map((chain) => [String(chain.id).toLowerCase(), chain])
);

export function getTokenChain(id: ChainId | string): TokenChainDefinition | undefined {
  const normKey = String(id || '').toLowerCase();
  const base = TOKEN_CHAIN_BY_ID[normKey];
  if (base) {
    const cachedLogo = getCachedChainLogo(normKey);
    return cachedLogo ? { ...base, logoUrl: cachedLogo } : base;
  }

  // Look in stored dynamic chains
  const dynamicList = getStoredDynamicChains();
  const foundDynamic = dynamicList.find((c) => String(c.id).toLowerCase() === normKey);
  if (foundDynamic) {
    return {
      id: foundDynamic.id as ChainId,
      name: foundDynamic.name,
      symbol: foundDynamic.symbol || 'TOKEN',
      type: (foundDynamic.type as TokenChainType) || 'evm',
      chainId: typeof foundDynamic.chainId === 'number' ? foundDynamic.chainId : undefined,
      supported: true,
      tokenStandard: foundDynamic.tokenStandard || 'Token',
      logoUrl: getCachedChainLogo(normKey) || foundDynamic.logoUrl,
      dexScreenerChain: foundDynamic.dexScreenerChain,
    };
  }

  return undefined;
}

export function getTokenChainsForSelector(): TokenChainDefinition[] {
  const unique = new Map<string, TokenChainDefinition>();
  for (const chain of TOKEN_CHAINS) {
    const key = String(chain.id).toLowerCase();
    const cachedLogo = getCachedChainLogo(key);
    unique.set(key, cachedLogo ? { ...chain, logoUrl: cachedLogo } : chain);
  }

  // Inject stored dynamic chains discovered from contracts
  const dynamicList = getStoredDynamicChains();
  for (const dyn of dynamicList) {
    const key = String(dyn.id).toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, {
        id: dyn.id as ChainId,
        name: dyn.name,
        symbol: dyn.symbol || 'TOKEN',
        type: (dyn.type as TokenChainType) || 'evm',
        chainId: typeof dyn.chainId === 'number' ? dyn.chainId : undefined,
        supported: true,
        tokenStandard: dyn.tokenStandard || 'Custom Token',
        logoUrl: getCachedChainLogo(key) || dyn.logoUrl,
        dexScreenerChain: dyn.dexScreenerChain,
      });
    } else {
      // If already in unique but has a new cached logo or dynamic logo, enrich it
      const existing = unique.get(key)!;
      const cached = getCachedChainLogo(key) || dyn.logoUrl;
      if (cached && !existing.logoUrl) {
        unique.set(key, { ...existing, logoUrl: cached });
      }
    }
  }

  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
}
