import React from 'react';
import {
  Coins,
  Heart,
  Users,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  PlusCircle,
  CheckCircle2,
  Lock,
  Zap,
  Check,
} from 'lucide-react';
import { SubmittedToken, UserRewardWallet } from '../types';
import { REWARD_RATE_USD } from '../constants/chains';
import { CompactBalanceCard } from './CompactBalanceCard';
import { PromoCarousel } from './PromoCarousel';
import { TickerNumber } from './TickerNumber';
import { formatSmartCurrency, formatSmartNumber } from '../utils/numberFormatting';
import { useTranslation } from '../utils/i18n';

interface DashboardOverviewProps {
  tokens: SubmittedToken[];
  wallet?: UserRewardWallet;
  onNavigateAddToken: () => void;
  onSelectToken?: (token: SubmittedToken) => void;
  onOpenRewardModal?: () => void;
  onOpenWithdraw?: () => void;
  sessionStatus?: string;
  isOnline?: boolean;
  isSyncing?: boolean;
  lastSyncTimestamp?: number | null;
  onManualSync?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  tokens,
  wallet,
  onNavigateAddToken,
  onSelectToken,
  onOpenRewardModal,
  onOpenWithdraw,
}) => {
  const { t } = useTranslation();
  const safeTokensCount = tokens.filter((t) => t.safety?.rating === 'SAFE').length;
  const totalLiquidityPool = tokens.reduce((acc, t) => acc + (t.marketData?.liquidityUsd || 0), 0);
  const passRate = tokens.length > 0 ? Math.round((safeTokensCount / tokens.length) * 100) : 100;
  const unclaimedTokens = wallet?.unclaimedTokens ?? 0;
  const rewardUsdEstimate = unclaimedTokens * REWARD_RATE_USD;

  return (
    <div className="space-y-4 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* 1. Compact Balance Section */}
      <CompactBalanceCard
        wallet={wallet}
        onOpenRewardModal={onOpenRewardModal}
        onOpenWithdraw={onOpenWithdraw}
      />

      {/* 2. Dynamic Promotion / Advertising Banner Carousel */}
      <PromoCarousel
        tokens={tokens}
        onNavigateAddToken={onNavigateAddToken}
        onSelectToken={onSelectToken}
      />

      {/* 3. Platform Statistics with Sliding Ticker Digits & Smart Formatting */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-1">
        {/* Metric 1: Your Reward */}
        <div className="bg-[#0B0E17]/80 border border-zinc-800/70 p-3.5 rounded-2xl space-y-1">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            {t('overview.yourReward')}
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono flex items-center gap-1">
            <TickerNumber value={formatSmartNumber(unclaimedTokens)} />
            <span className="text-xs text-amber-400/90 font-bold">REWARD</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-medium font-mono flex items-center gap-0.5">
            <span>≈</span>
            <TickerNumber value={formatSmartCurrency(rewardUsdEstimate, { minDecimals: 3 })} />
            <span>USD</span>
          </div>
        </div>

        {/* Metric 2: Verified Tokens */}
        <div className="bg-[#0B0E17]/80 border border-zinc-800/70 p-3.5 rounded-2xl space-y-1">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            {t('overview.verifiedTokens')}
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono flex items-center gap-1">
            <TickerNumber value={formatSmartNumber(tokens.length)} />
            <span className="text-xs text-zinc-400 font-bold uppercase">{t('common.verified')}</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-medium">
            {t('overview.onChainAudited')}
          </div>
        </div>

        {/* Metric 3: Total Liquidity */}
        <div className="bg-[#0B0E17]/80 border border-zinc-800/70 p-3.5 rounded-2xl space-y-1">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            {t('overview.totalLiquidity')}
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono flex items-center">
            <TickerNumber value={formatSmartCurrency(totalLiquidityPool)} />
          </div>
          <div className="text-[10px] text-zinc-500 font-medium">
            {t('overview.acrossActivePools')}
          </div>
        </div>

        {/* Metric 4: Security Pass Rate */}
        <div className="bg-[#0B0E17]/80 border border-zinc-800/70 p-3.5 rounded-2xl space-y-1">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            {t('overview.passRate')}
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono flex items-center">
            <TickerNumber value={formatSmartNumber(passRate)} suffix="%" />
            <span className="text-xs text-emerald-400/90 font-bold ml-1">PASS</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-medium font-mono">
            {t('overview.safeCountDesc', { safe: safeTokensCount, total: tokens.length })}
          </div>
        </div>
      </div>

      {/* 4. Saved & Verified Tokens Directory */}
      <div className="bg-[#0B0E17]/80 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {t('overview.savedAndVerified')}
              <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                {t('overview.directoryEntries', { count: tokens.length })}
              </span>
            </h2>
            <p className="text-xs text-zinc-400">{t('overview.directorySubtitle')}</p>
          </div>
          <button
            onClick={onNavigateAddToken}
            className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('overview.submitToken')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tokens.map((token) => (
            <div
              key={token.id || token.address}
              onClick={() => onSelectToken && onSelectToken(token)}
              className="bg-[#06080F] border border-zinc-800/80 hover:border-emerald-500/40 p-3.5 rounded-xl space-y-2.5 cursor-pointer transition-all hover:scale-[1.01] group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  {token.metadata?.logoUrl ? (
                    <img
                      src={token.metadata.logoUrl}
                      alt={token.metadata?.symbol || 'Token'}
                      className="w-8 h-8 rounded-xl object-cover shrink-0 border border-emerald-500/30 shadow-sm"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-xs text-emerald-400 shrink-0">
                      {String(token.metadata?.symbol || 'TOK').slice(0, 3)}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-white text-xs group-hover:text-emerald-400 transition-colors">
                      {token.metadata?.name || 'Unknown Token'}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">${token.metadata?.symbol || 'TOK'}</div>
                  </div>
                </div>

                <span className="text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                  {t('common.verified')}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-zinc-800/60 font-mono">
                <span className="text-zinc-400">{t('overview.price')}</span>
                <span className="text-white font-bold">
                  {formatSmartCurrency(token.marketData.priceUsd)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
