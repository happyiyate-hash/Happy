import React, { useState, useEffect } from 'react';
import { TOKENCARE_LOGO_URL } from './constants/logo';
import confetti from 'canvas-confetti';
import {
  Menu,
  HelpCircle,
  PlusCircle,
  Coins,
  ShieldCheck,
  Heart,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Search,
  Zap,
  Bell,
} from 'lucide-react';

import { ChainId, SubmittedToken, UserRewardWallet, LogoStatus } from './types';
import { SUPPORTED_CHAINS, RAW_EVM_CHAINS, REWARD_RATE_USD, getChainInfo, normalizeChainKey, isEvmChain, validateTokenIdentifier } from './constants/chains';
import { fetchERC20MetadataFromBlockchain, detectEVMChainForContractAddress } from './services/ethers';
import { fetchDexScreenerData, fetchCoinGeckoSupplyData, discoverToken } from './services/api';
import { analyzeTokenSafety } from './services/security';
import { verifyToken, VerificationReport } from './services/verificationEngine';
import { verifyTokenLogo, LogoVerificationReport, downloadAndPrepareImageSource } from './services/logoVerificationEngine';
import { getChainLogoUrl } from './components/ChainSelectorModal';
import {
  getSubmittedTokens,
  saveSubmittedTokens,
  getRewardWallet,
  recordTokenSubmissionReward,
  INITIAL_WALLET,
} from './services/storage';

import { ApiKeyConfig, getStoredApiKeys } from './services/apiKeys';

import { Sidebar } from './components/Sidebar';
import { ContractAddressSection } from './components/ContractAddressSection';
import { TokenInformationCard } from './components/TokenInformationCard';
import { LogoVerificationCard } from './components/LogoVerificationCard';
import { DonationSettingsCard } from './components/DonationSettingsCard';
import { TokenHuntCard } from './components/TokenHuntCard';
import { HowItWorksModal } from './components/HowItWorksModal';
import { RewardWalletModal } from './components/RewardWalletModal';
import { WalletConnectModal } from './components/WalletConnectModal';
import { DashboardOverview } from './components/DashboardOverview';
import { ExploreView } from './components/ExploreView';
import { SettingsView } from './components/SettingsView';
import { WithdrawalView } from './components/WithdrawalView';
import { NotificationCenterView } from './components/NotificationCenterView';
import { MfaManagementView } from './components/MfaManagementView';
import { ApiConsoleModal } from './components/ApiConsoleModal';
import { HelpCenterView } from './components/HelpCenterView';
import { ContactSupportView } from './components/ContactSupportView';
import { SupportLiveChatView } from './components/SupportLiveChatView';
import { TermsAndPrivacyView } from './components/TermsAndPrivacyView';
import { DeveloperView } from './components/DeveloperView';

import { uploadTokensToWorker, getTokenByAddressFromWorker } from './services/workerApi';
import { initGlobalExploreDirectory } from './services/exploreDirectory';
import {
  getSupabase,
  SupabaseUserProfile,
  getUserProfile,
  verifyTokenContractUnique,
  saveTokenToSupabase,
  addTokenToUserInSupabase,
  findUserTokenInSupabase,
  checkTokenAlreadySaved,
  fetchTokensFromSupabase,
  trackUserDeviceInSupabase,
  fetchUserNotifications,
  fetchUnreadNotificationCount,
  subscribeToRealtimeNotifications,
} from './lib/supabase';
import { getMFAAssuranceLevel } from './lib/mfa';
import { setStatusBarColor } from './lib/statusBar';
import {
  initMobileStatusBar,
  hideMobileSplashScreen,
  registerMobileBackButtonListener,
  triggerHaptic,
  isCapacitorNative,
} from './utils/capacitor';
import { AuthScreen } from './components/AuthScreen';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { MobileView } from './components/MobileView';
import { LandingSplashScreen } from './components/LandingSplashScreen';
import { ToastNotification } from './components/ToastNotification';
import { ConnectionStatusToast } from './components/ConnectionStatusToast';
import {
  getCachedAppData,
  setCachedAppData,
  clearCachedAppData,
  SessionStatus,
  CachedAppData,
} from './services/appCache';
import { Loader2, Smartphone, Monitor } from 'lucide-react';

