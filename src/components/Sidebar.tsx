import React, { useState } from 'react';
import {
  PlusCircle,
  LayoutDashboard,
  Compass,
  Settings,
  HelpCircle,
  Coins,
  ShieldCheck,
  Zap,
  Check,
  ChevronRight,
  Sparkles,
  Wallet,
  Globe,
  Lock,
  ExternalLink,
  ArrowUpRight,
  Bell,
  Terminal,
  Code2,
} from 'lucide-react';

import { ChainId, UserRewardWallet } from '../types';
import { SUPPORTED_CHAINS, RAW_EVM_CHAINS, getChainInfo, normalizeChainKey } from '../constants/chains';
import { ChainSelectorModal, EVM_CHAIN_LOGOS } from './ChainSelectorModal';
import { TokenCareLogo } from './TokenCareLogo';
import { useTranslation } from '../utils/i18n';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  selectedChain: ChainId;
  onSelectChain: (chainId: ChainId) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  wallet: UserRewardWallet;
  onOpenWalletModal: () => void;
  onOpenRewardModal: () => void;
  onOpenApiConsole?: () => void;
  unreadCount?: number;
  sessionStatus?: string;
  isOnline?: boolean;
  isSyncing?: boolean;
  lastSyncTimestamp?: number | null;
  onManualSync?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  selectedChain,
  onSelectChain,
  isOpen,
  onCloseMobile,
  isCollapsed,
  wallet,
  onOpenWalletModal,
  onOpenRewardModal,
  onOpenApiConsole,
  unreadCount = 0,
}) => {
  const { t } = useTranslation();
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);

  const currentChainInfo = getChainInfo(selectedChain);
  const normalizedKey = normalizeChainKey(selectedChain);
  const currentLogoUrl = EVM_CHAIN_LOGOS[normalizedKey];

  const navItems = [
    {
      id: 'add-token',
      label: t('nav.addToken'),
      icon: PlusCircle,
      description: t('sidebar.addTokenDesc'),
    },
    {
      id: 'directory',
      label: t('nav.explore'),
      icon: Compass,
      description: t('sidebar.exploreDesc'),
    },
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      icon: LayoutDashboard,
      description: t('sidebar.dashboardDesc'),
    },
    {
      id: 'developer',
      label: 'Developer API',
      icon: Code2,
      description: 'Manage projects, API keys, RPC endpoints & quotas',
    },
    {
      id: 'payouts',
      label: t('nav.payouts'),
      icon: ArrowUpRight,
      description: t('sidebar.payoutsDesc'),
    },
    {
      id: 'notifications',
      label: t('nav.notifications'),
      icon: Bell,
      description: t('sidebar.notificationsDesc'),
    },
    {
      id: 'mfa',
      label: t('nav.mfa'),
      icon: ShieldCheck,
      description: t('sidebar.mfaDesc'),
    },
    {
      id: 'settings',
      label: t('nav.apiSettings'),
      icon: Settings,
      description: t('sidebar.settingsDesc'),
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#0B0E17] border-r border-zinc-800/90 flex flex-col justify-between transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Header & Brand */}
        <div>
          <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <TokenCareLogo size="md" showText={!isCollapsed} />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'api-console' && onOpenApiConsole) {
                      onOpenApiConsole();
                    } else {
                      onSelectTab(item.id);
                    }
                    onCloseMobile();
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center space-x-3 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 shadow-md shadow-emerald-500/10'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80 border border-transparent'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                    {isCollapsed && item.id === 'notifications' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#22C55E] text-black font-extrabold text-[9px] min-w-[14px] h-[14px] px-0.5 flex items-center justify-center rounded-full font-mono shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate flex items-center justify-between">
                        <span>{item.label}</span>
                        {item.id === 'notifications' && unreadCount > 0 && (
                          <span className="bg-[#22C55E] text-black font-extrabold text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full font-mono shadow-sm shrink-0">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate">{item.description}</div>
                    </div>
                  )}

                  {!isCollapsed && isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Network Selector & Connected Wallet */}
        <div className="p-3 border-t border-zinc-800/80 space-y-2 bg-[#06080F]/60">
          {/* EVM Chain Selector Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsChainModalOpen(true)}
              className="w-full text-left p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between cursor-pointer group"
              title={isCollapsed ? currentChainInfo.name : undefined}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 p-0.5 flex items-center justify-center shrink-0">
                  {currentLogoUrl ? (
                    <img
                      src={currentLogoUrl}
                      alt={currentChainInfo.name}
                      className="w-full h-full object-contain rounded-sm"
                    />
                  ) : (
                    <span className="text-xs">{currentChainInfo.icon}</span>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                      {currentChainInfo.name}
                    </div>
                    <div className="text-[9px] text-zinc-400 font-mono">{t('sidebar.networks')}</div>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                  EVM
                </span>
              )}
            </button>
          </div>

          {/* User Wallet Pill */}
          {!isCollapsed && (
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400 font-semibold flex items-center space-x-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('nav.wallet')}</span>
                </span>
                <button
                  type="button"
                  onClick={onOpenWalletModal}
                  className="text-emerald-400 hover:underline font-mono text-[10px] font-bold cursor-pointer"
                >
                  {wallet?.isConnected ? t('common.change') : t('common.connect')}
                </button>
              </div>

              <div className="font-mono text-xs font-bold text-white truncate bg-black/40 px-2 py-1 rounded-md border border-zinc-800/50">
                {wallet?.walletAddress || '0xNotConnected'}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50">
                <button
                  onClick={onOpenRewardModal}
                  className="text-[10px] text-amber-300 font-mono font-bold flex items-center space-x-1 hover:text-amber-200 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{wallet?.unclaimedTokens ?? 0} REWARD</span>
                </button>

                <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                  ${((wallet?.unclaimedTokens ?? 0) * 0.001).toFixed(3)}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Bottom Sheet Chain Selector Modal */}
      <ChainSelectorModal
        isOpen={isChainModalOpen}
        onClose={() => setIsChainModalOpen(false)}
        selectedChain={selectedChain}
        onSelectChain={onSelectChain}
        apiKeys={{ infuraKey: '', alchemyKey: '' }}
      />
    </>
  );
};
