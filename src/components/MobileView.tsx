import React, { useState, useEffect, useMemo } from 'react';
import { MobileDonateView } from './MobileDonateView';
import { ExploreView } from './ExploreView';
import {
  Home,
  Compass,
  ReceiptText,
  Send,
  Box,
  User,
  Settings,
  Eye,
  EyeOff,
  Bell,
  HelpCircle,
  QrCode,
  Hexagon,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  Shield,
  Star,
  ArrowDown,
  ArrowUp,
  Sparkles,
  Zap,
  Search,
  ArrowUpRight,
  Coins,
} from 'lucide-react';
import { ChainId, SubmittedToken, UserRewardWallet, LogoStatus } from '../types';
import { ApiKeyConfig } from '../services/apiKeys';
import { SupabaseUserProfile, fetchWithdrawalRequests, WithdrawalRequest } from '../lib/supabase';
import { REWARD_RATE_USD, getChainInfo } from '../constants/chains';
import { ContractAddressSection } from './ContractAddressSection';
import { TokenInformationCard } from './TokenInformationCard';
import { LogoVerificationCard } from './LogoVerificationCard';
import { DonationSettingsCard } from './DonationSettingsCard';
import { DashboardOverview } from './DashboardOverview';
import { WithdrawalView } from './WithdrawalView';
import { SettingsView } from './SettingsView';
import { MyTokensView } from './MyTokensView';
import { HelpCenterView } from './HelpCenterView';
import { ContactSupportView } from './ContactSupportView';
import { SupportLiveChatView } from './SupportLiveChatView';
import { TermsAndPrivacyView } from './TermsAndPrivacyView';
import DeveloperView from '../views/DeveloperView';
import { LogoVerificationReport } from '../services/logoVerificationEngine';
import { MfaManagementView } from './MfaManagementView';
import { TokenCareLogo } from './TokenCareLogo';
import { NotificationBell } from './NotificationBell';
import { CompactBalanceCard } from './CompactBalanceCard';
import { PromoCarousel } from './PromoCarousel';

import { NotificationCenterView } from './NotificationCenterView';
import { TickerNumber } from './TickerNumber';
import { formatSmartCurrency, formatSmartNumber } from '../utils/numberFormatting';

import { useStatusBarColor } from '../lib/statusBar';
import { useTranslation } from '../context/I18nContext';

interface MobileViewProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedChain: ChainId;
  setSelectedChain: (chain: ChainId) => void;
  tokens: SubmittedToken[];
  wallet: UserRewardWallet;
  setWallet?: React.Dispatch<React.SetStateAction<UserRewardWallet>>;
  apiKeys: ApiKeyConfig;
  setApiKeys: React.Dispatch<React.SetStateAction<ApiKeyConfig>>;
  currentUser: any;
  userProfile: SupabaseUserProfile | null;
  handleSignOut: () => Promise<void>;
  addressInput: string;
  setAddressInput: (val: string) => void;
  isLoading: boolean;
  errorMessage: string | null;
  autoSwitchNotice: string | null;
  fetchedToken: SubmittedToken | null;
  setFetchedToken: React.Dispatch<React.SetStateAction<SubmittedToken | null>>;
  logoReport: LogoVerificationReport | null;
  logoStatus?: LogoStatus;
  setLogoStatus?: (status: LogoStatus) => void;
  isSavingToken: boolean;
  saveSuccessMessage: string | null;
  handleFetchToken: (targetAddress?: string) => Promise<void>;
  handleSaveToken: () => Promise<void>;
  handleResetForm: () => void;
  onOpenHowItWorks: () => void;
  onOpenRewardModal: () => void;
  onOpenWalletModal: () => void;
  onSwitchToDesktop: () => void;
  unreadCount?: number;
  onUnreadCountChange?: (count: number) => void;
  isVerifying?: boolean;
  verificationStage?: number;
  onOpenApiConsole?: () => void;
}

