import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { X, Coins, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { UserRewardWallet } from '../types';
import { REWARD_RATE_USD } from '../constants/chains';
import { saveRewardWallet } from '../services/storage';
import { TickerNumber } from './TickerNumber';
import { formatSmartCurrency, formatSmartNumber } from '../utils/numberFormatting';
import { useTranslation } from '../context/I18nContext';
import { triggerHaptic } from '../utils/capacitor';

interface RewardWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: UserRewardWallet;
  onUpdateWallet: (updated: UserRewardWallet) => void;
  userId?: string;
}

const playClaimConfetti = () => {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    void confetti({
      particleCount: 42,
      spread: 68,
      startVelocity: 30,
      gravity: 1.08,
      decay: 0.93,
      ticks: 105,
      origin: { y: 0.6 },
      colors: ['#10B981', '#34D399', '#059669', '#F59E0B'],
      disableForReducedMotion: true,
    });
  } catch (e) {
    console.warn('Confetti error:', e);
  }
};

export const RewardWalletModal: React.FC<RewardWalletModalProps> = ({ isOpen, onClose, wallet, onUpdateWallet, userId }) => {
  const { t } = useTranslation();
  const [claimAddress, setClaimAddress] = useState(wallet?.walletAddress || '');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleClaim = () => {
    if ((wallet?.unclaimedTokens ?? 0) <= 0) return;
    setIsClaiming(true);
    setClaimSuccessMsg('');

    setTimeout(() => {
      playClaimConfetti();
      void triggerHaptic.success();

      const claimedAmountTokens = wallet?.unclaimedTokens ?? 0;
      const claimedAmountUsd = claimedAmountTokens * REWARD_RATE_USD;
      const newClaimTx = {
        id: `tx-claim-${Date.now()}`,
        type: 'CLAIM' as const,
        amountTokens: claimedAmountTokens,
        amountUsd: claimedAmountUsd,
        timestamp: new Date().toISOString(),
        txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        status: 'COMPLETED' as const,
      };

      const updated: UserRewardWallet = {
        ...wallet,
        claimedTokens: (wallet?.claimedTokens ?? 0) + claimedAmountTokens,
        claimedUsd: ((wallet?.claimedTokens ?? 0) + claimedAmountTokens) * REWARD_RATE_USD,
        unclaimedTokens: 0,
        unclaimedUsd: 0,
        transactions: [newClaimTx, ...(wallet?.transactions || [])],
      };

      saveRewardWallet(updated, userId);
      onUpdateWallet(updated);
      setIsClaiming(false);
      setClaimSuccessMsg(`Successfully claimed ${claimedAmountTokens} REWARD Tokens ($${claimedAmountUsd.toFixed(3)} USD) to ${String(claimAddress || '').slice(0, 6)}...${String(claimAddress || '').slice(-4)}!`);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400"><Coins className="w-5 h-5" /></div>
            <div>
              <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">{t('walletModal.title', 'Reward Tokens Wallet')}<span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold font-mono">{t('walletModal.rate', '$0.00015 / Token')}</span></h2>
              <p className="text-xs text-zinc-400">{t('walletModal.subtitle', 'Earned via token smart contract submissions & safety scanning')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-zinc-950/80 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3"><Sparkles className="w-6 h-6 text-amber-400 shrink-0" /><div className="text-xs"><div className="font-bold text-zinc-200 text-sm">{t('walletModal.rateGuarantee', 'Token Reward Rate: $0.00015 USD')}</div><div className="text-zinc-400 mt-0.5">{t('walletModal.rateDesc', 'Every 1 REWARD token is valued at $0.00015 USD. 6,666.67 Tokens = $1.00 USD minimum.')}</div></div></div>
          <div className="text-right shrink-0"><div className="text-xs font-mono text-emerald-400 font-bold">1 Token = $0.00015</div><div className="text-[10px] text-zinc-500">{t('walletModal.fixedConversion', 'Fixed Conversion')}</div></div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl"><div className="text-xs text-zinc-400">{t('walletModal.unclaimedBalance', 'Unclaimed Balance')}</div><div className="text-xl font-bold text-amber-400 font-mono mt-1 flex items-center gap-1"><TickerNumber value={formatSmartNumber(wallet?.unclaimedTokens ?? 0)} /><span className="text-xs text-amber-400/80">REWARD</span></div><div className="text-xs font-mono text-emerald-400 mt-0.5 flex items-center gap-1"><span>=</span><TickerNumber value={formatSmartCurrency((wallet?.unclaimedTokens ?? 0) * REWARD_RATE_USD, { minDecimals: 3 })} /><span>USD</span></div></div>
          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl"><div className="text-xs text-zinc-400">{t('walletModal.claimedTokens', 'Claimed Tokens')}</div><div className="text-xl font-bold text-zinc-200 font-mono mt-1 flex items-center gap-1"><TickerNumber value={formatSmartNumber(wallet?.claimedTokens ?? 0)} /><span className="text-xs text-zinc-400">REWARD</span></div><div className="text-xs font-mono text-zinc-400 mt-0.5 flex items-center gap-1"><span>=</span><TickerNumber value={formatSmartCurrency((wallet?.claimedTokens ?? 0) * REWARD_RATE_USD, { minDecimals: 3 })} /><span>USD</span></div></div>
          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl"><div className="text-xs text-zinc-400">{t('walletModal.lifetimeEarned', 'Total Lifetime Earned')}</div><div className="text-xl font-bold text-blue-400 font-mono mt-1 flex items-center gap-1"><TickerNumber value={formatSmartNumber(wallet?.totalTokens ?? 0)} /><span className="text-xs text-blue-400">REWARD</span></div><div className="text-xs font-mono text-zinc-400 mt-0.5 flex items-center gap-1"><span>=</span><TickerNumber value={formatSmartCurrency((wallet?.totalTokens ?? 0) * REWARD_RATE_USD, { minDecimals: 3 })} /><span>USD</span></div></div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center justify-between"><span>{t('walletModal.claimReward', 'Claim Rewards to Web3 Wallet')}</span><span className="text-xs font-normal text-zinc-400">Instant On-Chain Distribution</span></h3>
          <div className="space-y-1.5"><label className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">{t('wallet.recipientAddress', 'Destination EVM Wallet Address')}</label><input type="text" value={claimAddress} onChange={(e) => setClaimAddress(e.target.value)} placeholder="0x742d35Cc6634C0532925a3b844Bc454e4438f44e" className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 font-mono text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500" /></div>
          {claimSuccessMsg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /><span>{claimSuccessMsg}</span></div>}
          <button onClick={handleClaim} disabled={isClaiming || (wallet?.unclaimedTokens ?? 0) <= 0} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer transition-all">{isClaiming ? <span>{t('walletModal.claiming', 'Signing Claim Transaction...')}</span> : <><Sparkles className="w-4 h-4" /><span>Claim {wallet?.unclaimedTokens ?? 0} REWARD Tokens (${((wallet?.unclaimedTokens ?? 0) * REWARD_RATE_USD).toFixed(3)})</span></>}</button>
        </div>

        <div><h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center space-x-2"><Clock className="w-4 h-4 text-blue-400" /><span>{t('wallet.transactionHistory', 'Reward History Ledger')}</span></h3><div className="space-y-2 max-h-48 overflow-y-auto pr-1">{(!wallet?.transactions || wallet.transactions.length === 0) ? <div className="text-center py-6 text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">{t('wallet.noTransactions', 'No reward transactions yet. Submit a token address to earn your first reward!')}</div> : wallet.transactions.map((tx) => <div key={tx.id} className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-xl text-xs flex items-center justify-between"><div className="flex items-center space-x-3"><div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${tx.type === 'CLAIM' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{tx.type === 'CLAIM' ? 'OUT' : '+'}</div><div><div className="font-semibold text-zinc-200">{tx.type === 'CLAIM' ? 'Wallet Claim Outflow' : tx.type === 'SAFETY_BONUS' ? `Safety Bonus (${tx.tokenSymbol || 'Token'})` : `Token Submission (${tx.tokenSymbol || 'Token'})`}</div><div className="text-[11px] text-zinc-400 font-mono">{new Date(tx.timestamp).toLocaleString()}</div></div></div><div className="text-right"><div className={`font-mono font-bold ${tx.type === 'CLAIM' ? 'text-blue-400' : 'text-emerald-400'}`}>{tx.type === 'CLAIM' ? '-' : '+'}{tx.amountTokens} REWARD</div><div className="text-[11px] text-zinc-400 font-mono">(${tx.amountUsd.toFixed(3)})</div></div></div>)}</div></div>
      </div>
    </div>
  );
};
