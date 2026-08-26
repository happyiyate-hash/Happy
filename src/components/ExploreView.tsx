import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  ShieldCheck,
  Clock,
  Flame,
  ArrowUpRight,
  Copy,
  Check,
  X,
  Coins,
  Globe,
  CheckCircle2,
  Menu,
} from 'lucide-react';
import { SubmittedToken } from '../types';
import { resolveChainLogo, NEUTRAL_CHAIN_LOGO } from '../services/chainLogos';
import { getCachedExploreTokens, initGlobalExploreDirectory } from '../services/exploreDirectory';
import { PromoCarousel } from './PromoCarousel';
import { formatSmartCurrency, formatSmartNumber } from '../utils/numberFormatting';
import { useTranslation } from '../utils/i18n';

interface ExploreViewProps {
  tokens?: SubmittedToken[];
  onNavigateDonate?: (token?: SubmittedToken) => void;
  onOpenSidebar?: () => void;
}

// Complete Filter Networks list
const FILTER_NETWORKS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All Chains' },
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'base', label: 'Base' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'solana', label: 'Solana' },
  { id: 'ton', label: 'TON Network' },
  { id: 'xrpl', label: 'XRP Ledger' },
  { id: 'arbitrum', label: 'Arbitrum' },
  { id: 'optimism', label: 'Optimism' },
  { id: 'bsc', label: 'BNB Smart Chain' },
  { id: 'linea', label: 'Linea' },
  { id: 'avalanche', label: 'Avalanche' },
  { id: 'near', label: 'NEAR Protocol' },
  { id: 'cardano', label: 'Cardano' },
  { id: 'sui', label: 'Sui' },
  { id: 'aptos', label: 'Aptos' },
  { id: 'tron', label: 'TRON' },
  { id: 'cosmos', label: 'Cosmos' },
];

type CategoryTab = 'recently_verified' | 'recently_added' | 'top_liquidity' | 'trending';

const NEUTRAL_TOKEN_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%234ADE80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M6 12h12"/></svg>';