export const MobileView: React.FC<MobileViewProps> = ({
  activeTab,
  setActiveTab,
  selectedChain,
  setSelectedChain,
  tokens,
  wallet,
  setWallet,
  apiKeys,
  setApiKeys,
  currentUser,
  userProfile,
  handleSignOut,
  addressInput,
  setAddressInput,
  isLoading,
  errorMessage,
  autoSwitchNotice,
  fetchedToken,
  setFetchedToken,
  logoReport,
  logoStatus,
  setLogoStatus,
  isSavingToken,
  saveSuccessMessage,
  handleFetchToken,
  handleSaveToken,
  handleResetForm,
  onOpenHowItWorks,
  onOpenRewardModal,
  onOpenWalletModal,
  onSwitchToDesktop,
  unreadCount = 0,
  onUnreadCountChange,
  isVerifying = false,
  verificationStage = 4,
  onOpenApiConsole,
}) => {
  const { t } = useTranslation();
  // Set mobile top status bar color to match top header background (#090C13)
  useStatusBarColor('#090C13');

  // Mobile navigation tabs: 'overview', 'explore', 'donate', 'tokens', 'profile', 'withdrawals', 'notifications', 'mfa', 'help-center', 'contact-support', 'terms-privacy', 'privacy-policy', 'preferences', 'developer', 'api-console'
  const [mobileTab, setMobileTab] = useState<
    'overview' | 'explore' | 'donate' | 'tokens' | 'profile' | 'withdrawals' | 'notifications' | 'mfa' | 'help-center' | 'contact-support' | 'support-chat' | 'live-chat' | 'terms-privacy' | 'privacy-policy' | 'preferences' | 'developer' | 'api-console'
  >('overview');
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [dbWithdrawals, setDbWithdrawals] = useState<WithdrawalRequest[]>([]);

  // Sync mobile tab selection
  const handleTabChange = (
    tab: 'overview' | 'explore' | 'donate' | 'tokens' | 'profile' | 'withdrawals' | 'notifications' | 'mfa' | 'help-center' | 'contact-support' | 'support-chat' | 'live-chat' | 'terms-privacy' | 'privacy-policy' | 'preferences' | 'developer' | 'api-console'
  ) => {
    if (tab === 'developer' || tab === 'api-console') {
      setMobileTab('developer');
      setActiveTab('api-console');
      return;
    }
    setMobileTab(tab);
    if (tab === 'overview') setActiveTab('dashboard');
    else if (tab === 'donate') setActiveTab('add-token');
    else if (tab === 'tokens') setActiveTab('dashboard');
    else if (tab === 'explore') setActiveTab('directory');
    else if (tab === 'withdrawals') setActiveTab('payouts');
    else if (tab === 'profile') setActiveTab('settings');
    else if (tab === 'mfa') setActiveTab('mfa');
    else if (tab === 'notifications') setActiveTab('notifications');
    else if (tab === 'help-center') setActiveTab('help-center');
    else if (tab === 'contact-support') setActiveTab('contact-support');
    else if (tab === 'terms-privacy' || tab === 'privacy-policy') setActiveTab('terms-privacy');
    else if (tab === 'preferences') setActiveTab('preferences');
  };

  // Sync from parent activeTab if changed externally
  useEffect(() => {
    if (activeTab === 'add-token' && mobileTab !== 'donate') setMobileTab('donate');
    else if (activeTab === 'directory' && mobileTab !== 'explore') setMobileTab('explore');
    else if (activeTab === 'payouts' && mobileTab !== 'withdrawals') setMobileTab('withdrawals');
    else if (activeTab === 'settings' && mobileTab !== 'profile') setMobileTab('profile');
    else if (activeTab === 'mfa' && mobileTab !== 'mfa') setMobileTab('mfa');
    else if (activeTab === 'notifications' && mobileTab !== 'notifications') setMobileTab('notifications');
    else if (activeTab === 'help-center' && mobileTab !== 'help-center') setMobileTab('help-center');
    else if (activeTab === 'contact-support' && mobileTab !== 'contact-support') setMobileTab('contact-support');
    else if ((activeTab === 'terms-privacy' || activeTab === 'privacy-policy') && mobileTab !== 'terms-privacy') setMobileTab('terms-privacy');
    else if (activeTab === 'preferences' && mobileTab !== 'preferences') setMobileTab('preferences');
    else if ((activeTab === 'api-console' || activeTab === 'developer') && mobileTab !== 'developer') setMobileTab('developer');
    else if (activeTab === 'dashboard' && mobileTab !== 'overview' && mobileTab !== 'tokens') {
      setMobileTab('overview');
    }
  }, [activeTab]);

  // Fetch real database withdrawal activities
  useEffect(() => {
    const loadWithdrawalHistory = async () => {
      try {
        const userId = currentUser?.id || 'demo-user';
        const requests = await fetchWithdrawalRequests(userId);
        setDbWithdrawals(requests);
      } catch (err) {
        console.warn('Failed to load withdrawal history for mobile view:', err);
      }
    };
    loadWithdrawalHistory();
  }, [currentUser, tokens]);

  // Calculated real metrics from actual submitted tokens and wallet
  const rewardTokens = wallet?.unclaimedTokens ?? (userProfile?.unclaimed_reward_balance ?? 0);
  const rewardUsd = (rewardTokens * REWARD_RATE_USD).toFixed(3);
  const totalVerifiedCount = tokens.length;
  const safeTokensCount = tokens.filter((t) => t.safety?.rating === 'SAFE' || t.verificationReport?.status === 'APPROVED').length;
  const passRate = tokens.length > 0 ? Math.round((safeTokensCount / tokens.length) * 100) : 0;
  const totalLiquidity = tokens.reduce((acc, t) => acc + (t.marketData?.liquidityUsd || 0), 0);

  // Helper to format relative time ago
  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Dynamic Recent Activity list combining database withdrawals and submitted tokens
  const realActivities = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      amount: string;
      amountColor: string;
      timeAgo: string;
      rawDate: number;
      iconType: 'withdrawal' | 'donation' | 'security' | 'verified';
    }> = [];

    // 1. Add real database withdrawal requests
    dbWithdrawals.forEach((w) => {
      const isCompleted = w.status === 'COMPLETED';
      const isFailed = w.status === 'FAILED';
      const title = isCompleted
        ? 'Withdrawal Approved'
        : isFailed
        ? 'Withdrawal Failed'
        : 'Withdrawal Pending';

      items.push({
        id: `wtx-${w.id}`,
        title,
        subtitle: w.wallet_address ? `${String(w.wallet_address).slice(0, 6)}...${String(w.wallet_address).slice(-4)}` : 'EVM Wallet',
        amount: `-${w.amount_usd ? w.amount_usd.toFixed(2) : (w.amount_tokens * 0.001).toFixed(2)} USDT`,
        amountColor: isFailed ? 'text-rose-400 font-mono' : 'text-white font-mono',
        timeAgo: formatTimeAgo(w.created_at),
        rawDate: new Date(w.created_at).getTime(),
        iconType: 'withdrawal',
      });
    });

    // 2. Add real tokens saved in the database
    tokens.forEach((t) => {
      const tokenName = t.metadata?.name || 'Submitted Token';
      const symbol = t.metadata?.symbol || 'ERC20';

      items.push({
        id: `token-${t.id || t.address}`,
        title: 'Donation Token Verified',
        subtitle: `${tokenName} (${symbol})`,
        amount: `+${((t.rewardEarnedTokens || 15) * 10).toFixed(2)} USDT`,
        amountColor: 'text-emerald-400 font-mono',
        timeAgo: formatTimeAgo(t.submittedAt),
        rawDate: new Date(t.submittedAt || Date.now()).getTime(),
        iconType: 'donation',
      });

      if (t.safety) {
        items.push({
          id: `sec-${t.id || t.address}`,
          title: 'Security Check Passed',
          subtitle: `${tokenName} contract audit`,
          amount: `${t.safety.score || 100}%`,
          amountColor: 'text-blue-400 font-mono',
          timeAgo: formatTimeAgo(t.submittedAt),
          rawDate: new Date(t.submittedAt || Date.now()).getTime() - 1000,
          iconType: 'security',
        });
      }
    });

    // Sort descending by most recent
    items.sort((a, b) => b.rawDate - a.rawDate);

    return items;
  }, [dbWithdrawals, tokens]);

  return (
    <div className="h-screen w-full bg-[#06080E] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black relative overflow-hidden">
      {/* Fixed Curved/Rounded Top Navigation Container - Identical to Settings, Notifications & Other Views */}
      {mobileTab !== 'withdrawals' &&
        mobileTab !== 'notifications' &&
        mobileTab !== 'donate' &&
        mobileTab !== 'tokens' &&
        mobileTab !== 'profile' &&
        mobileTab !== 'mfa' &&
        mobileTab !== 'explore' &&
        mobileTab !== 'help-center' &&
        mobileTab !== 'contact-support' &&
        mobileTab !== 'support-chat' &&
        mobileTab !== 'live-chat' &&
        mobileTab !== 'terms-privacy' &&
        mobileTab !== 'privacy-policy' &&
        mobileTab !== 'preferences' &&
        mobileTab !== 'developer' &&
        mobileTab !== 'api-console' && (
          <header className="shrink-0 z-40 bg-[#090C12] backdrop-blur-xl border-b border-emerald-500/30 rounded-b-2xl p-2.5 pt-safe-nav shadow-[0_4px_25px_rgba(0,0,0,0.7)] max-w-md mx-auto w-full transition-all flex items-center justify-between">
            {/* Left: TokenCare Logo (~42px) */}
            <div className="flex items-center space-x-2">
              <TokenCareLogo size="sm" showText={true} />
            </div>

            {/* Right: White Notification Bell with static badge & controlled tilt animation */}
            <NotificationBell
              unreadCount={unreadCount}
              onClick={() => handleTabChange('notifications' as any)}
            />
          </header>
        )}

      {/* Main Screen Container - Architectural Scroll Isolation */}
      <main className="flex-1 min-h-0 w-full max-w-md mx-auto overflow-hidden flex flex-col">
        {/* OVERVIEW TAB */}
        {mobileTab === 'overview' && (
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2.5 pb-24 animate-in fade-in duration-200">
            {/* 1. Compact Balance Card */}
            <CompactBalanceCard
              wallet={wallet}
              onOpenRewardModal={onOpenRewardModal}
              onOpenWithdraw={() => handleTabChange('withdrawals')}
            />

            {/* 2. Dynamic Promotion / Advertising Carousel (Replaces giant static security card) */}
            <PromoCarousel
              tokens={tokens}
              onNavigateAddToken={() => handleTabChange('donate')}
              onSelectToken={() => handleTabChange('tokens')}
            />

            {/* 3. Platform Statistics with Clean Hierarchy & Dynamic Formatting */}
            <div className="grid grid-cols-2 gap-2">
              {/* REWARD BALANCE */}
              <div className="bg-[#0C0E17]/90 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col justify-between space-y-1">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
                  {t('overview.rewardBalance', 'REWARD BALANCE')}
                </span>
                <div>
                  <div className="text-base font-extrabold text-amber-400 font-mono flex items-center gap-1">
                    <TickerNumber value={formatSmartNumber(rewardTokens)} />
                    <span className="text-xs font-bold">REWARD</span>
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono flex items-center gap-0.5">
                    <span>≈</span>
                    <TickerNumber value={formatSmartCurrency(rewardTokens * REWARD_RATE_USD, { minDecimals: 3 })} />
                    <span>USD</span>
                  </div>
                </div>
              </div>

              {/* VERIFIED TOKENS */}
              <div className="bg-[#0C0E17]/90 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col justify-between space-y-1">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
                  {t('overview.verifiedTokens', 'VERIFIED TOKENS')}
                </span>
                <div>
                  <div className="text-base font-extrabold text-white font-mono flex items-center gap-1">
                    <TickerNumber value={formatSmartNumber(totalVerifiedCount)} />
                    <span className="text-xs font-bold">{t('common.verified', 'VERIFIED')}</span>
                  </div>
                  <div className="text-[9px] text-emerald-400">{t('overview.onChainVerified', '100% On-Chain')}</div>
                </div>
              </div>

              {/* TOTAL LIQUIDITY */}
              <div className="bg-[#0C0E17]/90 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col justify-between space-y-1">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
                  {t('overview.totalLiquidity', 'TOTAL LIQUIDITY')}
                </span>
                <div>
                  <div className="text-base font-extrabold text-white font-mono flex items-center">
                    <TickerNumber value={formatSmartCurrency(totalLiquidity)} />
                  </div>
                  <div className="text-[9px] text-zinc-400">{t('overview.acrossActivePools', 'Across active pools')}</div>
                </div>
              </div>

              {/* PASS RATE */}
              <div className="bg-[#0C0E17]/90 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col justify-between space-y-1">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
                  {t('overview.passRate', 'PASS RATE')}
                </span>
                <div>
                  <div className="text-base font-extrabold text-emerald-400 font-mono flex items-center">
                    <TickerNumber value={formatSmartNumber(passRate)} suffix="%" />
                    <span className="text-xs font-bold ml-1">{t('overview.pass', 'PASS')}</span>
                  </div>
                  <div className="text-[9px] text-zinc-400">
                    {t('overview.allPassedDesc', { safe: safeTokensCount, total: totalVerifiedCount })}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Saved & Verified Tokens Directory */}
            <div className="bg-[#0C0E17]/90 border border-zinc-800/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-[11px] font-bold text-white tracking-wide">{t('overview.savedAndVerified', 'Saved & Verified Tokens')}</h3>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <button
                  onClick={() => handleTabChange('tokens')}
                  className="text-[10px] font-semibold text-emerald-400 hover:underline cursor-pointer"
                >
                  {t('overview.viewDirectory', 'View Directory')}
                </button>
              </div>

              {/* Saved Tokens List */}
              <div className="space-y-1.5">
                {tokens.length === 0 ? (
                  <div className="py-4 text-center text-xs text-zinc-500 font-medium">
                    {t('overview.noTokensSaved', 'No tokens saved yet. Submit a token address to verify.')}
                  </div>
                ) : (
                  tokens.slice(0, 4).map((token) => (
                    <div
                      key={token.id || token.address}
                      onClick={() => handleTabChange('tokens')}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#06080E] border border-zinc-800/60 hover:border-emerald-500/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-2.5">
                        {token.metadata?.logoUrl ? (
                          <img
                            src={token.metadata.logoUrl}
                            alt={token.metadata?.symbol || 'Token'}
                            className="w-7 h-7 rounded-lg object-cover shrink-0 border border-emerald-500/30"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {String(token.metadata?.symbol || 'TC').slice(0, 3)}
                          </div>
                        )}
                        <div>
                          <div className="text-[11px] font-bold text-white leading-tight">
                            {token.metadata?.name || 'Verified Token'}
                          </div>
                          <div className="text-[9px] text-zinc-400 font-mono">
                            ${token.metadata?.symbol} • {token.metadata?.blockchainName || (token.metadata as any)?.blockchain_name || token.metadata?.chainName || token.metadata?.network || token.chainInfo?.name || getChainInfo(token.chainId).name || 'Blockchain'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex items-center space-x-1.5">
                        <span className="text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                          {t('common.passed', 'Passed')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* EXPLORE MARKETPLACE TAB */}
        {mobileTab === 'explore' && (
          <div className="w-full h-full flex-1 flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
            <ExploreView
              tokens={tokens}
              onNavigateDonate={(token) => {
                if (token && token.address) {
                  setAddressInput(token.address);
                }
                handleTabChange('donate');
              }}
            />
          </div>
        )}

        {/* DONATE / ADD TOKEN TAB */}
        {mobileTab === 'donate' && (
          <MobileDonateView
            addressInput={addressInput}
            setAddressInput={setAddressInput}
            selectedChain={selectedChain}
            setSelectedChain={setSelectedChain}
            onFetchToken={handleFetchToken}
            isLoading={isLoading}
            errorMessage={errorMessage}
            autoSwitchNotice={autoSwitchNotice}
            apiKeys={apiKeys}
            fetchedToken={fetchedToken}
            setFetchedToken={setFetchedToken}
            logoReport={logoReport}
            logoStatus={logoStatus}
            setLogoStatus={setLogoStatus}
            tokens={tokens}
            handleSaveToken={handleSaveToken}
            handleResetForm={handleResetForm}
            isSavingToken={isSavingToken}
            isVerifying={isVerifying}
            verificationStage={verificationStage}
          />
        )}

        {/* TOKENS / EXPLORER TAB */}
        {mobileTab === 'tokens' && (
          <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            <MyTokensView
              tokens={tokens}
              onNavigateAddToken={() => handleTabChange('donate')}
              onOpenHowItWorks={onOpenHowItWorks}
              onOpenRewardModal={onOpenRewardModal}
            />
          </div>
        )}

        {/* WITHDRAWALS TAB */}
        {mobileTab === 'withdrawals' && (
          <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            <WithdrawalView
              currentUser={currentUser}
              userProfile={userProfile}
              wallet={wallet}
              onUpdateWallet={(updated) => setWallet && setWallet(updated)}
              onBack={() => handleTabChange('overview')}
            />
          </div>
        )}

        {/* PROFILE / SETTINGS TAB */}
        {mobileTab === 'profile' && (
          <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            <SettingsView
              apiKeys={apiKeys}
              setApiKeys={setApiKeys}
              userProfile={userProfile}
              currentUser={currentUser}
              onSignOut={handleSignOut}
              handleSignOut={handleSignOut}
              onNavigateTab={(tab) => handleTabChange(tab as any)}
              onOpenApiConsole={onOpenApiConsole || (() => handleTabChange('developer'))}
            />
          </div>
        )}

        {/* DEVELOPER / WORKER API STANDALONE VIEW */}
        {(mobileTab === 'developer' || mobileTab === 'api-console') && (
          <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            <DeveloperView onBack={() => handleTabChange('profile')} />
          </div>
        )}

        {/* MFA MANAGEMENT TAB */}
        {mobileTab === 'mfa' && (
          <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            <MfaManagementView
              currentUser={currentUser}
              userProfile={userProfile}
              onBackToSettings={() => handleTabChange('profile')}
              onNavigateTab={(tab) => handleTabChange(tab as any)}
            />
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {mobileTab === 'notifications' && (
          <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            <NotificationCenterView
              currentUser={currentUser}
              onClose={() => handleTabChange('overview')}
              onNavigateToTab={(tab) => handleTabChange(tab as any)}
              onUnreadCountChange={onUnreadCountChange}
            />
          </div>
        )}

        {/* HELP CENTER STANDALONE PAGE */}
        {mobileTab === 'help-center' && (
          <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            <HelpCenterView
              onBack={() => handleTabChange('profile')}
              onNavigateContactSupport={() => handleTabChange('contact-support')}
            />
          </div>
        )}

        {/* CONTACT SUPPORT STANDALONE PAGE */}
        {mobileTab === 'contact-support' && (
          <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            <ContactSupportView
              onBack={() => handleTabChange('profile')}
              onNavigateHelpCenter={() => handleTabChange('help-center')}
              currentUser={currentUser}
            />
          </div>
        )}

        {/* SUPPORT LIVE CHAT STANDALONE FULLSCREEN PAGE */}
        {(mobileTab === 'support-chat' || mobileTab === 'live-chat') && (
          <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            <SupportLiveChatView
              onBack={() => handleTabChange('contact-support')}
              onNavigateHelpCenter={() => handleTabChange('help-center')}
              currentUser={currentUser}
            />
          </div>
        )}

        {/* TERMS & PRIVACY STANDALONE PAGE */}
        {(mobileTab === 'terms-privacy' || mobileTab === 'privacy-policy') && (
          <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            <TermsAndPrivacyView
              onBack={() => handleTabChange('profile')}
              onNavigateContactSupport={() => handleTabChange('contact-support')}
            />
          </div>
        )}

        {/* DATA & ANALYTICS / PREFERENCES STANDALONE PAGE */}
        {mobileTab === 'preferences' && (
          <div className="flex-1 min-h-0 w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            <TermsAndPrivacyView
              onBack={() => handleTabChange('profile')}
              onNavigateContactSupport={() => handleTabChange('contact-support')}
              initialTab="preferences"
            />
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation Bar (Hidden when on standalone sub-pages / Support pages / Developer workspace) */}
      {mobileTab !== 'withdrawals' &&
        mobileTab !== 'notifications' &&
        mobileTab !== 'mfa' &&
        mobileTab !== 'help-center' &&
        mobileTab !== 'contact-support' &&
        mobileTab !== 'support-chat' &&
        mobileTab !== 'live-chat' &&
        mobileTab !== 'terms-privacy' &&
        mobileTab !== 'privacy-policy' &&
        mobileTab !== 'preferences' &&
        mobileTab !== 'developer' &&
        mobileTab !== 'api-console' && (
        <nav className="shrink-0 z-50 bg-[#090C12] backdrop-blur-xl border-t border-zinc-800/80 rounded-t-3xl px-3 pt-2.5 pb-safe-nav shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
          <div className="max-w-md mx-auto grid grid-cols-5 items-center justify-items-center relative">
            {/* 1. Overview */}
          <button
            onClick={() => handleTabChange('overview')}
            className={`w-full flex flex-col items-center justify-center space-y-1 transition-all ${
              mobileTab === 'overview' ? 'text-[#4ADE80] font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Home className={`w-5 h-5 ${mobileTab === 'overview' ? 'text-[#4ADE80] fill-[#22C55E]/20 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-zinc-500'}`} />
            <span className="text-[10px]">{t('nav.overview', 'Overview')}</span>
          </button>

            {/* 2. Explore */}
            <button
              onClick={() => handleTabChange('explore')}
              className={`w-full flex flex-col items-center justify-center space-y-1 transition-all ${
                mobileTab === 'explore' ? 'text-[#4ADE80] font-bold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Compass className={`w-5 h-5 ${mobileTab === 'explore' ? 'text-[#4ADE80] fill-[#22C55E]/20 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-zinc-500'}`} />
              <span className="text-[10px]">{t('nav.explore', 'Explore')}</span>
            </button>

          {/* 3. Center Elevated Circular Donate Button with Black Notch Cutout Ring */}
          <div className="w-full flex flex-col items-center justify-center -mt-7 relative z-10">
            <div className="p-1.5 bg-[#06080E] rounded-full shadow-lg">
              <button
                onClick={() => handleTabChange('donate')}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  mobileTab === 'donate'
                    ? 'bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] text-black shadow-[0_4px_20px_rgba(34,197,94,0.5)] scale-105 ring-2 ring-[#4ADE80]/60'
                    : 'bg-gradient-to-tr from-[#15803D] to-[#22C55E] hover:from-[#16A34A] hover:to-[#4ADE80] text-black shadow-[0_4px_16px_rgba(22,163,74,0.4)]'
                }`}
              >
                <Send className="w-5 h-5 ml-0.5 fill-black" />
              </button>
            </div>
            <span className={`text-[10px] mt-0.5 font-medium ${mobileTab === 'donate' ? 'text-[#4ADE80] font-bold' : 'text-zinc-500'}`}>
              {t('nav.donate', 'Donate')}
            </span>
          </div>

          {/* 4. Tokens */}
          <button
            onClick={() => handleTabChange('tokens')}
            className={`w-full flex flex-col items-center justify-center space-y-1 transition-all ${
              mobileTab === 'tokens' ? 'text-[#4ADE80] font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Box className={`w-5 h-5 ${mobileTab === 'tokens' ? 'text-[#4ADE80] fill-[#22C55E]/20 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-zinc-500'}`} />
            <span className="text-[10px]">{t('nav.tokens', 'Tokens')}</span>
          </button>

          {/* 5. Settings */}
          <button
            onClick={() => handleTabChange('profile')}
            className={`w-full flex flex-col items-center justify-center space-y-1 transition-all ${
              mobileTab === 'profile' ? 'text-[#4ADE80] font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Settings className={`w-5 h-5 ${mobileTab === 'profile' ? 'text-[#4ADE80] fill-[#22C55E]/20 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-zinc-500'}`} />
            <span className="text-[10px]">{t('nav.settings', 'Settings')}</span>
          </button>
        </div>
      </nav>
      )}
    </div>
  );
};
