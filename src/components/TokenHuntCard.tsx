import React, { useState } from 'react';
import { Compass, Sparkles, X, ArrowUpRight, Flame } from 'lucide-react';

export interface TokenPlatform {
  id: string;
  name: string;
  category: string;
  url: string;
  color: string;
}

export const TOKEN_PLATFORMS: TokenPlatform[] = [
  {
    id: 'dexscreener',
    name: 'DexScreener',
    category: 'Trending DEX Pairs',
    url: 'https://dexscreener.com',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  {
    id: 'coingecko',
    name: 'CoinGecko',
    category: 'Market Aggregator',
    url: 'https://www.coingecko.com',
    color: 'text-lime-400 border-lime-500/30 bg-lime-500/10',
  },
  {
    id: 'geckoterminal',
    name: 'GeckoTerminal',
    category: 'Live DEX Tracker',
    url: 'https://www.geckoterminal.com',
    color: 'text-green-400 border-green-500/30 bg-green-500/10',
  },
  {
    id: 'dextools',
    name: 'DEXTools',
    category: 'DeFi Analytics',
    url: 'https://www.dextools.io/app',
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  },
  {
    id: 'coinmarketcap',
    name: 'CoinMarketCap',
    category: 'Market Rankings',
    url: 'https://coinmarketcap.com',
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  },
  {
    id: 'birdeye',
    name: 'Birdeye',
    category: 'Multi-Chain Data',
    url: 'https://birdeye.so',
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  },
];

interface TokenHuntCardProps {
  initialExpanded?: boolean;
}

export const TokenHuntCard: React.FC<TokenHuntCardProps> = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenPlatform = (url: string) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-full pt-2">
      {/* Sleek, High-Impact Button on Main Page */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full bg-gradient-to-r from-[#00E575]/20 via-[#00E575]/10 to-teal-500/20 border border-[#00E575]/40 hover:border-[#00E575]/70 active:scale-[0.99] rounded-2xl p-3.5 sm:p-4 text-center shadow-lg hover:shadow-[#00E575]/20 transition-all cursor-pointer group flex items-center justify-center space-x-2.5 relative overflow-hidden select-none"
      >
        <div className="w-8 h-8 rounded-xl bg-[#00E575]/20 border border-[#00E575]/40 flex items-center justify-center shrink-0 text-[#00E575] group-hover:scale-110 transition-transform">
          <Compass className="w-4 h-4 text-[#00E575]" />
        </div>
        <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide uppercase group-hover:text-[#00E575] transition-colors">
          Start Your Token Hunt Right Now
        </span>
        <Sparkles className="w-4 h-4 text-[#00E575] shrink-0 animate-pulse" />
      </button>

      {/* Pop-up Overlay Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-[#090C15] border border-[#00E575]/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 text-left animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 text-[#00E575]">
                  <Flame className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider">Token Hunt Platforms</span>
                </div>
                <h3 className="text-xs sm:text-sm font-extrabold text-white leading-snug">
                  Which particular platform are you targeting to get your reward right now?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instruction subtext */}
            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
              Copy the contract address from any provider below. TokenCare will auto-paste and verify it when you return!
            </p>

            {/* Slim Provider List */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5 custom-scrollbar">
              {TOKEN_PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => handleOpenPlatform(platform.url)}
                  className="w-full bg-[#06080F] hover:bg-[#0F1424] border border-zinc-800/80 hover:border-[#00E575]/50 px-3 py-2.5 rounded-xl transition-all cursor-pointer group flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center shrink-0 text-xs font-bold font-mono text-zinc-300 group-hover:text-[#00E575] group-hover:border-[#00E575]/40 transition-colors">
                      {String(platform?.name || 'TC').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-[#00E575] transition-colors truncate">
                      {platform.name}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`text-[9px] font-mono font-medium px-2 py-0.5 rounded border ${platform.color}`}>
                      {platform.category}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#00E575] transition-colors" />
                  </div>
                </button>
              ))}
            </div>

            {/* Modal Footer Note */}
            <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-400 flex items-center justify-between">
              <span>Auto-paste active upon return</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#00E575] hover:underline font-bold text-[10px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
