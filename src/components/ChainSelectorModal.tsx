import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check } from 'lucide-react';
import { ChainId } from '../types';
import { RAW_EVM_CHAINS, getChainInfo, normalizeChainKey } from '../constants/chains';
import { ApiKeyConfig } from '../services/apiKeys';

interface ChainSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChain: ChainId;
  onSelectChain: (chainId: ChainId) => void;
  apiKeys?: ApiKeyConfig;
}

// Complete SVG / PNG logo mappings for all 37 EVM Networks
export const EVM_CHAIN_LOGOS: Record<string, string> = {
  "1": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  "137": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
  "8453": "https://assets.coingecko.com/coins/images/27068/small/base.png",
  "42161": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
  "10": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png",
  "56": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png",
  "43114": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png",
  "59144": "https://assets.coingecko.com/coins/images/31038/small/linea.png",
  "324": "https://assets.coingecko.com/coins/images/31026/small/zksync.png",
  "534352": "https://assets.coingecko.com/coins/images/32524/small/scroll.png",
  "81457": "https://assets.coingecko.com/coins/images/35655/small/blast.png",
  "42220": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/info/logo.png",
  "1329": "https://assets.coingecko.com/coins/images/28205/small/sei.png",
  "5000": "https://assets.coingecko.com/coins/images/30980/small/mantle.png",
  "204": "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  "34443": "https://assets.coingecko.com/coins/images/35451/small/mode.png",
  "480": "https://assets.coingecko.com/coins/images/31062/small/worldcoin.png",
  "1101": "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  "7777777": "https://assets.coingecko.com/coins/images/31837/small/zora.png",
  "1514": "https://assets.coingecko.com/coins/images/39569/small/story.png",
  "80084": "https://assets.coingecko.com/coins/images/32087/small/berachain.png",
  "42170": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
  "592": "https://assets.coingecko.com/coins/images/22617/small/astar.png",
  "7000": "https://assets.coingecko.com/coins/images/30598/small/zetachain.png",
  "2020": "https://assets.coingecko.com/coins/images/20009/small/ronin.png",
  "60808": "https://assets.coingecko.com/coins/images/37394/small/bob.png",
  "30": "https://assets.coingecko.com/coins/images/5070/small/rsk.png",
  "146": "https://assets.coingecko.com/coins/images/51767/small/sonic.png",
  "1088": "https://assets.coingecko.com/coins/images/15595/small/metis.png",
  "33139": "https://assets.coingecko.com/coins/images/24383/small/apecoin.png",
  "1284": "https://assets.coingecko.com/coins/images/22459/small/glmr.png",
  "666666666": "https://assets.coingecko.com/coins/images/35541/small/degen.png",
  "747": "https://assets.coingecko.com/coins/images/13446/small/flow.png",
  "288": "https://assets.coingecko.com/coins/images/20888/small/boba.png",
  "100": "https://assets.coingecko.com/coins/images/11062/small/gnosis.png",
  "252": "https://assets.coingecko.com/coins/images/13422/small/frax.png",
  "10102": "https://assets.coingecko.com/coins/images/31062/small/worldcoin.png",
  "250": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/fantom/info/logo.png",
  "25": "https://assets.coingecko.com/coins/images/7310/small/cronos.png",
  "369": "https://assets.coingecko.com/coins/images/30704/small/pulsechain.png",
  "solana": "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  "bsc": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png",
};

export function getChainLogoUrl(chainIdKey: string): string {
  if (!chainIdKey) return EVM_CHAIN_LOGOS["137"];
  const cleanKey = String(chainIdKey).toLowerCase().trim();
  const normalizedKey = normalizeChainKey(cleanKey);

  if (EVM_CHAIN_LOGOS[normalizedKey]) {
    return EVM_CHAIN_LOGOS[normalizedKey];
  }
  if (EVM_CHAIN_LOGOS[cleanKey]) {
    return EVM_CHAIN_LOGOS[cleanKey];
  }
  if (EVM_CHAIN_LOGOS[chainIdKey]) {
    return EVM_CHAIN_LOGOS[chainIdKey];
  }

  const chainInfo = getChainInfo(cleanKey);
  const dexChain = chainInfo.dexScreenerChain || cleanKey;
  return `https://dd.dexscreener.com/ds-data/chains/${dexChain.toLowerCase()}.png`;
}

export const ChainSelectorModal: React.FC<ChainSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedChain,
  onSelectChain,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const normalizedSelected = normalizeChainKey(selectedChain);
  const chainList = Object.entries(RAW_EVM_CHAINS);

  const filteredChains = chainList.filter(([idKey, def]) => {
    return (
      def.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      def.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idKey.includes(searchTerm)
    );
  });

  const handleImageError = (idKey: string) => {
    setImgErrors((prev) => ({ ...prev, [idKey]: true }));
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center animate-in fade-in duration-200">
      {/* Dimmed Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Up Bottom Sheet Panel (anchored to bottom, increased height ~80vh) */}
      <div className="relative w-full max-w-xl bg-[#0B0E17] border-t sm:border-x border-zinc-800/90 rounded-t-[24px] shadow-2xl flex flex-col h-[80vh] sm:h-[75vh] max-h-[85vh] z-10 animate-in slide-in-from-bottom duration-300 overflow-hidden">
        {/* Tactile Drag Handle & Header Close Bar */}
        <div className="pt-2.5 pb-2 px-4 flex items-center justify-between shrink-0 border-b border-zinc-800/60 bg-[#06080F]">
          <div className="w-8" /> {/* Spacer */}
          <div className="w-12 h-1 bg-zinc-700/80 rounded-full" />
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Field Header */}
        <div className="p-3 bg-[#06080F] border-b border-zinc-800/60 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search EVM network by name, symbol or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900/90 border border-zinc-800 text-white font-mono text-xs rounded-xl pl-10 pr-9 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2 text-zinc-500 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable List of EVM Blockchains */}
        <div className="p-3 overflow-y-auto space-y-1.5 flex-1 no-scrollbar bg-[#06080E]">
          {filteredChains.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 text-xs font-mono">
              No EVM blockchain found matching "{searchTerm}"
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filteredChains.map(([idKey, def]) => {
                const isSelected = normalizedSelected === idKey;
                const logoUrl = EVM_CHAIN_LOGOS[idKey];
                const hasError = imgErrors[idKey];

                return (
                  <button
                    key={idKey}
                    type="button"
                    onClick={() => {
                      onSelectChain(idKey);
                      onClose();
                    }}
                    className={`text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-[#0B0E17] border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    {/* Network Logo & Details */}
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                        {logoUrl && !hasError ? (
                          <img
                            src={logoUrl}
                            alt={def.name}
                            className="w-full h-full object-contain rounded-md"
                            onError={() => handleImageError(idKey)}
                          />
                        ) : (
                          <div
                            className="w-full h-full rounded-md flex items-center justify-center font-mono text-[9px] font-bold text-white"
                            style={{ backgroundColor: def.themeColor }}
                          >
                            {String(def.symbol || 'EVM').slice(0, 3)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                            {def.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            (${def.symbol})
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          Chain ID: {def.chainId}
                        </div>
                      </div>
                    </div>

                    {/* Selection State Indicator */}
                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-zinc-800 group-hover:border-zinc-700" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
