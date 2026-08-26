import React, { useState } from 'react';
import {
  Box,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  PlusCircle,
  X,
} from 'lucide-react';
import { SubmittedToken } from '../types';
import { getChainInfo } from '../constants/chains';
import { resolveChainLogo, NEUTRAL_CHAIN_LOGO } from '../services/chainLogos';
import { PromoCarousel } from './PromoCarousel';
import { TickerNumber } from './TickerNumber';
import { useTranslation } from '../utils/i18n';
import {
  formatSmartCurrency,
  formatSmartNumber,
  formatTokenSupply,
  calculateTokenUsdValue,
  parseCleanNumber,
} from '../utils/numberFormatting';

const NEUTRAL_TOKEN_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%236B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M6 12h12"/></svg>';

interface MyTokensViewProps {
  tokens: SubmittedToken[];
  onNavigateAddToken: () => void;
  onSelectToken?: (token: SubmittedToken) => void;
  onOpenHowItWorks?: () => void;
  onOpenRewardModal?: () => void;
}

// Default sample tokens with realistic total supplies if user has no tokens
const DEFAULT_SAMPLE_TOKENS: Array<{
  id: string;
  name: string;
  symbol: string;
  chain: string;
  chainId: string;
  logoUrl: string;
  amountFormatted: string;
  usdValueFormatted: string;
  usdValNumber: number;
  verified: boolean;
  rawToken?: SubmittedToken;
}> = [
  {
    id: 'sample-1',
    name: 'SuperVerse',
    symbol: 'SUPER',
    chain: 'Polygon',
    chainId: '137',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174/logo.png',
    amountFormatted: '1,000,000,000 SUPER',
    usdValueFormatted: '$4,250.25',
    usdValNumber: 4250.25,
    verified: true,
  },
  {
    id: 'sample-2',
    name: 'DogeCare Token',
    symbol: 'DOGECARE',
    chain: 'Polygon',
    chainId: '137',
    logoUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?auto=format&fit=crop&w=120&q=80',
    amountFormatted: '500,000,000 DOGECARE',
    usdValueFormatted: '$2,125.50',
    usdValNumber: 2125.50,
    verified: true,
  },
  {
    id: 'sample-3',
    name: 'Wave Protocol',
    symbol: 'WAVE',
    chain: 'Polygon',
    chainId: '137',
    logoUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=120&q=80',
    amountFormatted: '100,000,000 WAVE',
    usdValueFormatted: '$1,980.00',
    usdValNumber: 1980.00,
    verified: true,
  },
  {
    id: 'sample-4',
    name: 'BlockTrust',
    symbol: 'BTRUST',
    chain: 'Polygon',
    chainId: '137',
    logoUrl: 'https://images.unsplash.com/photo-1622979135240-caa6648190b6?auto=format&fit=crop&w=120&q=80',
    amountFormatted: '25,000,000 BTRUST',
    usdValueFormatted: '$1,875.00',
    usdValNumber: 1875.00,
    verified: true,
  },
  {
    id: 'sample-5',
    name: 'Nexa Token',
    symbol: 'NEXA',
    chain: 'Polygon',
    chainId: '137',
    logoUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=120&q=80',
    amountFormatted: '21,000,000,000 NEXA',
    usdValueFormatted: '$1,640.00',
    usdValNumber: 1640.00,
    verified: true,
  },
  {
    id: 'sample-6',
    name: 'LinkLayer',
    symbol: 'LAYER',
    chain: 'Polygon',
    chainId: '137',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
    amountFormatted: '1,000,000,000 LAYER',
    usdValueFormatted: '$1,120.00',
    usdValNumber: 1120.00,
    verified: true,
  },
];

