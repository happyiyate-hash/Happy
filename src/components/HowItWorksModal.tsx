import React from 'react';
import { X, CheckCircle2, Shield, Search, Heart, Coins } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0B0E17] border border-zinc-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">How TokenCare Works</h2>
              <p className="text-xs text-zinc-400">Web3 Token Verification & Donation Workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-4 text-xs">
          <div className="flex items-start space-x-3 bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              1
            </div>
            <div>
              <div className="font-bold text-white text-sm">Enter Contract Address</div>
              <div className="text-zinc-400 mt-0.5">
                Paste any valid ERC-20 smart contract address on Polygon or select from popular tokens like USDC or WMATIC.
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              2
            </div>
            <div>
              <div className="font-bold text-white text-sm">Automated RPC Security Scan</div>
              <div className="text-zinc-400 mt-0.5">
                Our engine fetches real-time token supply, price metrics from DEX liquidity pools, honeypot analysis, and tax rates.
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              3
            </div>
            <div>
              <div className="font-bold text-white text-sm">Review & Earn REWARD Tokens</div>
              <div className="text-zinc-400 mt-0.5">
                Every verified submission awards 10 REWARD tokens ($0.01 USD value backed at 0.1 cent per token) straight into your wallet.
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              4
            </div>
            <div>
              <div className="font-bold text-white text-sm">Save for Community Donations</div>
              <div className="text-zinc-400 mt-0.5">
                Publish the token to the public directory for instant cross-chain donations with zero platform fees.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            Got it, Let's Add a Token
          </button>
        </div>
      </div>
    </div>
  );
};
