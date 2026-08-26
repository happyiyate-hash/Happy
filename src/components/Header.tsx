import React from 'react';
import { ShieldCheck, Coins, Wallet, Sparkles, ChevronDown, User, LogOut } from 'lucide-react';
import { UserRewardWallet, ChainId } from '../types';
import { SUPPORTED_CHAINS, REWARD_RATE_USD } from '../constants/chains';
import { SupabaseUserProfile } from '../lib/supabase';
import { TokenCareLogo } from './TokenCareLogo';
import { NotificationBell } from './NotificationBell';
import { useStatusBarColor } from '../lib/statusBar';
import { useTranslation } from '../utils/i18n';

interface HeaderProps {
  selectedChain: ChainId;
  onSelectChain: (chain: ChainId) => void;
  wallet: UserRewardWallet;
  onOpenRewardModal: () => void;
  onOpenWalletModal: () => void;
  currentUser?: any;
  userProfile?: SupabaseUserProfile | null;
  onSignOut?: () => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedChain,
  onSelectChain,
  wallet,
  onOpenRewardModal,
  onOpenWalletModal,
  currentUser,
  userProfile,
  onSignOut,
  unreadCount = 0,
  onOpenNotifications,
}) => {
  useStatusBarColor('#090C12');
  const { t } = useTranslation();
  const currentChain = SUPPORTED_CHAINS[selectedChain];

  return (
    <header className="sticky top-0 z-40 bg-[#090C12] backdrop-blur-xl border-b border-emerald-500/30 rounded-b-2xl h-14 flex items-center max-w-7xl mx-auto shadow-[0_4px_25px_rgba(0,0,0,0.7)]">
      <div className="px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
        {/* Brand Logo (~42px) */}
        <div className="flex items-center space-x-2.5">
          <TokenCareLogo size="sm" showText={true} />
          <span className="hidden lg:inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Secure Web3 Philanthropy
          </span>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* User Profile & Sign Out Button */}
          {currentUser && (
            <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-xl p-1 space-x-1">
              <div className="flex items-center space-x-2 px-2 py-0.5 text-xs text-zinc-300 font-medium">
                {userProfile?.avatar_url || currentUser.user_metadata?.avatar_url ? (
                  <img
                    src={userProfile?.avatar_url || currentUser.user_metadata?.avatar_url}
                    alt="Avatar"
                    className="w-5 h-5 rounded-full object-cover border border-emerald-500/30 shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {String(userProfile?.username || userProfile?.display_name || currentUser?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline font-semibold text-emerald-300 text-xs">
                  {userProfile?.username || userProfile?.display_name || currentUser?.user_metadata?.username || (currentUser?.email ? currentUser.email.split('@')[0] : 'Account')}
                </span>
              </div>
              <button
                onClick={onSignOut}
                className="p-1 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                title={t('nav.signOut')}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Chain Selector */}
          <div className="relative group">
            <select
              value={selectedChain}
              onChange={(e) => onSelectChain(e.target.value as ChainId)}
              className="appearance-none bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 text-xs font-medium pl-7 pr-6 py-1.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-emerald-500 cursor-pointer transition-colors"
            >
              {Object.values(SUPPORTED_CHAINS).map((chain) => (
                <option key={chain.id} value={chain.id} className="bg-zinc-900 text-zinc-200">
                  {chain.name}
                </option>
              ))}
            </select>
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none">
              {currentChain.icon}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Notification Bell */}
          {onOpenNotifications && (
            <NotificationBell
              unreadCount={unreadCount}
              onClick={onOpenNotifications}
            />
          )}

          {/* Wallet Button */}
          <button
            onClick={onOpenWalletModal}
            className="flex items-center space-x-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">
              {wallet?.isConnected && wallet?.walletAddress
                ? `${String(wallet.walletAddress).slice(0, 6)}...${String(wallet.walletAddress).slice(-4)}`
                : t('nav.connectWallet')}
            </span>
            <span className="md:hidden">{t('nav.wallet')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
