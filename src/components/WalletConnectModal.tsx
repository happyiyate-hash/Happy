import React, { useState } from 'react';
import { X, Wallet, Check, ShieldCheck, ExternalLink } from 'lucide-react';
import { UserRewardWallet } from '../types';
import { saveRewardWallet } from '../services/storage';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: UserRewardWallet;
  onUpdateWallet: (updated: UserRewardWallet) => void;
  userId?: string;
}

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
  isOpen,
  onClose,
  wallet,
  onUpdateWallet,
  userId,
}) => {
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);

  if (!isOpen) return null;

  const WALLETS = [
    { name: 'MetaMask', icon: '🦊', desc: 'Connect with browser extension or mobile app' },
    { name: 'WalletConnect', icon: '🌐', desc: 'Scan QR code with your mobile wallet' },
    { name: 'Coinbase Wallet', icon: '🔵', desc: 'Connect using Coinbase Wallet self-custody' },
    { name: 'Rainbow', icon: '🌈', desc: 'Ethereum & EVM multi-chain wallet' },
  ];

  const handleConnect = (walletName: string) => {
    setConnectingProvider(walletName);
    setTimeout(() => {
      const mockAddress = `0x${Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;

      const updated: UserRewardWallet = {
        ...wallet,
        isConnected: true,
        walletAddress: mockAddress,
      };

      saveRewardWallet(updated, userId);
      onUpdateWallet(updated);
      setConnectingProvider(null);
      onClose();
    }, 800);
  };

  const handleDisconnect = () => {
    const updated: UserRewardWallet = {
      ...wallet,
      isConnected: false,
    };
    saveRewardWallet(updated, userId);
    onUpdateWallet(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <Wallet className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-zinc-100">
              {wallet.isConnected ? 'Connected Web3 Wallet' : 'Connect Web3 Wallet'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {wallet.isConnected && wallet.walletAddress ? (
          <div className="space-y-4">
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <div className="text-xs text-zinc-400">Active Address</div>
              <div className="font-mono text-sm font-bold text-blue-400 break-all">
                {wallet.walletAddress}
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-emerald-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Connected & Ready to Receive Rewards</span>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Disconnect Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">
              Select a wallet provider to claim your token submission rewards.
            </p>
            {WALLETS.map((w) => (
              <button
                key={w.name}
                onClick={() => handleConnect(w.name)}
                disabled={connectingProvider !== null}
                className="w-full bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 hover:border-blue-500/40 p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer group text-left"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{w.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-zinc-200 group-hover:text-blue-400 transition-colors">
                      {w.name}
                    </div>
                    <div className="text-xs text-zinc-400">{w.desc}</div>
                  </div>
                </div>
                {connectingProvider === w.name && (
                  <span className="text-xs text-blue-400 font-mono animate-pulse">
                    Connecting...
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