export const MyTokensView: React.FC<MyTokensViewProps> = ({
  tokens,
  onNavigateAddToken,
  onSelectToken,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState(false);

  // Map real user tokens from database reading total_supply column properly
  const mappedRealTokens: Array<{
    id: string;
    name: string;
    symbol: string;
    chain: string;
    chainId?: string;
    logoUrl?: string;
    amountFormatted: string;
    usdValueFormatted: string;
    usdValNumber: number;
    verified: boolean;
    rawToken?: SubmittedToken;
  }> = tokens.map((t) => {
    // Read total_supply from Supabase column or metadata
    const rawSupply =
      t.metadata?.totalSupply ||
      (t.metadata as any)?.total_supply ||
      (t as any)?.total_supply ||
      (t.marketData as any)?.totalSupplyCG ||
      (t.metadata as any)?.supply ||
      '1000000000';

    const supplyNum = parseCleanNumber(rawSupply);
    const price = t.marketData?.priceUsd || 0;
    const marketCap = t.marketData?.marketCapUsd || (supplyNum > 0 && price > 0 ? supplyNum * price : 0);
    const usdValNumber = marketCap > 0 ? marketCap : (price > 0 ? price : 1250);

    return {
      id: t.id || t.address,
      name: t.metadata.name,
      symbol: t.metadata.symbol,
      chain:
        t.metadata.blockchainName ||
        (t.metadata as any)?.blockchain_name ||
        (t.metadata as any)?.blockchain ||
        t.metadata.chainName ||
        t.metadata.network ||
        getChainInfo(t.metadata.chainId || t.chainId).name ||
        t.chainId,
      chainId: t.metadata.chainId || t.chainId,
      logoUrl: t.metadata.logoUrl,
      amountFormatted: formatTokenSupply(rawSupply, t.metadata.symbol),
      usdValueFormatted: calculateTokenUsdValue(rawSupply, price, marketCap),
      usdValNumber,
      verified: t.verified !== false,
      rawToken: t,
    };
  });

  const displayList = mappedRealTokens.length > 0 ? mappedRealTokens : DEFAULT_SAMPLE_TOKENS;

  // Filter list by searchQuery
  const filteredTokens = displayList.filter(
    (t) => {
      const q = (searchQuery || '').toLowerCase();
      const name = (t?.name || '').toLowerCase();
      const symbol = (t?.symbol || '').toLowerCase();
      const chain = (t?.chain || '').toLowerCase();
      return name.includes(q) || symbol.includes(q) || chain.includes(q);
    }
  );

  const totalTokenCount = displayList.length;
  const totalValueUsd = displayList.reduce((sum, item) => sum + (item.usdValNumber || 0), 0);

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-[#06080E] text-white font-sans animate-in fade-in duration-200 relative">
      {/* 1. FIXED TOP NAVIGATION HEADER & CONTROLS */}
      <div className="shrink-0 bg-[#06080E] px-2 py-2 space-y-2 z-30">
        {/* Top Header: Total Tokens & Total Value */}
        <div className="flex items-center justify-between px-1 pt-1 pb-0.5">
          {/* Left Metric: Total Tokens Added */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#15803D]/20 border border-[#22C55E]/40 flex items-center justify-center text-[#4ADE80] shrink-0">
              <Box className="w-4 h-4 text-[#4ADE80]" />
            </div>

            <div>
              <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{t('tokens.totalTokens')}</div>
              <div className="text-xs font-black text-white tracking-tight flex items-center gap-1 font-mono">
                <TickerNumber value={formatSmartNumber(totalTokenCount)} />
                <span className="font-sans font-normal text-zinc-300">{t('tokens.added')}</span>
                <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1 rounded font-mono font-medium">
                  {t('common.verified')}
                </span>
              </div>
            </div>
          </div>

          {/* Right Metric: Total Value (USD) + Add Button */}
          <div className="flex items-center space-x-2.5">
            <div className="text-right">
              <div className="text-[8.5px] text-zinc-400 font-bold uppercase tracking-wider">{t('tokens.totalValue')}</div>
              <div className="text-xs font-black text-white font-mono tracking-tight flex items-center justify-end">
                <TickerNumber value={formatSmartCurrency(totalValueUsd)} />
              </div>
            </div>

            <button
              type="button"
              onClick={onNavigateAddToken}
              className="p-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-black rounded-lg font-bold transition-all shadow-[0_2px_10px_rgba(34,197,94,0.3)] cursor-pointer shrink-0 flex items-center space-x-1"
              title={t('tokens.addNewToken')}
            >
              <PlusCircle className="w-4 h-4 fill-black/20" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider hidden sm:inline">{t('tokens.submitToken')}</span>
            </button>
          </div>
        </div>

        {/* Search and Filter Row */}
        <div className="flex items-center space-x-1.5">
          {/* Search Field */}
          <div className="flex-1 bg-[#0B0E17] border border-zinc-800/80 rounded-xl px-2.5 py-1.5 flex items-center space-x-2 focus-within:border-[#22C55E]/50 transition-colors">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('tokens.searchPlaceholder')}
              className="w-full bg-transparent text-white text-[10.5px] placeholder:text-zinc-500 focus:outline-none"
            />
            {searchQuery && (
              <X
                className="w-3 h-3 text-zinc-500 hover:text-white cursor-pointer"
                onClick={() => setSearchQuery('')}
              />
            )}
          </div>

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setFilterActive(!filterActive)}
            className={`px-2.5 py-1.5 bg-[#0B0E17] hover:bg-zinc-800/80 border rounded-xl text-[10.5px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer shrink-0 ${
              filterActive ? 'border-[#22C55E]/60 text-[#4ADE80] bg-[#22C55E]/10' : 'border-zinc-800/80 text-zinc-300'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3 text-zinc-400" />
            <span>{t('common.filter')}</span>
          </button>
        </div>

        {/* Advertising Carousel Component */}
        <div className="w-full">
          <PromoCarousel
            tokens={tokens}
            onNavigateAddToken={onNavigateAddToken}
            onSelectToken={(tok) => {
              if (onSelectToken) onSelectToken(tok);
            }}
          />
        </div>
      </div>

      {/* 2. SCROLLABLE CONTENT AREA (Flat Native Token Directory List) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1 pb-28 scrollbar-thin">
        {filteredTokens.length === 0 ? (
          <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl p-8 text-center space-y-2 mt-2">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <Search className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-zinc-400">
              {t('tokens.noTokensFound', { query: searchQuery })}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {filteredTokens.map((item) => {
              const chainInfo = resolveChainLogo(item.chain, item.chainId);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.rawToken && onSelectToken) {
                      onSelectToken(item.rawToken);
                    } else if (onSelectToken) {
                      onSelectToken({
                        id: item.id,
                        address: item.id,
                        chainId: item.chainId || '137',
                        submittedBy: 'Community',
                        submittedAt: new Date().toISOString(),
                        verified: item.verified,
                        rewardEarnedTokens: 15,
                        rewardEarnedUsd: 15 * 0.10,
                        upvotes: 120,
                        metadata: {
                          address: item.id,
                          chainId: item.chainId || '137',
                          name: item.name,
                          symbol: item.symbol,
                          blockchainName: chainInfo.name,
                          logoUrl: item.logoUrl,
                          totalSupply: item.amountFormatted.replace(item.symbol, '').trim(),
                        },
                        marketData: {
                          priceUsd: 1.25,
                        },
                      });
                    }
                  }}
                  className="py-2.5 px-1 hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors cursor-pointer group flex items-center justify-between gap-2.5 rounded-lg"
                >
                  {/* Left Column: Token Logo + Circular Chain Badge + Name & Network */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={item.logoUrl || chainInfo.logoUrl || NEUTRAL_TOKEN_FALLBACK}
                        alt={item.name}
                        className="w-9 h-9 rounded-full object-cover bg-zinc-900 border border-zinc-800/80 p-0.5"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = chainInfo.logoUrl || NEUTRAL_TOKEN_FALLBACK;
                        }}
                      />
                      {/* Small circular chain logo badge at bottom-right corner */}
                      <div
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-black/90 flex items-center justify-center bg-zinc-900 overflow-hidden ring-1 ring-black/80"
                        title={chainInfo.name}
                      >
                        <img
                          src={chainInfo.logoUrl}
                          alt={chainInfo.name}
                          className="w-2.5 h-2.5 object-contain rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = NEUTRAL_CHAIN_LOGO;
                          }}
                        />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-[#4ADE80] transition-colors">
                          {item.name}
                        </h4>
                        {item.verified && (
                          <CheckCircle2 className="w-3 h-3 text-[#22C55E] shrink-0" title="Verified Token" />
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="text-[11px] font-semibold text-zinc-400 font-mono">
                          ${item.symbol}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-sans truncate">
                          · {chainInfo.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Token Amount & USD Value */}
                  <div className="text-right shrink-0 font-mono">
                    <div className="text-xs font-bold text-white">
                      {item.amountFormatted}
                    </div>
                    <div className="text-[10px] font-semibold text-zinc-400">
                      {item.usdValueFormatted}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Action Button: Add New Token */}
        <button
          type="button"
          onClick={onNavigateAddToken}
          className="w-full py-2.5 px-3 bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] hover:from-[#16A34A] hover:to-[#4ADE80] text-black font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-[0_4px_16px_rgba(34,197,94,0.4)] active:scale-[0.99] mt-3 mb-2"
        >
          <PlusCircle className="w-4 h-4 text-black fill-black/20" />
          <span className="uppercase tracking-wider">{t('tokens.addNewToken')}</span>
        </button>
      </div>
    </div>
  );
};
