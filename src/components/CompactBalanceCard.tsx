import React from 'react';
import { UserRewardWallet } from '../types';
import { REWARD_RATE_USD } from '../constants/chains';
import { ArrowUpRight } from 'lucide-react';
import { TickerNumber } from './TickerNumber';
import { formatSmartCurrency, formatSmartNumber } from '../utils/numberFormatting';
import { useTranslation } from '../utils/i18n';

interface CompactBalanceCardProps {
  wallet?: UserRewardWallet;
  onOpenRewardModal?: () => void;
  onOpenWithdraw?: () => void;
  className?: string;
}

export const CompactBalanceCard: React.FC<CompactBalanceCardProps> = ({
  wallet,
  onOpenRewardModal,
  onOpenWithdraw,
  className = '',
}) => {
  const { t } = useTranslation();
  const unclaimedTokens = wallet?.unclaimedTokens ?? 0;
  const rawRewardUsd = unclaimedTokens * REWARD_RATE_USD;
  const formattedUsd = formatSmartCurrency(rawRewardUsd, { minDecimals: 2 });
  const formattedTokens = formatSmartNumber(unclaimedTokens);

  return (
    <div
      onClick={onOpenRewardModal}
      className={`bg-[#0B0E17]/90 hover:bg-[#0E1320] border border-emerald-500/30 hover:border-emerald-400/50 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between transition-all shadow-md cursor-pointer group ${className}`}
    >
      <div className="space-y-1">
        <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
          {t('overview.totalRewardValue')}
        </span>
        <div className="flex items-center space-x-2.5">
          <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight group-hover:text-emerald-300 transition-colors flex items-center">
            <TickerNumber value={formattedUsd} />
          </span>
          <span className="text-xs font-bold text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
            <TickerNumber value={formattedTokens} />
            <span>REWARD</span>
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {onOpenWithdraw && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenWithdraw();
            }}
            className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/50 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center space-x-1 shadow-sm"
          >
            <span>{t('overview.withdraw')}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        )}
      </div>
    </div>
  );
};
