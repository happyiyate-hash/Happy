import React, { useState } from 'react';
import { Check, X, Lock, Sparkles, AlertTriangle, ShieldAlert } from 'lucide-react';
import { ERC20Metadata, ChainId, LogoStatus } from '../types';
import { LogoVerificationReport } from '../services/logoVerificationEngine';

interface DonationSettingsCardProps {
  metadata: ERC20Metadata;
  selectedChain: ChainId;
  logoReport?: LogoVerificationReport | null;
  logoStatus?: LogoStatus;
  trustScore?: number;
  isAlreadySaved?: boolean;
  onSaveToken: (settings: {
    acceptDonations: boolean;
    featured: boolean;
    minDonation: number;
    maxDonation: number;
    category: string;
    description: string;
  }) => void;
  onCancel: () => void;
  isSaving: boolean;
  isVerifying?: boolean;
  stage?: number;
}

export const DonationSettingsCard: React.FC<DonationSettingsCardProps> = ({
  metadata,
  logoReport,
  logoStatus = 'checking',
  trustScore = 84,
  isAlreadySaved = false,
  onSaveToken,
  onCancel,
  isSaving,
  isVerifying = false,
  stage = 4,
}) => {
  const [acceptDonations, setAcceptDonations] = useState(true);
  const [featured, setFeatured] = useState(true);
  const [minDonation, setMinDonation] = useState(1);
  const [category, setCategory] = useState('Ecosystem');
  const [customDescription, setCustomDescription] = useState(
    `${metadata.name} (${metadata.symbol}) verified token contract for community donations.`
  );

  // Evaluate Save Button Logic:
  // 1. Contract already saved
  // 2. Logo presence & browser rendering status (checking, valid, invalid)
  // 3. Security trust score
  let saveDisabledReason: string | null = null;
  if (isAlreadySaved) {
    saveDisabledReason = 'Token contract address is already saved in the directory.';
  } else if (!metadata.logoUrl || !metadata.logoUrl.trim()) {
    saveDisabledReason = 'Logo is required. Please upload or provide a valid token logo.';
  } else if (logoStatus === 'checking') {
    saveDisabledReason = 'Checking token logo...';
  } else if (logoStatus === 'invalid') {
    saveDisabledReason = 'Unable to load token logo. Please upload another logo or provide a valid image URL.';
  } else if (trustScore !== undefined && trustScore < 45) {
    saveDisabledReason = `Token trust score is too low (${trustScore}/100) to pass security review.`;
  }

  const isSaveDisabled = !!saveDisabledReason;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaveDisabled || isSaving) return;
    onSaveToken({
      acceptDonations,
      featured,
      minDonation,
      maxDonation: 100000,
      category,
      description: customDescription,
    });
  };

  const isDisabledCard = isVerifying || stage < 4;

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-[#0B0E17]/90 border border-zinc-800/90 rounded-lg p-2 space-y-2 shadow-md backdrop-blur-sm animate-in fade-in duration-300 text-white transition-all duration-300 ${
        isDisabledCard ? 'opacity-50 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
        <h3 className="text-[10px] font-black text-white uppercase tracking-wider">
          Donation Campaign Settings
        </h3>
        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-semibold">
          Ready to Publish
        </span>
      </div>

      {/* Form Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[9px]">
        {/* Accept Donations Toggle */}
        <div className="bg-[#06080F] border border-zinc-800/80 p-1.5 rounded-md flex items-center justify-between">
          <div>
            <div className="font-bold text-white text-[9.5px]">Accept Donations</div>
            <div className="text-[8px] text-zinc-400">Enable Web3 collection</div>
          </div>
          <button
            type="button"
            onClick={() => setAcceptDonations(!acceptDonations)}
            className={`w-7 h-3.5 rounded-full transition-colors p-0.5 flex items-center cursor-pointer shrink-0 ${
              acceptDonations ? 'bg-emerald-500 justify-end' : 'bg-zinc-800 justify-start'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
          </button>
        </div>

        {/* Min Donation */}
        <div className="bg-[#06080F] border border-zinc-800/80 p-1.5 rounded-md space-y-0.5">
          <label className="text-[8px] font-semibold text-zinc-400 uppercase block">
            Min Donation ({metadata.symbol})
          </label>
          <input
            type="number"
            min="0.0001"
            step="any"
            value={minDonation}
            onChange={(e) => setMinDonation(parseFloat(e.target.value) || 0)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white font-mono text-[9.5px] rounded px-1.5 py-0.5 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category */}
        <div className="bg-[#06080F] border border-zinc-800/80 p-1.5 rounded-md space-y-0.5">
          <label className="text-[8px] font-semibold text-zinc-400 uppercase block">
            Token Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white text-[9.5px] rounded px-1.5 py-0.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="Ecosystem">Ecosystem & Layer 2</option>
            <option value="DeFi">DeFi & Liquidity</option>
            <option value="Social Impact">Social Impact</option>
            <option value="Infrastructure">Infrastructure</option>
            <option value="Community">Community & Memes</option>
          </select>
        </div>
      </div>

      {/* Validation Warning Banner if Save is Disabled */}
      {isSaveDisabled && (
        <div className="bg-rose-950/40 border border-rose-500/30 rounded-md p-1.5 flex items-center space-x-1.5 text-[8.5px] text-rose-300">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="font-semibold leading-tight">{saveDisabledReason}</span>
        </div>
      )}

      {/* Action Bar */}
      <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between gap-1">
        <div className="flex items-center space-x-1 text-[8.5px] text-zinc-400 min-w-0">
          <Lock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
          <span className="truncate">Verification & logo check required.</span>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold rounded text-[9px] flex items-center space-x-0.5 cursor-pointer transition-colors"
          >
            <X className="w-2.5 h-2.5" />
            <span>Cancel</span>
          </button>

          {isAlreadySaved ? (
            <button
              type="button"
              disabled
              className="px-2.5 py-0.5 font-bold rounded text-[9px] flex items-center space-x-1 bg-zinc-800/90 text-emerald-400 border border-emerald-500/30 cursor-default shadow-none"
              title="This token contract is already saved in directory"
            >
              <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
              <span>Saved</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSaveDisabled || isSaving}
              className={`px-2.5 py-0.5 font-bold rounded text-[9px] flex items-center space-x-1 shadow-sm transition-all ${
                isSaveDisabled
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed opacity-70'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer'
              }`}
              title={isSaveDisabled ? saveDisabledReason || 'Save disabled' : 'Save token to directory'}
            >
              {isSaving ? (
                <>
                  <div className="w-2.5 h-2.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                  <span>Save Token</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
};
