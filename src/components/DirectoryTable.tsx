import React, { useState } from 'react';
import { Search, ShieldCheck, ShieldAlert, AlertTriangle, ThumbsUp, ExternalLink, ArrowUpDown, Copy, Check, Filter } from 'lucide-react';
import { SubmittedToken } from '../types';
import { SUPPORTED_CHAINS, REWARD_RATE_USD, getChainInfo } from '../constants/chains';
import { formatSmartCurrency, formatSmartNumber } from '../utils/numberFormatting';
import { useTranslation } from '../context/I18nContext';

interface DirectoryTableProps {
  tokens: SubmittedToken[];
  onSelectToken: (token: SubmittedToken) => void;
  onUpvoteToken: (tokenId: string) => void;
}

export const DirectoryTable: React.FC<DirectoryTableProps> = ({
  tokens,
  onSelectToken,
  onUpvoteToken,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState<'ALL' | 'SAFE' | 'CAUTION' | 'HIGH_RISK'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'SAFETY' | 'MARKET_CAP' | 'REWARD'>('NEWEST');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (address: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter logic
  const filtered = tokens.filter((t) => {
    const term = (searchTerm || '').toLowerCase();
    const name = (t?.metadata?.name || '').toLowerCase();
    const symbol = (t?.metadata?.symbol || '').toLowerCase();
    const address = (t?.address || '').toLowerCase();

    const matchesSearch =
      name.includes(term) ||
      symbol.includes(term) ||
      address.includes(term);

    const matchesRating = filterRating === 'ALL' || t?.safety?.rating === filterRating;

    return matchesSearch && matchesRating;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'SAFETY') return b.safety.score - a.safety.score;
    if (sortBy === 'MARKET_CAP') return b.marketData.marketCapUsd - a.marketData.marketCapUsd;
    if (sortBy === 'REWARD') return b.rewardEarnedTokens - a.rewardEarnedTokens;
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-5 backdrop-blur-sm">
      {/* Directory Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            {t('directory.title')}
            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-medium">
              {t('directory.verifiedTokens', { count: tokens.length })}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {t('directory.subtitle')}
          </p>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('directory.searchPlaceholder')}
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl pl-9 pr-3 py-2 w-48 sm:w-60 focus:outline-none focus:border-blue-500 placeholder:text-zinc-600"
            />
          </div>

          {/* Safety Filter Pills */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setFilterRating('ALL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filterRating === 'ALL' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t('directory.all')}
            </button>
            <button
              onClick={() => setFilterRating('SAFE')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filterRating === 'SAFE'
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-400 hover:text-emerald-400'
              }`}
            >
              {t('directory.safe')}
            </button>
            <button
              onClick={() => setFilterRating('CAUTION')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filterRating === 'CAUTION'
                  ? 'bg-amber-600 text-white'
                  : 'text-zinc-400 hover:text-amber-400'
              }`}
            >
              {t('directory.caution')}
            </button>
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
          >
            <option value="NEWEST" className="bg-zinc-900 text-zinc-100">{t('directory.newest')}</option>
            <option value="SAFETY" className="bg-zinc-900 text-zinc-100">{t('directory.highestSafety')}</option>
            <option value="MARKET_CAP" className="bg-zinc-900 text-zinc-100">{t('directory.highestMarketCap')}</option>
            <option value="REWARD" className="bg-zinc-900 text-zinc-100">{t('directory.highestReward')}</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto border border-zinc-800 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-950/90 text-zinc-400 uppercase font-semibold border-b border-zinc-800 text-[10px] tracking-wider">
            <tr>
              <th className="py-3.5 px-4">{t('directory.tokenAndNetwork')}</th>
              <th className="py-3.5 px-4">{t('directory.contractAddress')}</th>
              <th className="py-3.5 px-4 text-right">{t('directory.priceUsd')}</th>
              <th className="py-3.5 px-4 text-right">{t('directory.change24h')}</th>
              <th className="py-3.5 px-4 text-center">{t('directory.safetyScore')}</th>
              <th className="py-3.5 px-4 text-right">{t('directory.rewardPaid')}</th>
              <th className="py-3.5 px-4 text-center">{t('directory.community')}</th>
              <th className="py-3.5 px-4 text-right">{t('directory.action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80 text-zinc-200 font-medium">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500">
                  {t('directory.noTokensFound')}
                </td>
              </tr>
            ) : (
              sorted.map((t) => {
                const chainInfo = SUPPORTED_CHAINS[t.chainId] || getChainInfo(t.chainId);
                const chainDisplayName =
                  t.metadata?.blockchainName ||
                  (t.metadata as any)?.blockchain_name ||
                  (t.metadata as any)?.blockchain ||
                  t.metadata?.chainName ||
                  t.metadata?.network ||
                  chainInfo?.name ||
                  t.chainId;
                const isPositive = t.marketData.priceChange24h >= 0;

                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectToken(t)}
                    className="hover:bg-zinc-800/60 transition-colors cursor-pointer group"
                  >
                    {/* Symbol & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        {t.metadata?.logoUrl ? (
                          <img
                            src={t.metadata.logoUrl}
                            alt={t.metadata?.symbol || 'Token'}
                            className="w-8 h-8 rounded-lg object-cover shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center font-bold text-xs text-blue-400 shrink-0">
                            {String(t.metadata?.symbol || 'TOK').substring(0, 3)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                            <span>{t.metadata?.name || 'Token'}</span>
                            <span className="text-zinc-500 font-mono text-[11px]">${t.metadata?.symbol || 'TOK'}</span>
                          </div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                            <span>{chainInfo?.icon || '⛓️'}</span>
                            <span>{chainDisplayName}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5 font-mono text-zinc-400 text-[11px]">
                        <span>
                          {t.address ? `${String(t.address).slice(0, 6)}...${String(t.address).slice(-4)}` : 'N/A'}
                        </span>
                        {t.address && (
                          <button
                            onClick={(e) => handleCopy(t.address, t.id, e)}
                            className="hover:text-zinc-100 transition-colors p-1"
                            title="Copy Address"
                          >
                            {copiedId === t.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-200">
                      {formatSmartCurrency(t.marketData.priceUsd)}
                    </td>

                    {/* 24h Change */}
                    <td className={`py-3.5 px-4 text-right font-bold font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}{t.marketData.priceChange24h.toFixed(2)}%
                    </td>

                    {/* Safety Score */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center space-x-1 font-mono font-bold px-2 py-0.5 rounded-full border text-[11px]">
                        {t.safety.rating === 'SAFE' && (
                          <span className="text-emerald-400 bg-emerald-500/10 border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> {t.safety.score}/100
                          </span>
                        )}
                        {t.safety.rating === 'CAUTION' && (
                          <span className="text-amber-400 bg-amber-500/10 border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {t.safety.score}/100
                          </span>
                        )}
                        {t.safety.rating === 'HIGH_RISK' && (
                          <span className="text-rose-400 bg-rose-500/10 border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> {t.safety.score}/100
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Reward Earned */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="font-bold text-amber-300">{formatSmartNumber(t.rewardEarnedTokens)} REWARD</div>
                      <div className="text-[10px] text-zinc-400">
                        ({formatSmartCurrency(t.rewardEarnedTokens * REWARD_RATE_USD, { minDecimals: 3 })})
                      </div>
                    </td>

                    {/* Upvotes */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpvoteToken(t.id);
                        }}
                        className="inline-flex items-center space-x-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg border border-zinc-800 transition-colors cursor-pointer"
                      >
                        <ThumbsUp className="w-3 h-3 text-blue-400" />
                        <span className="font-bold text-xs">{t.upvotes}</span>
                      </button>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectToken(t);
                        }}
                        className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        {t('directory.inspect')}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
