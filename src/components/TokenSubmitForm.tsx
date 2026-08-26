import React, { useState } from 'react';
import { Search, Clipboard, Loader2, Sparkles, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import { ChainId } from '../types';
import { SUPPORTED_CHAINS, SAMPLE_TOKENS, REWARD_RATE_USD, REWARD_PER_SUBMISSION, isEvmChain, validateTokenIdentifier } from '../constants/chains';
import { useTranslation } from '../utils/i18n';

interface TokenSubmitFormProps {
  selectedChain: ChainId;
  onSelectChain: (chain: ChainId) => void;
  onSubmitToken: (address: string, chainId: ChainId) => Promise<void>;
  isLoading: boolean;
}

export const TokenSubmitForm: React.FC<TokenSubmitFormProps> = ({
  selectedChain,
  onSelectChain,
  onSubmitToken,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [address, setAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setAddress(text.trim());
        setErrorMsg('');
      }
    } catch {
      setErrorMsg('Clipboard permission denied. Please paste manually.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const clean = address.trim();

    if (!clean) {
      setErrorMsg('Please enter a valid token contract address.');
      return;
    }

    const validation = validateTokenIdentifier(selectedChain, clean);
    if (!validation.isValid) {
      setErrorMsg(validation.error || 'Invalid contract address format.');
      return;
    }

    try {
      await onSubmitToken(clean, selectedChain);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit and inspect token.');
    }
  };

  const handleSelectSample = (sample: (typeof SAMPLE_TOKENS)[0]) => {
    onSelectChain(sample.chainId);
    setAddress(sample.address);
    setErrorMsg('');
    onSubmitToken(sample.address, sample.chainId);
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
      {/* Title & Reward Promo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            {t('submit.title')}
            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-3 h-3 mr-1" /> {t('submit.earnReward')}
            </span>
          </h2>
          <p className="text-xs text-zinc-300 mt-1">
            {t('submit.subtitle')}
          </p>
        </div>

        {/* Reward Metric Box */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 flex items-center space-x-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 text-lg font-bold">
            💰
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">{t('submit.submissionBounty')}</div>
            <div className="text-sm font-bold text-zinc-200">
              {t('submit.rewardTokens', { amount: REWARD_PER_SUBMISSION })}{' '}
              <span className="text-emerald-400 text-xs font-normal font-mono">
                (= ${ (REWARD_PER_SUBMISSION * REWARD_RATE_USD).toFixed(3) })
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Chain Dropdown inside input group */}
          <div className="w-full sm:w-48 shrink-0">
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">{t('submit.networkChain')}</label>
            <select
              value={selectedChain}
              onChange={(e) => onSelectChain(e.target.value as ChainId)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-xl px-3.5 py-3 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
            >
              {Object.values(SUPPORTED_CHAINS).map((chain) => (
                <option key={chain.id} value={chain.id} className="bg-zinc-900 text-zinc-100">
                  {chain.icon} {chain.name}
                </option>
              ))}
            </select>
          </div>

          {/* Address Input */}
          <div className="flex-1">
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">{t('submit.contractAddress')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setErrorMsg('');
                }}
                placeholder={t('submit.placeholder')}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm font-mono rounded-xl pl-10 pr-24 py-3 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={handlePaste}
                className="absolute inset-y-1.5 right-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('common.paste')}</span>
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center space-x-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-zinc-400 hidden md:block">
            ⚡ Direct Ethers.js RPC read + DexScreener & CoinGecko verification
          </div>
          <button
            type="submit"
            disabled={isLoading || !address.trim()}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('submit.verifying')}</span>
              </>
            ) : (
              <>
                <span>{t('submit.verifyButton')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Test Samples */}
      <div className="mt-6 pt-5 border-t border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            {t('submit.quickTestSamples')}:
          </span>
          <span className="text-[11px] text-zinc-500">{t('tokens.subtitle')}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_TOKENS.map((sample) => (
            <button
              key={sample.address}
              onClick={() => handleSelectSample(sample)}
              disabled={isLoading}
              className="group bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 hover:border-blue-500/50 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white flex items-center space-x-2 transition-all cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:scale-125 transition-transform" />
              <span className="font-bold text-zinc-100">{sample.symbol}</span>
              <span className="text-zinc-500 font-mono text-[11px] hidden sm:inline">
                ({sample.address.slice(0, 4)}...{sample.address.slice(-4)})
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