// Persistent network transition tracker outside component lifecycle
let isGenuinelyOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedChain, setSelectedChain] = useState<ChainId>('137'); // Polygon PoS default
  const [tokens, setTokens] = useState<SubmittedToken[]>([]);
  const [wallet, setWallet] = useState<UserRewardWallet>(getRewardWallet());
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig>(getStoredApiKeys());

  // View Mode: 'desktop' vs 'mobile' (auto-detects mobile screens)
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop'
  );

  // Supabase Auth & Profile state
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<SupabaseUserProfile | null>(null);

  // Offline-first & Cache-first state architecture
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('authenticated_local');
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(null);
  const [connectionToast, setConnectionToast] = useState<'online' | 'offline' | null>(null);

  const currentUserRef = React.useRef<any>(null);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Sidebar controls
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isApiConsoleOpen, setIsApiConsoleOpen] = useState(false);

  // Form State
  const [currentStep, setCurrentStep] = useState(1);
  const [addressInput, setAddressInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoSwitchNotice, setAutoSwitchNotice] = useState<string | null>(null);

  // Active Fetched Token State (Starts STRICTLY NULL until user enters a contract address)
  const [fetchedToken, setFetchedToken] = useState<SubmittedToken | null>(null);
  const [logoReport, setLogoReport] = useState<LogoVerificationReport | null>(null);
  const [logoStatus, setLogoStatus] = useState<LogoStatus>('checking');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isTokenSavedInAccount, setIsTokenSavedInAccount] = useState<boolean>(false);

  // Progressive Verification Flow States
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStage, setVerificationStage] = useState<number>(4);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Notification state
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);

  // Load user unread notification count
  const loadUnreadCount = async (userId: string) => {
    try {
      const unread = await fetchUnreadNotificationCount(userId);
      setUnreadNotificationCount(unread);
    } catch (e) {
      console.warn('Failed to load unread count:', e);
    }
  };

  // Initialize global Explore directory cache and background refresh on app startup
  useEffect(() => {
    initGlobalExploreDirectory();
  }, []);

  // Subscribe to realtime user notifications
  useEffect(() => {
    const userId = currentUser?.id || 'demo-user-id';
    loadUnreadCount(userId);

    const unsubscribe = subscribeToRealtimeNotifications(userId, () => {
      loadUnreadCount(userId);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

  // Load User Profile and Tokens from Supabase
  const loadUserAndTokens = async (userId?: string, sessionUser?: any) => {
    if (!userId) {
      setTokens([]);
      return;
    }
    // Load saved tokens from Supabase for this user
    const supabaseTokens = await fetchTokensFromSupabase(userId);
    if (supabaseTokens && supabaseTokens.length > 0) {
      setTokens(supabaseTokens);
    } else {
      setTokens(getSubmittedTokens(userId));
    }

    loadUserProfile(userId, sessionUser);
    trackUserDeviceInSupabase(userId);
  };

  // Background synchronization with backend
  const performBackgroundSync = async (cachedUser?: any, hasCache = false) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setSessionStatus('offline');
      setIsSyncing(false);
      return;
    }

    setIsOnline(true);
    setIsSyncing(true);

    try {
      const supabase = getSupabase();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        if (!hasCache || sessionError?.message?.includes('invalid') || sessionError?.message?.includes('expired')) {
          console.warn('[BackgroundSync] Session expired or revoked on server.');
          const oldUserId = currentUserRef.current?.id;
          setSessionStatus('expired_revoked');
          setCurrentUser(null);
          setUserProfile(null);
          setTokens([]);
          setWallet(INITIAL_WALLET);
          setUnreadNotificationCount(0);
          if (oldUserId) {
            await clearCachedAppData(oldUserId);
          }
          setIsSyncing(false);
          return;
        } else {
          // Intermittent network issue reading session -> maintain offline cached mode!
          setSessionStatus('offline');
          setIsSyncing(false);
          return;
        }
      }

      // Check MFA AAL2 requirement on server
      try {
        const assurance = await getMFAAssuranceLevel();
        if (assurance.requiresMFA) {
          console.log('[BackgroundSync] Session requires AAL2 MFA on server.');
          const oldUserId = currentUserRef.current?.id;
          setSessionStatus('expired_revoked');
          setCurrentUser(null);
          setUserProfile(null);
          setTokens([]);
          setWallet(INITIAL_WALLET);
          setUnreadNotificationCount(0);
          if (oldUserId) {
            await clearCachedAppData(oldUserId);
          }
          setIsSyncing(false);
          return;
        }
      } catch (mfaErr) {
        console.warn('[BackgroundSync] MFA assurance check note:', mfaErr);
      }

      const serverUser = session.user;
      setCurrentUser(serverUser);
      const userId = serverUser.id;

      // Concurrently fetch fresh user profile, tokens, and unread notification count
      const [freshProfile, freshTokens, freshUnread] = await Promise.all([
        getUserProfile(userId, serverUser).catch(() => null),
        fetchTokensFromSupabase(userId).catch(() => null),
        fetchUnreadNotificationCount(userId).catch(() => 0),
      ]);

      trackUserDeviceInSupabase(userId).catch(() => {});

      if (freshProfile) {
        setUserProfile(freshProfile);
      }

      let finalTokens = tokens;
      if (freshTokens && Array.isArray(freshTokens)) {
        finalTokens = freshTokens;
        setTokens(freshTokens);
      }

      setUnreadNotificationCount(freshUnread);

      let updatedWallet = wallet;
      if (freshProfile) {
        const bal = Number(freshProfile.total_reward_balance || 0);
        const unclaimed = Number(freshProfile.unclaimed_reward_balance || bal);
        updatedWallet = {
          ...wallet,
          totalTokens: bal,
          totalUsd: bal * REWARD_RATE_USD,
          unclaimedTokens: unclaimed,
          unclaimedUsd: unclaimed * REWARD_RATE_USD,
        };
        setWallet(updatedWallet);
      }

      const syncTime = Date.now();
      setLastSyncTimestamp(syncTime);
      setSessionStatus('online_validated');

      // Update local IndexedDB cache with fresh payload
      await setCachedAppData({
        userId: serverUser.id,
        userEmail: serverUser.email || '',
        userProfile: freshProfile || userProfile,
        tokens: finalTokens,
        wallet: updatedWallet,
        unreadCount: freshUnread,
        lastSyncTimestamp: syncTime,
        sessionStatus: 'online_validated',
      });
    } catch (err) {
      console.warn('[BackgroundSync] Server sync failed (continuing with cached data):', err);
      // CRITICAL: NEVER CLEAR EXISTING CACHED DASHBOARD SIMPLY BECAUSE A NETWORK REQUEST FAILS!
      setSessionStatus('offline');
    } finally {
      setIsSyncing(false);
    }
  };

  // Offline-First Initialization & App Launch Flow
  useEffect(() => {
    let isMounted = true;

    const initializeCacheAndSession = async () => {
      try {
        const supabase = getSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const activeUserId = session.user.id;
          setCurrentUser(session.user);

          // Step 1: Read user-scoped cached session & dashboard state FIRST
          const cachedData = await getCachedAppData(activeUserId);

          if (cachedData && cachedData.userId === activeUserId) {
            if (cachedData.userProfile) setUserProfile(cachedData.userProfile);
            if (cachedData.tokens) setTokens(cachedData.tokens);
            if (cachedData.wallet) setWallet(cachedData.wallet);
            if (cachedData.unreadCount !== undefined) setUnreadNotificationCount(cachedData.unreadCount);
            if (cachedData.lastSyncTimestamp) setLastSyncTimestamp(cachedData.lastSyncTimestamp);
          } else {
            const userTokens = getSubmittedTokens(activeUserId);
            if (userTokens && userTokens.length > 0) {
              setTokens(userTokens);
            }
          }

          const initialStatus: SessionStatus =
            typeof navigator !== 'undefined' && navigator.onLine ? 'authenticated_local' : 'offline';
          setSessionStatus(initialStatus);

          await performBackgroundSync(session.user, true);
        } else {
          setCurrentUser(null);
          setUserProfile(null);
          setTokens([]);
        }
      } catch (err) {
        console.warn('[App] Offline cache bootstrap note:', err);
      }
    };

    initializeCacheAndSession();

    // Step 3: Listen for online and offline network status changes
    const handleOnline = () => {
      setIsOnline(true);
      setSessionStatus('authenticated_local');

      // CRITICAL: Only trigger "back online" if there was a genuine transition from OFFLINE to ONLINE
      if (isGenuinelyOffline) {
        isGenuinelyOffline = false;
        setConnectionToast('online');
      }

      performBackgroundSync(currentUserRef.current, true);
    };

    const handleOffline = () => {
      // Transition ONLINE -> OFFLINE
      isGenuinelyOffline = true;
      setIsOnline(false);
      setSessionStatus('offline');
      setConnectionToast('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Step 4: Supabase Auth state change listener
    const supabase = getSupabase();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        const oldUserId = currentUserRef.current?.id;
        setCurrentUser(null);
        setUserProfile(null);
        setTokens([]);
        setWallet(INITIAL_WALLET);
        setUnreadNotificationCount(0);
        if (oldUserId) {
          await clearCachedAppData(oldUserId);
        }
      } else if (session?.user) {
        if (currentUserRef.current?.id && currentUserRef.current.id !== session.user.id) {
          setTokens([]);
          setUserProfile(null);
        }
        setCurrentUser(session.user);
        performBackgroundSync(session.user, true);
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Check MFA level when app regains focus or is reopened
  useEffect(() => {
    const handleFocus = async () => {
      if (currentUser) {
        try {
          const assurance = await getMFAAssuranceLevel();
          if (assurance.requiresMFA) {
            console.log('[App] Session requires AAL2 MFA on app focus.');
            setCurrentUser(null);
          }
        } catch (e) {
          console.warn('[App] MFA assurance check on focus note:', e);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentUser]);

  // Auto-detect screen size and switch between Mobile and Desktop views
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('mobile');
      } else {
        setViewMode('desktop');
      }
    };

    handleResize(); // Check initially on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dynamic status bar transition across visual states:
  // State 1 (Splash) & State 2 (Auth / Session loading): #030710
  // State 3 (Main application): #090C13 (matches top header)
  useEffect(() => {
    if (authChecking) {
      setStatusBarColor('#030710');
      initMobileStatusBar(true, '#030710');
    } else if (currentUser) {
      setStatusBarColor('#090C13');
      initMobileStatusBar(true, '#090C13');
    } else {
      setStatusBarColor('#030710');
      initMobileStatusBar(true, '#030710');
    }
  }, [authChecking, currentUser, viewMode, activeTab]);

  // Capacitor Mobile Lifecycle (Splash Screen & Android Hardware Back Button)
  useEffect(() => {
    if (!authChecking) {
      hideMobileSplashScreen();
    }

    const unregisterBack = registerMobileBackButtonListener(() => {
      // 1. Dismiss open modal dialogs first
      if (isHowItWorksOpen) {
        setIsHowItWorksOpen(false);
        triggerHaptic.light();
        return true;
      }
      if (isRewardModalOpen) {
        setIsRewardModalOpen(false);
        triggerHaptic.light();
        return true;
      }
      if (isWalletModalOpen) {
        setIsWalletModalOpen(false);
        triggerHaptic.light();
        return true;
      }
      if (isApiConsoleOpen) {
        setIsApiConsoleOpen(false);
        triggerHaptic.light();
        return true;
      }
      if (isSidebarOpenMobile) {
        setIsSidebarOpenMobile(false);
        triggerHaptic.light();
        return true;
      }

      // 2. Navigate back to overview if on secondary screens
      if (activeTab !== 'overview' && activeTab !== 'dashboard') {
        setActiveTab('overview');
        triggerHaptic.selection();
        return true;
      }

      // At root level -> allow native app minimization
      return false;
    });

    return () => {
      unregisterBack();
    };
  }, [
    authChecking,
    isHowItWorksOpen,
    isRewardModalOpen,
    isWalletModalOpen,
    isApiConsoleOpen,
    isSidebarOpenMobile,
    activeTab,
  ]);

  const loadUserProfile = async (userId: string, sessionUser?: any) => {
    try {
      const profile = await getUserProfile(userId, sessionUser || currentUser);
      if (profile) {
        setUserProfile(profile);
        const bal = Number(profile.total_reward_balance || 0);
        setWallet((prev) => ({
          ...prev,
          totalTokens: bal,
          totalUsd: bal * REWARD_RATE_USD,
          unclaimedTokens: Number(profile.unclaimed_reward_balance || bal),
          unclaimedUsd: Number(profile.unclaimed_reward_balance || bal) * REWARD_RATE_USD,
        }));
      }
    } catch (e) {
      console.warn('Failed to load user profile from Supabase:', e);
    }
  };

  // Persist updated state to IndexedDB cache
  useEffect(() => {
    if (currentUser?.id) {
      setCachedAppData({
        userId: currentUser.id,
        userEmail: currentUser.email || '',
        userProfile,
        tokens,
        wallet,
        unreadCount: unreadNotificationCount,
        lastSyncTimestamp: lastSyncTimestamp || Date.now(),
        sessionStatus,
      }).catch(() => {});
    }
  }, [currentUser, userProfile, tokens, wallet, unreadNotificationCount, lastSyncTimestamp, sessionStatus]);

  const handleSignOut = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut().catch(() => {});
    } catch (e) {
      console.error('Sign out error:', e);
    } finally {
      await clearCachedAppData().catch(() => {});
      setCurrentUser(null);
      setUserProfile(null);
      setSessionStatus('authenticated_local');
    }
  };

  // Run Logo Verification Engine whenever fetchedToken logo changes
  useEffect(() => {
    if (fetchedToken) {
      const existingLogos = tokens.map((t) => t.metadata.logoUrl).filter(Boolean) as string[];
      verifyTokenLogo(
        fetchedToken.metadata.logoUrl,
        fetchedToken.metadata.symbol,
        existingLogos
      ).then((report) => {
        setLogoReport(report);
      });
    } else {
      setLogoReport(null);
    }
  }, [fetchedToken?.metadata.logoUrl, fetchedToken?.id, tokens]);

  // Logo Status reset & 10s fallback timeout mechanism
  useEffect(() => {
    const logoUrl = fetchedToken?.metadata.logoUrl;
    if (!logoUrl || !logoUrl.trim()) {
      setLogoStatus('invalid');
      return;
    }

    setLogoStatus('checking');

    const timeout = setTimeout(() => {
      setLogoStatus((current) => (current === 'checking' ? 'invalid' : current));
    }, 10000);

    return () => clearTimeout(timeout);
  }, [fetchedToken?.metadata.logoUrl, fetchedToken?.id]);

  // Auto-detect network deployment when user pastes/types contract address in real time
  useEffect(() => {
    const cleanAddr = addressInput.trim();
    if (!cleanAddr || cleanAddr.length < 10) return;

    const timer = setTimeout(async () => {
      try {
        const autoDetected = await detectEVMChainForContractAddress(cleanAddr);
        if (autoDetected && autoDetected.chainId) {
          const normKey = normalizeChainKey(autoDetected.chainId);
          if (normKey !== normalizeChainKey(selectedChain)) {
            setSelectedChain(normKey);
            setAutoSwitchNotice(
              `⚡ Auto-switched network to ${autoDetected.name} (Chain ID: ${normKey}) where contract was verified!`
            );
          }
        }
      } catch (e) {
        console.warn('Real-time auto-detect chain error:', e);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [addressInput]);

  // Handle Token Fetching with Network-Aware Discovery
  const handleFetchToken = async (targetAddress?: string) => {
    const addr = (targetAddress || addressInput).trim();
    if (!addr) {
      setErrorMessage('Please enter a valid token contract address or asset identifier');
      return;
    }

    // Validate format before starting loading animation
    const validation = validateTokenIdentifier(selectedChain, addr);
    if (!validation.isValid) {
      setErrorMessage('Unable to fetch details from this contract address. Please check the contract address and selected network, and try again.');
      setIsLoading(false);
      setIsVerifying(false);
      setStatusMessage(null);
      setFetchedToken(null);
      return;
    }

    setIsLoading(true);
    setIsVerifying(true);
    setVerificationStage(0);
    setStatusMessage('✓ Network detected');
    setErrorMessage(null);
    setAutoSwitchNotice(null);

    // Ensure all cards show skeleton state immediately
    setFetchedToken({
      id: 'token-pending',
      address: addr,
      chainId: normalizeChainKey(selectedChain),
      metadata: {
        address: addr,
        chainId: normalizeChainKey(selectedChain),
        name: 'Loading token...',
        symbol: '...',
        decimals: 18,
        totalSupply: '0',
        logoUrl: '',
      },
      marketData: {
        priceUsd: 0,
        priceNative: 0,
        priceChange24h: 0,
        volume24h: 0,
        liquidityUsd: 0,
        marketCapUsd: 0,
        fdvUsd: 0,
        dexName: 'DEX',
      },
      safety: {
        score: 0,
        isHoneypot: false,
        isVerified: true,
        hasMintFunction: false,
        buyTaxPct: 0,
        sellTaxPct: 0,
      },
      verificationReport: {
        status: 'NEEDS_REVIEW',
        trustScore: 0,
        riskRating: 'LOW',
        totalDataPoints: 0,
        passedChecksCount: 0,
        providerBreakdown: [],
        timestamp: new Date().toISOString(),
      },
      submittedAt: new Date().toISOString(),
      submittedBy: '',
      rewardEarnedTokens: 10,
      rewardEarnedUsd: 10,
      upvotes: 0,
      verified: false,
    });

    // Schedule progressive stage reveals
    const timer1 = setTimeout(() => {
      setVerificationStage(1);
      setStatusMessage('✓ Token metadata loaded');
    }, 600);

    const timer2 = setTimeout(() => {
      setVerificationStage(2);
      setStatusMessage('✓ Contract & liquidity verified');
    }, 1400);

    const timer3 = setTimeout(() => {
      setVerificationStage(3);
      setStatusMessage('✓ Logo & branding optimized');
    }, 2200);

    const timer4 = setTimeout(() => {
      setVerificationStage(4);
      setStatusMessage('✓ Verification report complete');
    }, 3000);

    try {
      // 0. Perform normalized token discovery across networks & providers
      const discovery = await discoverToken(addr, selectedChain);

      let activeChainKey = discovery?.chainId || normalizeChainKey(selectedChain);
      let blockchainType = discovery?.blockchainType || (isEvmChain(activeChainKey) ? 'evm' : 'unknown');

      if (activeChainKey !== normalizeChainKey(selectedChain) && SUPPORTED_CHAINS[activeChainKey]) {
        setSelectedChain(activeChainKey);
        setAutoSwitchNotice(
          `⚡ Auto-switched network to ${discovery?.blockchainName || activeChainKey} where asset was identified!`
        );
      }

      // 1. Fetch smart contract metadata directly via Ethers.js for EVM chains
      let erc20Meta = isEvmChain(activeChainKey, blockchainType)
        ? await fetchERC20MetadataFromBlockchain(addr, activeChainKey, apiKeys)
        : null;

      // If erc20Meta wasn't found on selected EVM chain, check if contract exists on other major EVM chains
      if (!erc20Meta && !discovery && isEvmChain(activeChainKey, blockchainType)) {
        const majorChainsToTest = ['1', '137', '8453', '42161', '56'].filter((c) => c !== activeChainKey);
        for (const testChain of majorChainsToTest) {
          const testMeta = await fetchERC20MetadataFromBlockchain(addr, testChain, apiKeys);
          if (testMeta && (testMeta.name || testMeta.symbol)) {
            erc20Meta = testMeta;
            activeChainKey = testChain;
            setSelectedChain(testChain);
            setAutoSwitchNotice(
              `⚡ Auto-switched network to ${getChainInfo(testChain).name} where contract was verified on-chain!`
            );
            break;
          }
        }
      }

      // 2. Fetch DEX price, volume & liquidity via DexScreener API and CoinGecko API
      const dexData = discovery?.marketData || (await fetchDexScreenerData(addr, activeChainKey));
      const cgData = await fetchCoinGeckoSupplyData(addr, activeChainKey);

      // Verify whether ANY valid token metadata or smart contract was actually found
      const hasValidName = discovery?.name || cgData?.name || erc20Meta?.name;
      const hasValidSymbol = discovery?.symbol || cgData?.symbol || erc20Meta?.symbol;

      if (!hasValidName && !hasValidSymbol) {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        setFetchedToken(null);
        setErrorMessage('Unable to fetch details from this contract address. Please check the contract address and selected network, and try again.');
        setIsVerifying(false);
        setIsLoading(false);
        setStatusMessage(null);
        return;
      }

      // Multi-Source Total Supply Resolution Algorithm
      let resolvedSupplyNum = 0;
      if (cgData?.totalSupplyCG && cgData.totalSupplyCG > 0) {
        resolvedSupplyNum = cgData.totalSupplyCG;
      } else if (cgData?.maxSupplyCG && cgData.maxSupplyCG > 0) {
        resolvedSupplyNum = cgData.maxSupplyCG;
      } else if (dexData?.fdvUsd && dexData?.priceUsd && dexData.priceUsd > 0) {
        resolvedSupplyNum = Math.round(dexData.fdvUsd / dexData.priceUsd);
      } else if (erc20Meta?.totalSupply && parseFloat(String(erc20Meta.totalSupply).replace(/,/g, '')) > 1) {
        resolvedSupplyNum = parseFloat(String(erc20Meta.totalSupply).replace(/,/g, ''));
      } else if (cgData?.circulatingSupply && cgData.circulatingSupply > 0) {
        resolvedSupplyNum = cgData.circulatingSupply;
      } else if (erc20Meta?.totalSupply) {
        resolvedSupplyNum = parseFloat(String(erc20Meta.totalSupply).replace(/,/g, '')) || 1000000000;
      } else {
        resolvedSupplyNum = 1000000000;
      }

      const chainMeta = getChainInfo(activeChainKey);
      const chainLogoUrl = getChainLogoUrl(activeChainKey);

      const tokenName = discovery?.name || cgData?.name || erc20Meta?.name || 'Unknown Token';
      const tokenSymbol = discovery?.symbol || cgData?.symbol || erc20Meta?.symbol || 'TOK';
      const rawLogoUrl = discovery?.logoUrl || erc20Meta?.logoUrl || cgData?.logoUrl || (dexData as any)?.logoUrl || '';
      const preparedLogoUrl = rawLogoUrl ? await downloadAndPrepareImageSource(rawLogoUrl) : '';

      erc20Meta = {
        address: addr,
        chainId: activeChainKey,
        chainName: discovery?.blockchainName || chainMeta.name,
        network: discovery?.blockchainName || chainMeta.name,
        chainSymbol: chainMeta.symbol,
        chainLogoUrl: chainLogoUrl,
        name: tokenName,
        symbol: tokenSymbol,
        decimals: discovery?.decimals || erc20Meta?.decimals || 18,
        totalSupply: resolvedSupplyNum.toString(),
        rawTotalSupply: String(resolvedSupplyNum),
        logoUrl: preparedLogoUrl,
        ownerAddress: erc20Meta?.ownerAddress,
        isRenounced: erc20Meta?.isRenounced ?? true,
        blockchainType,
        tokenStandard: discovery?.tokenStandard,
        asset_identifier_type: discovery?.asset_identifier_type || (blockchainType === 'xrpl' ? 'issued_asset' : 'contract_address'),
      } as any;

      const priceUsd = dexData?.priceUsd ?? cgData?.priceUsd ?? 0;
      const priceNative = dexData?.priceNative ?? 0;
      const priceChange24h = dexData?.priceChange24h ?? cgData?.priceChange24h ?? 0;
      const volume24h = dexData?.volume24h ?? 0;
      const liquidityUsd = dexData?.liquidityUsd ?? 0;
      const marketCapUsd = dexData?.marketCapUsd ?? cgData?.marketCapUsd ?? (priceUsd > 0 ? Math.round(priceUsd * resolvedSupplyNum) : 0);
      const fdvUsd = dexData?.fdvUsd ?? (priceUsd > 0 ? Math.round(priceUsd * resolvedSupplyNum) : 0);

      const marketData = {
        priceUsd,
        priceNative,
        priceChange24h,
        volume24h,
        liquidityUsd,
        marketCapUsd,
        fdvUsd,
        pairAddress: dexData?.pairAddress,
        dexName: dexData?.dexName || 'DEX',
        pairUrl: dexData?.pairUrl,
        circulatingSupply: cgData?.circulatingSupply || resolvedSupplyNum,
      };

      // 3. Security & honeypot analysis
      const safety = await analyzeTokenSafety(erc20Meta, marketData, activeChainKey);

      // 4. Run Multi-Provider Aggregation Engine
      const verificationReport = await verifyToken(erc20Meta.address, activeChainKey, erc20Meta.logoUrl, blockchainType);

      // 5. Construct token object
      const tokenObj: SubmittedToken = {
        id: `token-${Date.now()}`,
        address: erc20Meta.address,
        chainId: activeChainKey,
        metadata: erc20Meta,
        marketData,
        safety,
        verificationReport,
        submittedAt: new Date().toISOString(),
        submittedBy: wallet.walletAddress || '0xUser...Submit',
        rewardEarnedTokens: verificationReport.trustScore >= 75 ? 15 : 10,
        rewardEarnedUsd: (verificationReport.trustScore >= 75 ? 15 : 10) * REWARD_RATE_USD,
        upvotes: 1,
        verified: verificationReport.status === 'APPROVED',
      };

      // Wait for stage 4 completion before finalizing
      setTimeout(async () => {
        let isSavedInCloudflare = false;
        let isSavedInSupabase = false;

        // 1. Primary Global Registry Lookup: Query Cloudflare Worker Token API
        try {
          const cfCheck = await getTokenByAddressFromWorker(activeChainKey, erc20Meta.address);
          if (cfCheck.exists) {
            isSavedInCloudflare = true;
            console.log('[Verification] Token already exists in Cloudflare Worker global registry:', cfCheck.token);
          }
        } catch (cfErr) {
          console.warn('[Verification] Cloudflare Worker token check warning:', cfErr);
        }

        // 2. Query Supabase Database (User portfolio / database check)
        if (currentUser?.id) {
          try {
            isSavedInSupabase = await checkTokenAlreadySaved(
              currentUser.id,
              activeChainKey,
              erc20Meta.address
            );
          } catch (err) {
            console.warn('[Verification] Supabase check error:', err);
          }
        } else {
          const dupCheck = await verifyTokenContractUnique(
            erc20Meta.address,
            activeChainKey,
            undefined,
            (erc20Meta as any).blockchainType
          );
          isSavedInSupabase = !dupCheck.isUnique;
        }

        const isEvmToken = isEvmChain(activeChainKey, (erc20Meta as any).blockchainType);
        const cleanAddr = isEvmToken ? erc20Meta.address.toLowerCase().trim() : erc20Meta.address.trim();
        const activeChainClean = activeChainKey.toLowerCase().trim();
        const existsLocally = tokens.some((t) => {
          const tIsEvm = isEvmChain(t.chainId, (t.metadata as any)?.blockchainType);
          const tAddr = tIsEvm ? t.address.toLowerCase().trim() : t.address.trim();
          const tChain = (t.chainId || '').toLowerCase().trim();
          return tAddr === cleanAddr && tChain === activeChainClean;
        });
        const alreadySaved = isSavedInCloudflare || existsLocally || isSavedInSupabase;

        setIsTokenSavedInAccount(alreadySaved);

        if (alreadySaved) {
          setErrorMessage('This token already exists in TokenCare.');
        } else {
          setErrorMessage(null);
        }

        setFetchedToken(tokenObj);
        setCurrentStep(3); // Advance to Review Details
        setIsVerifying(false);
        setIsLoading(false);
        setStatusMessage(null);
      }, 3100);
    } catch (err: any) {
      console.error('[App] Error fetching token:', err);
      setFetchedToken(null);
      setErrorMessage('Could not complete verification. Check your contract address.');
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      setIsVerifying(false);
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  // Handle Saving Token to Directory
  const handleSaveToken = async (settings: any) => {
    if (!fetchedToken) return;

    setIsSavingToken(true);
    setErrorMessage(null);

    try {
      const targetChain = fetchedToken.chainId || selectedChain;
      const bType = (fetchedToken.metadata as any)?.blockchainType;
      const isEvm = isEvmChain(targetChain, bType);

      // Log duplicate check parameters for debugging
      console.log('TOKEN DUPLICATE CHECK', {
        userId: currentUser?.id,
        chainId: String(targetChain),
        blockchainType: bType,
        contractAddress: fetchedToken.address,
      });

      // 1. Cloudflare Worker Global Registry Duplicate Check
      const cfCheck = await getTokenByAddressFromWorker(targetChain, fetchedToken.address);
      if (cfCheck.exists) {
        setErrorMessage('This token already exists in TokenCare.');
        setIsSavingToken(false);
        return;
      }

      // 2. Verify Duplicate Address in Local State for this user on this chain
      const cleanAddress = isEvm ? fetchedToken.address.toLowerCase().trim() : fetchedToken.address.trim();
      const targetChainClean = targetChain.toLowerCase().trim();

      const existsLocally = tokens.some((t) => {
        const tIsEvm = isEvmChain(t.chainId, (t.metadata as any)?.blockchainType);
        const tAddr = tIsEvm ? t.address.toLowerCase().trim() : t.address.trim();
        const tChain = (t.chainId || '').toLowerCase().trim();
        return tAddr === cleanAddress && tChain === targetChainClean && t.id !== fetchedToken.id;
      });

      if (existsLocally) {
        setErrorMessage(
          `This token is already saved in your account.`
        );
        setIsSavingToken(false);
        return;
      }

      // 3. Direct RPC Check via token_exists_for_user
      if (currentUser?.id) {
        const alreadyExists = await checkTokenAlreadySaved(
          currentUser.id,
          targetChain,
          fetchedToken.address
        );

        console.log('TOKEN ALREADY EXISTS:', alreadyExists);

        if (alreadyExists) {
          setErrorMessage('This token is already saved in your account.');
          setIsSavingToken(false);
          return;
        }
      }

      // 4. Verify Duplicate Address in Supabase Database for this user
      const dupCheck = await verifyTokenContractUnique(
        fetchedToken.address,
        targetChain,
        currentUser?.id,
        bType
      );
      if (!dupCheck.isUnique) {
        setErrorMessage(
          dupCheck.error ||
            `This token is already saved in your account.`
        );
        setIsSavingToken(false);
        return;
      }

      // 5. Save Token to Supabase Database (Atomic catalog + user relation)
      const supabaseResult = await addTokenToUserInSupabase(fetchedToken, currentUser?.id);
      if (!supabaseResult.success) {
        setErrorMessage(
          supabaseResult.error || `Failed to save token address "${fetchedToken.address}" to Supabase database.`
        );
        setIsSavingToken(false);
        return;
      }

      if (supabaseResult.alreadyExists) {
        setErrorMessage(`This token is already saved in your account.`);
        setIsSavingToken(false);
        return;
      }

      // 4. Record Reward & Update Local State
      const { updatedWallet, rewardEarnedTokens } = recordTokenSubmissionReward(
        fetchedToken,
        wallet,
        currentUser?.id
      );
      setWallet(updatedWallet);

      const updatedTokens = [fetchedToken, ...tokens.filter((t) => t.id !== fetchedToken.id)];
      setTokens(updatedTokens);
      saveSubmittedTokens(updatedTokens, currentUser?.id);

      // 5. Automatically post token payload to Cloudflare Worker endpoint
      const chainInfo = getChainInfo(fetchedToken.chainId || selectedChain);
      const chainKey =
        fetchedToken.metadata.blockchainName ||
        (fetchedToken.metadata as any)?.blockchain_name ||
        (fetchedToken.metadata as any)?.blockchain ||
        fetchedToken.metadata.chainName ||
        fetchedToken.metadata.network ||
        chainInfo.name ||
        fetchedToken.chainId;

      await uploadTokensToWorker(
        [
          {
            name: fetchedToken.metadata.name,
            symbol: fetchedToken.metadata.symbol,
            contractAddress: fetchedToken.address,
            logoUrl: fetchedToken.metadata.logoUrl || '',
            verified: fetchedToken.verified ?? true,
          },
        ],
        chainKey
      );

      if (currentUser?.id) {
        loadUserProfile(currentUser.id);
      }

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10B981', '#34D399', '#059669', '#F59E0B'],
      });

      setCurrentStep(4);
      setSaveSuccessMessage(
        `Token has been successfully saved. You receive ${rewardEarnedTokens || 15} TokenCare tokens.`
      );

      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error('[App] Save error:', err);
      setErrorMessage(err.message || 'An error occurred while saving the token to database.');
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleResetForm = () => {
    setCurrentStep(1);
    setAddressInput('');
    setFetchedToken(null);
    setAutoSwitchNotice(null);
    setIsTokenSavedInAccount(false);
    setErrorMessage(null);
  };

  const currentChainInfo = getChainInfo(selectedChain);

  // Render Landing Splash Screen while checking auth session
  if (authChecking) {
    return (
      <LandingSplashScreen
        statusText="Verifying session..."
        minDurationMs={5000}
        onFinish={() => {
          setAuthChecking(false);
          performBackgroundSync(currentUserRef.current, true);
        }}
      />
    );
  }

  // Render AuthScreen if unauthenticated
  if (!currentUser) {
    return <AuthScreen onAuthenticated={() => loadUserAndTokens()} />;
  }

  // Dedicated Mobile View (Separate UI with Bottom Navigation & Real-Time Sync)
  if (viewMode === 'mobile') {
    return (
      <>
        <ToastNotification
          message={saveSuccessMessage}
          onClose={() => setSaveSuccessMessage(null)}
          onAction={handleResetForm}
          actionText="Add Another"
        />
        <ConnectionStatusToast
          status={connectionToast}
          onClose={() => setConnectionToast(null)}
        />
        <MobileView
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedChain={selectedChain}
          setSelectedChain={setSelectedChain}
          tokens={tokens}
          wallet={wallet}
          setWallet={setWallet}
          apiKeys={apiKeys}
          setApiKeys={setApiKeys}
          currentUser={currentUser}
          userProfile={userProfile}
          handleSignOut={handleSignOut}
          addressInput={addressInput}
          setAddressInput={setAddressInput}
          isLoading={isLoading}
          errorMessage={errorMessage}
          autoSwitchNotice={autoSwitchNotice}
          fetchedToken={fetchedToken}
          setFetchedToken={setFetchedToken}
          logoReport={logoReport}
          logoStatus={logoStatus}
          setLogoStatus={setLogoStatus}
          isSavingToken={isSavingToken}
          saveSuccessMessage={saveSuccessMessage}
          handleFetchToken={handleFetchToken}
          handleSaveToken={handleSaveToken}
          handleResetForm={handleResetForm}
          onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
          onOpenRewardModal={() => setIsRewardModalOpen(true)}
          onOpenWalletModal={() => setIsWalletModalOpen(true)}
          onOpenApiConsole={() => setIsApiConsoleOpen(true)}
          onSwitchToDesktop={() => setViewMode('desktop')}
          unreadCount={unreadNotificationCount}
          onUnreadCountChange={(count) => setUnreadNotificationCount(count)}
          isVerifying={isVerifying}
          verificationStage={verificationStage}
        />

        {/* Modals for Mobile View */}
        <HowItWorksModal
          isOpen={isHowItWorksOpen}
          onClose={() => setIsHowItWorksOpen(false)}
        />
        <RewardWalletModal
          isOpen={isRewardModalOpen}
          onClose={() => setIsRewardModalOpen(false)}
          wallet={wallet}
          onUpdateWallet={setWallet}
          userId={currentUser?.id}
        />
        <WalletConnectModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          wallet={wallet}
          onUpdateWallet={setWallet}
          userId={currentUser?.id}
        />
        <ApiConsoleModal
          isOpen={isApiConsoleOpen}
          onClose={() => setIsApiConsoleOpen(false)}
        />
        <PWAInstallBanner />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#06080E] text-white font-sans selection:bg-emerald-500 selection:text-black flex relative">
      <ToastNotification
        message={saveSuccessMessage}
        onClose={() => setSaveSuccessMessage(null)}
        onAction={handleResetForm}
        actionText="Add Another"
      />
      <ConnectionStatusToast
        status={connectionToast}
        onClose={() => setConnectionToast(null)}
      />
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'add-token') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        selectedChain={selectedChain}
        onSelectChain={setSelectedChain}
        isOpen={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        wallet={wallet}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onOpenRewardModal={() => setIsRewardModalOpen(true)}
        onOpenApiConsole={() => setIsApiConsoleOpen(true)}
        unreadCount={unreadNotificationCount}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 h-screen overflow-hidden ${
          isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Top Fixed Header (Hidden on standalone views like MFA, Explore, Help Center, Contact Support, Terms & Privacy, Preferences) */}
        {activeTab !== 'mfa' &&
          activeTab !== 'directory' &&
          activeTab !== 'help-center' &&
          activeTab !== 'contact-support' &&
          activeTab !== 'terms-privacy' &&
          activeTab !== 'privacy-policy' &&
          activeTab !== 'preferences' &&
          activeTab !== 'developer' &&
          activeTab !== 'api-console' && (
          <header className="shrink-0 bg-[#090C13]/90 backdrop-blur-md border-b border-zinc-800/80 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 z-30">
            <div className="flex items-center space-x-2.5 min-w-0">
              {/* Mobile Sidebar Hamburger Toggle */}
              <button
                onClick={() => setIsSidebarOpenMobile(true)}
                className="lg:hidden p-1.5 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg border border-zinc-800 cursor-pointer"
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Desktop Collapse Toggle */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden lg:flex p-1.5 text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-zinc-800/80 transition-colors cursor-pointer"
                title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>

              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                  {activeTab === 'add-token'
                    ? 'Add Token for Donations'
                    : activeTab === 'dashboard'
                    ? 'Dashboard Overview'
                    : activeTab === 'payouts'
                    ? 'Payouts & Backend Server Hub'
                    : activeTab === 'settings'
                    ? 'Blockchain & API Settings'
                    : activeTab ? String(activeTab).toUpperCase() : ''}
                </h1>
                <p className="text-[11px] text-zinc-400 truncate hidden sm:block">
                  {activeTab === 'add-token'
                    ? 'Paste an EVM token contract address to fetch price, market cap & audit score.'
                    : activeTab === 'payouts'
                    ? 'Withdraw earned REWARD tokens and access complete Supabase backend payout code.'
                    : activeTab === 'settings'
                    ? 'Configure Infura and Alchemy API keys to communicate with 37 EVM networks.'
                    : 'Transparent Web3 EVM token verification & donation tracking platform.'}
                </p>
              </div>
            </div>

            {/* Right Header Controls */}
            <div className="flex items-center space-x-2 shrink-0">
              {/* User Account Pill & Sign Out */}
              {currentUser && (
                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 space-x-1">
                  <div className="flex items-center space-x-1.5 px-2 py-0.5 text-xs text-zinc-300 font-medium">
                    {currentUser.user_metadata?.avatar_url || userProfile?.avatar_url ? (
                      <img
                        src={currentUser.user_metadata?.avatar_url || userProfile?.avatar_url}
                        alt="Avatar"
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[9px]">
                        {String(currentUser.email || currentUser.user_metadata?.username || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="hidden sm:inline font-semibold text-emerald-400">
                      {currentUser.email ? currentUser.email.split('@')[0] : 'Account'}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="px-2 py-1 bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    Sign Out
                  </button>
                </div>
              )}

              {/* How it works Button */}
              <button
                onClick={() => setIsHowItWorksOpen(true)}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">How it works</span>
              </button>

              {/* Notification Bell Button */}
              <button
                onClick={() => setActiveTab('notifications')}
                className={`p-2 border rounded-xl relative transition-all cursor-pointer ${
                  activeTab === 'notifications'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
                }`}
                title="Notification Center"
              >
                <Bell className="w-4 h-4 text-emerald-400" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#22C55E] text-black font-extrabold text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full shadow-md shadow-emerald-500/40 animate-pulse border border-black font-mono">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* Reward Pill */}
              <button
                onClick={() => setIsRewardModalOpen(true)}
                className="hidden sm:flex px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 rounded-lg text-xs font-bold font-mono items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{wallet?.unclaimedTokens ?? 0} REWARD</span>
              </button>

              {/* View Mode Switcher Button */}
              <button
                onClick={() => setViewMode('mobile')}
                className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                title="Switch to Mobile UI View"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Mobile View</span>
              </button>
            </div>
          </header>
        )}

        {/* View Router Main Body */}
        {activeTab === 'directory' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">
            <ExploreView
              tokens={tokens}
              onNavigateDonate={(tok) => {
                if (tok && tok.address) {
                  setAddressInput(tok.address);
                }
                setActiveTab('add-token');
              }}
              onOpenSidebar={() => setIsSidebarOpenMobile(true)}
            />
          </div>
        ) : activeTab === 'mfa' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">
            <MfaManagementView
              currentUser={currentUser}
              userProfile={userProfile}
              onBackToSettings={() => setActiveTab('settings')}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          </div>
        ) : activeTab === 'help-center' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">
            <HelpCenterView
              onBack={() => setActiveTab('settings')}
              onNavigateContactSupport={() => setActiveTab('contact-support')}
            />
          </div>
        ) : activeTab === 'contact-support' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">
            <ContactSupportView
              onBack={() => setActiveTab('settings')}
              onNavigateHelpCenter={() => setActiveTab('help-center')}
              currentUser={currentUser}
            />
          </div>
        ) : activeTab === 'support-chat' || activeTab === 'live-chat' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">
            <SupportLiveChatView
              onBack={() => setActiveTab('contact-support')}
              onNavigateHelpCenter={() => setActiveTab('help-center')}
              currentUser={currentUser}
            />
          </div>
        ) : activeTab === 'terms-privacy' || activeTab === 'privacy-policy' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">
            <TermsAndPrivacyView
              onBack={() => setActiveTab('settings')}
              onNavigateContactSupport={() => setActiveTab('contact-support')}
            />
          </div>
        ) : activeTab === 'preferences' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">
            <TermsAndPrivacyView
              onBack={() => setActiveTab('settings')}
              onNavigateContactSupport={() => setActiveTab('contact-support')}
              initialTab="preferences"
            />
          </div>
        ) : activeTab === 'developer' || activeTab === 'api-console' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">
            <DeveloperView
              onBack={() => setActiveTab('settings')}
              currentUser={currentUser}
            />
          </div>
        ) : (
          <main className="flex-1 min-h-0 p-3 sm:p-5 space-y-4 max-w-5xl w-full mx-auto overflow-y-auto">
            {activeTab === 'dashboard' ? (
            <DashboardOverview
              tokens={tokens}
              wallet={wallet}
              onNavigateAddToken={() => setActiveTab('add-token')}
              onSelectToken={(tok) => {
                setFetchedToken(tok);
                setSelectedChain(tok.chainId);
                setActiveTab('add-token');
                setCurrentStep(3);
              }}
            />
          ) : activeTab === 'payouts' ? (
            <WithdrawalView
              currentUser={currentUser}
              userProfile={userProfile}
              wallet={wallet}
              onUpdateWallet={setWallet}
            />
          ) : activeTab === 'notifications' ? (
            <NotificationCenterView
              currentUser={currentUser}
              onClose={() => setActiveTab('dashboard')}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onUnreadCountChange={(count) => setUnreadNotificationCount(count)}
            />
          ) : activeTab === 'settings' ? (
            <SettingsView
              currentUser={currentUser}
              userProfile={userProfile}
              onUpdateProfile={(updated) => setUserProfile(updated)}
              onSignOut={handleSignOut}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenApiConsole={() => setIsApiConsoleOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {/* Notification Banner */}
              {saveSuccessMessage && (
                <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-2.5 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>{saveSuccessMessage}</span>
                  </div>
                  <button
                    onClick={handleResetForm}
                    className="text-[11px] bg-emerald-500 text-black px-2.5 py-1 rounded-md font-bold cursor-pointer"
                  >
                    Add Another Token
                  </button>
                </div>
              )}

              {/* Auto Network Switch Toast */}
              {autoSwitchNotice && (
                <div className="bg-blue-500/15 border border-blue-500/40 rounded-xl p-2.5 text-blue-300 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
                  <Zap className="w-4 h-4 text-blue-400 shrink-0 fill-blue-400/20" />
                  <span>{autoSwitchNotice}</span>
                </div>
              )}

              {/* EVM Contract Address Input & Network Selector */}
              <ContractAddressSection
                addressInput={addressInput}
                setAddressInput={setAddressInput}
                selectedChain={selectedChain}
                onSelectChain={setSelectedChain}
                onFetchToken={handleFetchToken}
                isLoading={isLoading}
                errorMessage={errorMessage}
                apiKeys={apiKeys}
                isVerifying={isVerifying}
                statusMessage={statusMessage}
              />

              {/* Verified Token Details & Donation Form (Visible ONLY when token is explicitly fetched) */}
              {fetchedToken ? (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <TokenInformationCard
                    metadata={fetchedToken.metadata}
                    marketData={fetchedToken.marketData}
                    safety={fetchedToken.safety}
                    selectedChain={selectedChain}
                    verificationReport={fetchedToken.verificationReport}
                    stage={verificationStage}
                    isVerifying={isVerifying}
                    onUpdateLogo={(logoUrl) => {
                      setFetchedToken((prev) =>
                        prev
                          ? {
                              ...prev,
                              metadata: {
                                ...prev.metadata,
                                logoUrl,
                              },
                            }
                          : null
                      );
                    }}
                  />

                  {/* Dedicated Logo Verification Engine Section */}
                  <LogoVerificationCard
                    report={logoReport}
                    logoStatus={logoStatus}
                    onLogoStatusChange={setLogoStatus}
                    stage={verificationStage}
                    isVerifying={isVerifying}
                    onUpdateLogo={(logoUrl) => {
                      setFetchedToken((prev) =>
                        prev
                          ? {
                              ...prev,
                              metadata: {
                                ...prev.metadata,
                                logoUrl,
                              },
                            }
                          : null
                      );
                    }}
                  />

                  <DonationSettingsCard
                    metadata={fetchedToken.metadata}
                    selectedChain={selectedChain}
                    logoReport={logoReport}
                    logoStatus={logoStatus}
                    trustScore={fetchedToken.verificationReport?.trustScore}
                    isAlreadySaved={
                      isTokenSavedInAccount ||
                      tokens.some(
                        (t) => t.address.toLowerCase().trim() === fetchedToken.address.toLowerCase().trim()
                      )
                    }
                    onSaveToken={handleSaveToken}
                    onCancel={handleResetForm}
                    isSaving={isSavingToken}
                    stage={verificationStage}
                    isVerifying={isVerifying}
                  />
                </div>
              ) : (
                <div className="bg-[#0B0E17]/60 border border-zinc-800/60 rounded-xl p-6 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white">EVM Token Verification Panel</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    Paste any ERC-20 contract address above and click <strong className="text-white">Fetch & Verify</strong> to pull live price, market cap, smart contract audit rating, and donation configuration.
                  </p>
                </div>
              )}

              {/* Token Hunt Card & Platform Discovery Section */}
              <TokenHuntCard />
            </div>
          )}
        </main>
      )}
      </div>

      {/* Modals */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />

      <RewardWalletModal
        isOpen={isRewardModalOpen}
        onClose={() => setIsRewardModalOpen(false)}
        wallet={wallet}
        onUpdateWallet={setWallet}
        userId={currentUser?.id}
      />

      <WalletConnectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        wallet={wallet}
        onUpdateWallet={setWallet}
        userId={currentUser?.id}
      />

      <ApiConsoleModal
        isOpen={isApiConsoleOpen}
        onClose={() => setIsApiConsoleOpen(false)}
      />

      <PWAInstallBanner />
    </div>
  );
}