export const ExploreView: React.FC<ExploreViewProps> = ({
  tokens: propTokens = [],
  onNavigateDonate,
  onOpenSidebar,
}) => {
  const { t } = useTranslation();

  // Read immediately from global local cache (Stale-while-revalidate)
  const [cachedDirectory, setCachedDirectory] = useState<SubmittedToken[]>(() => {
    return getCachedExploreTokens();
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChainFilter, setSelectedChainFilter] = useState('ALL');
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('recently_verified');

  // Modals & Sheets
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedTokenDetails, setSelectedTokenDetails] = useState<SubmittedToken | null>(null);

  // Copy feedback
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    // Perform silent background update on mount
    initGlobalExploreDirectory((freshTokens) => {
      setCachedDirectory(freshTokens);
    }, propTokens);
  }, [propTokens]);

  // Merge cached directory with prop tokens
  const allTokens = useMemo(() => {
    const map = new Map<string, SubmittedToken>();
    cachedDirectory.forEach((t) => {
      if (t?.address) map.set(t.address.toLowerCase().trim(), t);
    });
    propTokens.forEach((t) => {
      if (t?.address) map.set(t.address.toLowerCase().trim(), t);
    });
    return Array.from(map.values());
  }, [cachedDirectory, propTokens]);

  // Instant local search & local chain filtering
  const filteredTokens = useMemo(() => {
    let result = allTokens.filter((t) => {
      const q = (searchTerm || '').toLowerCase().trim();
      const name = (t?.metadata?.name || '').toLowerCase();
      const symbol = (t?.metadata?.symbol || '').toLowerCase();
      const addr = (t?.address || '').toLowerCase();
      const chainName = (t?.metadata?.blockchainName || (t?.metadata as any)?.chainName || '').toLowerCase();

      const nameMatch = name.includes(q);
      const symbolMatch = symbol.includes(q);
      const addrMatch = addr.includes(q);
      const chainMatch = chainName.includes(q);

      if (q && !(nameMatch || symbolMatch || addrMatch || chainMatch)) {
        return false;
      }

      // Local Chain Filter
      if (selectedChainFilter !== 'ALL') {
        const chainInfo = resolveChainLogo(chainName, t?.chainId || t?.metadata?.chainId);
        const reqChain = resolveChainLogo(selectedChainFilter, selectedChainFilter);
        const matchesId = chainInfo.id === reqChain.id;
        const matchesName = chainName.includes(selectedChainFilter.toLowerCase());
        const matchesShort = (chainInfo.shortName || '').toLowerCase().includes(selectedChainFilter.toLowerCase());
        if (!matchesId && !matchesName && !matchesShort) {
          return false;
        }
      }

      return true;
    });

    // Local Sort according to active category tab
    result = [...result].sort((a, b) => {
      if (activeCategory === 'trending') {
        const scoreA = (a.marketData?.change24h || 0) + (a.upvotes || 0);
        const scoreB = (b.marketData?.change24h || 0) + (b.upvotes || 0);
        return scoreB - scoreA;
      }
      if (activeCategory === 'recently_verified') {
        if (a.verified !== b.verified) return a.verified ? -1 : 1;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
      if (activeCategory === 'recently_added') {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
      if (activeCategory === 'top_liquidity') {
        return (b.marketData?.liquidityUsd || 0) - (a.marketData?.liquidityUsd || 0);
      }
      return 0;
    });

    return result;
  }, [allTokens, searchTerm, selectedChainFilter, activeCategory]);

  const handleCopy = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const formatUsd = (num?: number) => {
    return formatSmartCurrency(num);
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-[#06080E] text-white animate-in fade-in duration-200 relative">
      
      {/* 1. FIXED TOP NAVIGATION & ADVERTISING HEADER (Non-scrolling: Search/Filter + Advertising Card + Category Tabs) */}
      <div className="shrink-0 bg-[#06080E] px-2 py-2 space-y-2 z-30">
        {/* Top Controls: Menu + Search + Filter */}
        <div className="flex items-center space-x-2">
          {/* Left Menu Hamburger Toggle Button */}
          {onOpenSidebar && (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="p-2.5 bg-[#0B0E17] hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800/90 transition-colors cursor-pointer shrink-0"
              title="Toggle Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('explore.searchPlaceholder')}
              className="w-full bg-[#0B0E17] border border-zinc-800/90 text-white text-xs rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 placeholder:text-zinc-600 transition-all font-sans"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Trigger Button */}
          <button
            type="button"
            onClick={() => setIsFilterSheetOpen(true)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              selectedChainFilter !== 'ALL'
                ? 'bg-emerald-500/20 text-[#4ADE80] border-emerald-500/50 shadow-sm'
                : 'bg-[#0B0E17] text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-[#4ADE80]" />
            <span>{t('common.filter')}</span>
            {selectedChainFilter !== 'ALL' && (
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            )}
          </button>
        </div>

        {selectedChainFilter !== 'ALL' && (
          <div className="flex items-center space-x-2 pt-0.5">
            <span className="text-[11px] font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
              <span>{t('tokens.chain')}: {resolveChainLogo(selectedChainFilter, selectedChainFilter).name}</span>
              <X
                className="w-3 h-3 text-zinc-500 hover:text-white cursor-pointer"
                onClick={() => setSelectedChainFilter('ALL')}
              />
            </span>
          </div>
        )}

        {/* Center: Advertising Card (PromoCarousel) */}
        <div className="w-full">
          <PromoCarousel
            tokens={allTokens}
            onNavigateAddToken={() => {
              if (onNavigateDonate) onNavigateDonate();
            }}
            onSelectToken={(tok) => {
              if (onNavigateDonate) onNavigateDonate(tok);
            }}
          />
        </div>

        {/* Bottom of Group (Under Advertising Card): Category Sorting Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pt-0.5 pb-0.5">
          {[
            { id: 'recently_verified', label: t('explore.recentlyVerified'), icon: ShieldCheck },
            { id: 'recently_added', label: t('explore.recentlyAdded'), icon: Clock },
            { id: 'top_liquidity', label: t('explore.liquidity'), icon: Coins },
            { id: 'trending', label: t('explore.trending'), icon: Flame },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as CategoryTab)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                  isActive
                    ? 'bg-emerald-500/15 text-[#4ADE80] border-emerald-500/40 shadow-sm'
                    : 'bg-[#0B0E17] text-zinc-400 hover:text-white border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <Icon className={`w-3 h-3 ${isActive ? 'text-[#4ADE80]' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SCROLLABLE CONTENT AREA (Only the Token Directory List Scrolls!) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1 pb-28 scrollbar-thin">
        {/* Flat Native Token Directory List */}
        {filteredTokens.length === 0 ? (
          <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl p-8 text-center space-y-2 mt-2">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <Search className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">{t('explore.noTokensFound')}</h3>
            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
              {t('explore.noTokensFoundDesc')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {filteredTokens.map((t) => {
              const chainInfo = resolveChainLogo(
                t.metadata.blockchainName || (t.metadata as any).chainName,
                t.chainId || t.metadata.chainId
              );
              const isPositive = (t.marketData?.change24h || 0) >= 0;

              return (
                <div
                  key={t.id || t.address}
                  onClick={() => setSelectedTokenDetails(t)}
                  className="py-2.5 px-1 hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors cursor-pointer group flex items-center justify-between gap-2.5 rounded-lg"
                >
                  {/* Left Column: Token Logo + Overlapping Circular Chain Badge + Name/Symbol */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={t.metadata.logoUrl || chainInfo.logoUrl || NEUTRAL_TOKEN_FALLBACK}
                        alt={t.metadata.name}
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
                          {t.metadata.name}
                        </h4>
                        {t.verified && (
                          <CheckCircle2 className="w-3 h-3 text-[#22C55E] shrink-0" title="Verified Token" />
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="text-[11px] font-semibold text-zinc-400 font-mono">
                          ${t.metadata.symbol}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-sans truncate">
                          · {chainInfo.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Price & 24h Change */}
                  <div className="text-right shrink-0 font-mono">
                    <div className="text-xs font-bold text-white">
                      {formatUsd(t.marketData?.priceUsd)}
                    </div>
                    <div
                      className={`text-[10px] font-semibold ${
                        isPositive ? 'text-[#4ADE80]' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {(t.marketData?.change24h || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. BLOCKCHAIN FILTER BOTTOM SHEET MODAL */}
      {isFilterSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsFilterSheetOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#0B0E17] border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-4 space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-[#4ADE80]" />
                <h3 className="text-sm font-bold text-white">{t('explore.selectChain')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Blockchain Options */}
            <div className="grid grid-cols-1 gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
              {FILTER_NETWORKS.map((net) => {
                const chainInfo = net.id === 'ALL' ? null : resolveChainLogo(net.id, net.id);
                const isSelected = selectedChainFilter === net.id;

                // Calculate count for this chain in current dataset
                const count =
                  net.id === 'ALL'
                    ? allTokens.length
                    : allTokens.filter((t) => {
                        const info = resolveChainLogo(
                          t.metadata.blockchainName || (t.metadata as any).chainName,
                          t.chainId || t.metadata.chainId
                        );
                        return (
                          info.id === chainInfo?.id ||
                          String(info.shortName || '').toLowerCase() === String(net.id || '').toLowerCase() ||
                          String(t.metadata.blockchainName || '').toLowerCase().includes(String(net.id || '').toLowerCase())
                        );
                      }).length;

                return (
                  <button
                    key={net.id}
                    type="button"
                    onClick={() => {
                      setSelectedChainFilter(net.id);
                      setIsFilterSheetOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white font-bold'
                        : 'bg-[#070A12] border-zinc-800/80 text-zinc-300 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      {chainInfo ? (
                        <img
                          src={chainInfo.logoUrl}
                          alt={net.label}
                          className="w-5 h-5 rounded-full object-contain bg-zinc-900 border border-zinc-800"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = NEUTRAL_CHAIN_LOGO;
                          }}
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-[#4ADE80] flex items-center justify-center font-bold text-[9px] font-mono">
                          ALL
                        </div>
                      )}
                      <span className="text-xs">{net.id === 'ALL' ? t('explore.allChains') : net.label}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-zinc-500 font-mono">{t('explore.tokensCount', { count })}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#4ADE80]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. TOKEN DETAILS BOTTOM SHEET MODAL */}
      {selectedTokenDetails && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedTokenDetails(null)}
        >
          <div
            className="w-full max-w-lg bg-[#0B0E17] border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Row */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative shrink-0">
                  <img
                    src={
                      selectedTokenDetails.metadata.logoUrl ||
                      resolveChainLogo(
                        selectedTokenDetails.metadata.blockchainName || (selectedTokenDetails.metadata as any).chainName,
                        selectedTokenDetails.chainId || selectedTokenDetails.metadata.chainId
                      ).logoUrl
                    }
                    alt={selectedTokenDetails.metadata.name}
                    className="w-12 h-12 rounded-xl object-cover bg-zinc-900 border border-zinc-800 p-0.5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = NEUTRAL_TOKEN_FALLBACK;
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 border border-black flex items-center justify-center overflow-hidden">
                    <img
                      src={
                        resolveChainLogo(
                          selectedTokenDetails.metadata.blockchainName || (selectedTokenDetails.metadata as any).chainName,
                          selectedTokenDetails.chainId || selectedTokenDetails.metadata.chainId
                        ).logoUrl
                      }
                      alt="chain"
                      className="w-3.5 h-3.5 rounded-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = NEUTRAL_CHAIN_LOGO;
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-base font-black text-white">
                      {selectedTokenDetails.metadata.name}
                    </h3>
                    {selectedTokenDetails.verified && (
                      <span className="bg-emerald-500/15 text-[#4ADE80] border border-emerald-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded">
                        {t('common.verified')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-xs font-bold text-zinc-400 font-mono">
                      ${selectedTokenDetails.metadata.symbol}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-sans">
                      {
                        resolveChainLogo(
                          selectedTokenDetails.metadata.blockchainName || (selectedTokenDetails.metadata as any).chainName,
                          selectedTokenDetails.chainId || selectedTokenDetails.metadata.chainId
                        ).name
                      }
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTokenDetails(null)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contract Address Section */}
            <div className="bg-[#06080E] border border-zinc-800 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                {t('explore.contractAddress')}
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-zinc-200 truncate select-all">
                  {selectedTokenDetails.address}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopy(selectedTokenDetails.address, e)}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] font-bold rounded-lg border border-zinc-800 transition-colors cursor-pointer flex items-center space-x-1 shrink-0"
                >
                  {copiedAddress === selectedTokenDetails.address ? (
                    <>
                      <Check className="w-3 h-3 text-[#4ADE80]" />
                      <span className="text-[#4ADE80]">{t('common.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{t('common.copy')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Market & Security Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="bg-[#070A12] border border-zinc-800/80 rounded-xl p-2.5">
                <span className="text-[9.5px] text-zinc-500 font-bold uppercase block">{t('explore.price')}</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                  {formatUsd(selectedTokenDetails.marketData?.priceUsd)}
                </span>
              </div>

              <div className="bg-[#070A12] border border-zinc-800/80 rounded-xl p-2.5">
                <span className="text-[9.5px] text-zinc-500 font-bold uppercase block">{t('explore.change24h')}</span>
                <span
                  className={`text-xs font-mono font-bold mt-0.5 block ${
                    (selectedTokenDetails.marketData?.change24h || 0) >= 0 ? 'text-[#4ADE80]' : 'text-rose-400'
                  }`}
                >
                  {(selectedTokenDetails.marketData?.change24h || 0) >= 0 ? '+' : ''}
                  {(selectedTokenDetails.marketData?.change24h || 0).toFixed(2)}%
                </span>
              </div>

              <div className="bg-[#070A12] border border-zinc-800/80 rounded-xl p-2.5">
                <span className="text-[9.5px] text-zinc-500 font-bold uppercase block">{t('explore.liquidity')}</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                  {formatUsd(selectedTokenDetails.marketData?.liquidityUsd)}
                </span>
              </div>

              <div className="bg-[#070A12] border border-zinc-800/80 rounded-xl p-2.5">
                <span className="text-[9.5px] text-zinc-500 font-bold uppercase block">{t('explore.marketCap')}</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                  {formatUsd(selectedTokenDetails.marketData?.marketCapUsd)}
                </span>
              </div>

              <div className="bg-[#070A12] border border-zinc-800/80 rounded-xl p-2.5">
                <span className="text-[9.5px] text-zinc-500 font-bold uppercase block">{t('explore.volume24h')}</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                  {formatUsd(selectedTokenDetails.marketData?.volume24hUsd)}
                </span>
              </div>

              <div className="bg-[#070A12] border border-zinc-800/80 rounded-xl p-2.5">
                <span className="text-[9.5px] text-zinc-500 font-bold uppercase block">{t('explore.trustScore')}</span>
                <span className="text-xs font-mono font-bold text-[#4ADE80] mt-0.5 block">
                  {selectedTokenDetails.verificationReport?.trustScore || selectedTokenDetails.safety?.score || 95}/100
                </span>
              </div>
            </div>

            {/* Verification Summary */}
            {selectedTokenDetails.verificationReport?.summary && (
              <div className="bg-[#06080E] border border-zinc-800/80 rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  {t('explore.verificationReport')}
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {selectedTokenDetails.verificationReport.summary}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onNavigateDonate) {
                    onNavigateDonate(selectedTokenDetails);
                  }
                  setSelectedTokenDetails(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#16A34A] to-[#22C55E] hover:from-[#15803D] hover:to-[#16A34A] text-black font-extrabold text-xs transition-all cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
              >
                <span>{t('explore.supportToken')}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedTokenDetails(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
