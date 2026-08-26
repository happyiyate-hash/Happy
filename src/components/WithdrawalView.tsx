import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Wallet,
  ShieldCheck,
  RefreshCw,
  Coins,
  ArrowRight,
  Plus,
  Save,
} from 'lucide-react';
import { UserRewardWallet } from '../types';
import {
  SupabaseUserProfile,
  submitWithdrawalRequest,
  getUserWithdrawalAddress,
  saveUserWithdrawalAddress,
} from '../lib/supabase';
import { REWARD_RATE_USD } from '../constants/chains';
import { TickerNumber } from './TickerNumber';
import { formatSmartNumber, safeLocaleString, safeFractionDigits } from '../utils/numberFormatting';
import { useTranslation } from '../utils/i18n';

interface WithdrawalViewProps {
  currentUser: any;
  userProfile: SupabaseUserProfile | null;
  wallet: UserRewardWallet;
  onUpdateWallet: (wallet: UserRewardWallet) => void;
  onBack?: () => void;
}

export const WithdrawalView: React.FC<WithdrawalViewProps> = ({
  currentUser,
  userProfile,
  wallet,
  onUpdateWallet,
  onBack,
}) => {
  const { t } = useTranslation();
  // Exchange Rate Constants: 1 Token = $0.00015 USD
  // Minimum withdrawal: $1.00 USD (6,666.67 Tokens)
  const MIN_WITHDRAWAL_USD = 1.0;
  const MIN_WITHDRAWAL_TOKENS = MIN_WITHDRAWAL_USD / REWARD_RATE_USD; // 6,666.67 tokens

  const userId = currentUser?.id || 'demo-user';

  // Available user balance (tokens from database or wallet)
  const rawTokens = userProfile?.unclaimed_reward_balance ?? wallet.unclaimedTokens ?? 0;
  const displayBalanceTokens = Math.max(0, rawTokens);

  // Input states
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [usdAmount, setUsdAmount] = useState<string>('');
  const [inputMode, setInputMode] = useState<'TOKEN' | 'USD'>('TOKEN'); // toggle mode

  // Saved EVM address from DB
  const [savedAddress, setSavedAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(true);
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [newAddressInput, setNewAddressInput] = useState<string>('');
  const [isSavingAddress, setIsSavingAddress] = useState<boolean>(false);

  // Status & Notifications
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Fetch saved payout address from Supabase DB on mount
  useEffect(() => {
    let isMounted = true;
    async function loadAddress() {
      setIsLoadingAddress(true);
      try {
        if (userProfile?.wallet_address && /^0x[a-fA-F0-9]{40}$/.test(userProfile.wallet_address.trim())) {
          if (isMounted) setSavedAddress(userProfile.wallet_address.trim());
        } else if (userId) {
          const fetched = await getUserWithdrawalAddress(userId);
          if (isMounted && fetched) {
            setSavedAddress(fetched);
          } else if (isMounted) {
            setSavedAddress('');
          }
        }
      } catch (err) {
        console.warn('Error fetching saved address from DB:', err);
        if (isMounted) setSavedAddress('');
      } finally {
        if (isMounted) setIsLoadingAddress(false);
      }
    }
    loadAddress();
    return () => {
      isMounted = false;
    };
  }, [userId, userProfile]);

  // Handle saving new payout address
  const handleSavePayoutAddress = async () => {
    if (!newAddressInput || !/^0x[a-fA-F0-9]{40}$/.test(newAddressInput.trim())) {
      setSubmitError('Please enter a valid EVM address (starts with 0x followed by 40 hexadecimal characters).');
      return;
    }

    setIsSavingAddress(true);
    setSubmitError(null);
    try {
      const clean = newAddressInput.trim();
      const res = await saveUserWithdrawalAddress(userId, clean);
      if (res.success) {
        setSavedAddress(clean);
        setIsEditingAddress(false);
        setNewAddressInput('');
        setSubmitSuccess('Payout address successfully saved to your profile!');
      } else {
        setSubmitError(res.error || 'Failed to save payout address.');
      }
    } catch (e: any) {
      setSubmitError(e.message || 'Error saving address.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Handle Token input changes
  const handleTokenChange = (val: string) => {
    setSubmitError(null);
    setSubmitSuccess(null);
    setTokenAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setUsdAmount((num * REWARD_RATE_USD).toFixed(4));
    } else {
      setUsdAmount('');
    }
  };

  // Handle USD input changes
  const handleUsdChange = (val: string) => {
    setSubmitError(null);
    setSubmitSuccess(null);
    setUsdAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setTokenAmount((num / REWARD_RATE_USD).toFixed(2));
    } else {
      setTokenAmount('');
    }
  };

  // Toggle input mode (Swap button)
  const handleSwapMode = () => {
    setInputMode((prev) => (prev === 'TOKEN' ? 'USD' : 'TOKEN'));
  };

  // MAX button handler
  const handleSetMax = () => {
    setSubmitError(null);
    setSubmitSuccess(null);
    handleTokenChange(displayBalanceTokens.toString());
  };

  // Execute actual withdrawal submission
  const executeWithdrawal = async () => {
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!savedAddress || !/^0x[a-fA-F0-9]{40}$/.test(savedAddress.trim())) {
      setSubmitError('No valid payout address found. Please add and save your EVM payout address first.');
      setIsEditingAddress(true);
      return;
    }

    const amountTokensNum = parseFloat(tokenAmount);
    const amountUsdNum = amountTokensNum * REWARD_RATE_USD;

    if (!tokenAmount || isNaN(amountTokensNum) || amountTokensNum <= 0) {
      setSubmitError('Please enter a valid amount of tokens to send.');
      return;
    }

    if (amountTokensNum > displayBalanceTokens) {
      setSubmitError(
        `Insufficient balance. Requested ${amountTokensNum.toLocaleString()} TCARE, but your available balance is ${displayBalanceTokens.toLocaleString()} TCARE.`
      );
      return;
    }

    if (amountUsdNum < MIN_WITHDRAWAL_USD) {
      setSubmitError(
        `Minimum amount is not enough. Minimum withdrawal is $${MIN_WITHDRAWAL_USD.toFixed(
          2
        )} USD (${Math.ceil(MIN_WITHDRAWAL_TOKENS).toLocaleString()} TCARE).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitWithdrawalRequest(
        userId,
        amountTokensNum,
        savedAddress,
        '137'
      );

      if (res.success && res.request) {
        setSubmitSuccess(
          `Withdrawal request for ${safeLocaleString(amountTokensNum, safeFractionDigits(0, 2))} TCARE ($${amountUsdNum.toFixed(2)} USD) successfully submitted!`
        );
        setTokenAmount('');
        setUsdAmount('');

        // Update local wallet balance state
        const remainingTokens = Math.max(0, displayBalanceTokens - amountTokensNum);
        onUpdateWallet({
          ...wallet,
          unclaimedTokens: remainingTokens,
          unclaimedUsd: remainingTokens * REWARD_RATE_USD,
        });
      } else {
        setSubmitError(res.error || 'Failed to process withdrawal request.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred while submitting withdrawal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    /* FIXED FULL SCREEN OVERLAY: Own Layout, completely non-scrolling viewport */
    <div className="fixed inset-0 z-[100] w-full h-full bg-[#06080E] text-white flex flex-col overflow-hidden select-none animate-in fade-in duration-300">
      
      {/* 1. FIXED TOP NAVIGATION HEADER FOR WITHDRAWAL/SEND PAGE */}
      <header className="shrink-0 z-40 bg-[#090C12] backdrop-blur-xl border-b border-emerald-500/30 rounded-b-2xl p-2.5 pt-safe-nav shadow-[0_4px_25px_rgba(0,0,0,0.7)] max-w-md mx-auto w-full transition-all flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-1 text-zinc-300 hover:text-white transition-colors cursor-pointer bg-[#121624] border border-zinc-800 px-2.5 py-1 rounded-lg text-[11px] font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#4ADE80]" />
          <span>{t('common.back')}</span>
        </button>

        <div className="flex items-center space-x-1.5">
          <h1 className="text-sm font-black tracking-tight text-white uppercase">{t('wallet.withdraw')}</h1>
        </div>

        {/* USDT Logo & Badge at top right */}
        <div className="flex items-center space-x-1.5 bg-[#0D2118] border border-[#22C55E]/40 px-2.5 py-1 rounded-full shadow-md">
          <img
            src="https://assets.coingecko.com/coins/images/325/large/Tether.png"
            alt="USDT"
            className="w-4 h-4 rounded-full object-cover shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="text-[11px] font-black text-[#4ADE80] font-mono tracking-wider">
            USDT
          </span>
        </div>
      </header>

      {/* 2. SCROLLABLE MIDDLE CONTENT AREA */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4 max-w-md mx-auto w-full pb-10">

        {/* 2. SAVED PAYOUT ADDRESS CARD (Auto-fetched from database with inline Add/Edit) */}
        <div className="bg-[#0D111A] border border-[#22C55E]/30 rounded-2xl p-3.5 space-y-2.5 text-xs shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/40 flex items-center justify-center text-[#4ADE80] shrink-0">
                <Wallet className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  {t('settings.savedAddress')}
                </div>
                <div className="text-xs font-mono font-bold text-[#4ADE80] flex items-center space-x-1.5 mt-0.5">
                  {isLoadingAddress ? (
                    <span className="text-zinc-500 animate-pulse">{t('common.loading')}</span>
                  ) : savedAddress ? (
                    <>
                      <span className="truncate max-w-[170px] sm:max-w-[200px]">{savedAddress}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] inline shrink-0" />
                    </>
                  ) : (
                    <span className="text-amber-400 font-semibold">{t('common.unverified')}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right pl-2">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">{t('wallet.balance')}</div>
              <div className="text-xs font-mono font-black text-white flex items-center justify-end gap-1">
                <TickerNumber value={formatSmartNumber(displayBalanceTokens)} />
                <span>TC</span>
              </div>
            </div>
          </div>

          {/* Inline Edit/Add Input Drawer */}
          {isEditingAddress ? (
            <div className="pt-2 border-t border-zinc-800/80 space-y-2 animate-in fade-in duration-200">
              <label className="text-[10px] text-zinc-400 font-bold uppercase block">
                {t('wallet.enterAddressPlaceholder')}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newAddressInput}
                  onChange={(e) => setNewAddressInput(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 bg-[#06080E] border border-zinc-700 focus:border-[#22C55E] text-white font-mono text-xs rounded-xl px-3 py-2 focus:outline-none placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={handleSavePayoutAddress}
                  disabled={isSavingAddress}
                  className="px-3 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-black font-extrabold text-xs rounded-xl flex items-center space-x-1 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isSavingAddress ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{t('common.save')}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingAddress(false);
                    setNewAddressInput('');
                  }}
                  className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : !savedAddress && !isLoadingAddress ? (
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
              <p className="text-[11px] text-amber-300/90 leading-tight">
                {t('wallet.enterAddressPlaceholder')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setNewAddressInput('');
                  setIsEditingAddress(true);
                }}
                className="px-3 py-1.5 bg-[#22C55E]/20 hover:bg-[#22C55E]/30 border border-[#22C55E]/50 text-[#4ADE80] font-bold text-xs rounded-xl flex items-center space-x-1 transition-all cursor-pointer shrink-0 ml-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('wallet.saveAddress')}</span>
              </button>
            </div>
          ) : savedAddress ? (
            <div className="pt-1.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
              <span>{t('wallet.recipientAddress')}</span>
              <button
                type="button"
                onClick={() => {
                  setNewAddressInput(savedAddress);
                  setIsEditingAddress(true);
                }}
                className="text-[#4ADE80] hover:underline font-bold cursor-pointer"
              >
                {t('wallet.editAddress')}
              </button>
            </div>
          ) : null}
        </div>

        {/* System Error / Success Alerts */}
        {submitSuccess && (
          <div className="bg-[#22C55E]/15 border border-[#22C55E]/40 rounded-2xl p-3 text-[#4ADE80] text-xs font-semibold flex items-start space-x-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
            <div className="leading-snug">{submitSuccess}</div>
          </div>
        )}

        {submitError && (
          <div className="bg-rose-500/15 border border-rose-500/40 rounded-2xl p-3 text-rose-300 text-xs font-semibold flex items-start space-x-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-snug">{submitError}</div>
          </div>
        )}

        {/* 3. CONVERSION CARDS WITH SWAP ICON OVERLAY */}
        <div className="relative space-y-2.5 pt-1">
          {/* TOP CARD: AMOUNT INPUT */}
          <div className="bg-[#121522] border border-[#22C55E]/30 focus-within:border-[#22C55E]/60 rounded-2xl p-4 flex items-center justify-between shadow-xl transition-all">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black tracking-wider text-white uppercase">
                {inputMode === 'TOKEN' ? t('wallet.amount') : `${t('wallet.amount')} (USD)`}
              </span>
              <button
                type="button"
                onClick={handleSetMax}
                className="bg-[#1C2234] hover:bg-[#22C55E]/20 text-zinc-300 hover:text-[#4ADE80] border border-zinc-700/60 hover:border-[#22C55E]/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md transition-all cursor-pointer uppercase tracking-wider"
              >
                {t('wallet.max')}
              </button>
            </div>

            <div className="flex-1 text-right pl-3">
              {inputMode === 'TOKEN' ? (
                <input
                  type="number"
                  step="any"
                  value={tokenAmount}
                  onChange={(e) => handleTokenChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-right text-lg sm:text-xl font-black font-mono text-white placeholder-zinc-600 focus:outline-none"
                />
              ) : (
                <input
                  type="number"
                  step="any"
                  value={usdAmount}
                  onChange={(e) => handleUsdChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-right text-lg sm:text-xl font-black font-mono text-white placeholder-zinc-600 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* OVERLAPPING SWAP BUTTON OVERLAY */}
          <div className="absolute right-6 top-[48px] z-20">
            <button
              type="button"
              onClick={handleSwapMode}
              title="Click to swap between TokenCare and USD"
              className="w-9 h-9 rounded-full bg-[#1C2234] hover:bg-[#273049] border border-[#22C55E]/50 text-[#4ADE80] flex items-center justify-center shadow-xl transition-transform active:scale-90 cursor-pointer"
            >
              <ArrowUpDown className="w-4 h-4 text-[#4ADE80]" />
            </button>
          </div>

          {/* BOTTOM CARD: EQUIVALENT VALUE */}
          <div className="bg-[#121522] border border-[#22C55E]/30 rounded-2xl p-4 flex items-center justify-between shadow-xl">
            <span className="text-xs font-bold text-zinc-400">
              {inputMode === 'TOKEN' ? t('wallet.amount') + ' (USD)' : t('wallet.amount') + ' (TC)'}
            </span>
            <div className="text-right text-base sm:text-lg font-mono font-black text-white">
              {inputMode === 'TOKEN'
                ? `${usdAmount || '0.00'}`
                : `${tokenAmount || '0.00'} TC`}
            </div>
          </div>
        </div>

        {/* 4. RATE BANNER */}
        <div className="bg-[#0D111A] border border-[#22C55E]/30 rounded-xl p-2 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
          <div className="flex items-center space-x-1.5">
            <Coins className="w-3 h-3 text-[#4ADE80] shrink-0" />
            <span>1 TC = $0.00015</span>
          </div>
          <div className="text-[#4ADE80] font-bold">
            {t('wallet.minWithdrawal')}: ${MIN_WITHDRAWAL_USD.toFixed(2)}
          </div>
        </div>

        {/* 5. VERIFICATION / SECURITY BADGE IN MAIN BACKGROUND */}
        <div className="pt-1 text-center flex items-center justify-center space-x-1 text-[10px] text-zinc-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E] inline shrink-0" />
          <span>Secured by TokenCare DB Payout System</span>
        </div>
      </div>

      {/* FIXED BOTTOM ACTION BUTTON */}
      <div className="shrink-0 w-full max-w-md mx-auto p-3 bg-[#090C12] border-t border-zinc-800/80 rounded-t-2xl">
        <button
          type="button"
          onClick={executeWithdrawal}
          disabled={isSubmitting}
          className="w-full h-11 bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] hover:from-[#16A34A] hover:to-[#4ADE80] text-black font-black text-xs tracking-wider uppercase rounded-xl flex items-center justify-center space-x-2 shadow-[0_4px_20px_rgba(34,197,94,0.5)] transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
              <span>{t('wallet.submitting')}</span>
            </>
          ) : (
            <>
              <span>{t('wallet.submitWithdrawal')}</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </>
          )}
        </button>
      </div>

    </div>
  );
};
