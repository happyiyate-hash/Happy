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
import { fetchDexScreenerData, fetchCoinGeckoSupplyData, discoverToken, lookupBlockchainForToken, uploadTokenToBackend, fetchNonEvmTokenMetadata } from './services/api';
import { analyzeTokenSafety } from './services/security';
import { verifyToken, VerificationReport } from './services/verificationEngine';
import { verifyTokenLogo, LogoVerificationReport, downloadAndPrepareImageSource } from './services/logoVerificationEngine';
import { resolveTokenLogoWithFallback } from './services/tokenLogoResolver';
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
import { WalletConnectModal } from './components/WalletConnectModal';
import { DashboardOverview } from './components/DashboardOverview';
import { ExploreView } from './components/ExploreView';
import { SettingsView } from './components/SettingsView';
import { DesktopSettingsView } from './components/DesktopSettingsView';
import { WithdrawalView } from './components/WithdrawalView';
import { DesktopWithdrawalView } from './components/DesktopWithdrawalView';
import { MySavedTokensView } from './components/MySavedTokensView';
import { FloatingSavedTokensBadge } from './components/FloatingSavedTokensBadge';
import {
  getLocalSavedTokens,
  addLocalSavedToken,
  submittedTokenToSavedItem,
  MAX_SAVED_TOKENS,
} from './services/tokenBatchVerificationService';
import { NotificationCenterView } from './components/NotificationCenterView';
import { DesktopNotificationPopover } from './components/DesktopNotificationPopover';
import { MfaManagementView } from './components/MfaManagementView';
import { HelpCenterView } from './components/HelpCenterView';
import { ContactSupportView } from './components/ContactSupportView';
import { SupportLiveChatView } from './components/SupportLiveChatView';
import { TermsAndPrivacyView } from './components/TermsAndPrivacyView';

import { uploadTokensToWorker, getTokenByAddressFromWorker } from './services/workerApi';
import { initGlobalExploreDirectory, normalizeWorkerToken } from './services/exploreDirectory';
import {
  fetchTokensByUserFromBackend,
  saveTokensToBackend,
} from './services/vercelTokenBackend';
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
  getLatestCachedAppData,
  getSyncCachedAppData,
  setCachedAppData,
  clearCachedAppData,
  saveActiveSessionUser,
  getActiveSessionUser,
  clearActiveSessionUser,
  SessionStatus,
  CachedAppData,
} from './services/appCache';
import { Loader2 } from 'lucide-react';

// Persistent network transition tracker outside component lifecycle
let isGenuinelyOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedChain, setSelectedChain] = useState<ChainId>('137'); // Polygon PoS default

  // Synchronously hydrate initial user session and data from storage for instant offline render & zero-flicker
  const [currentUser, setCurrentUser] = useState<any>(() => getActiveSessionUser());
  const [userProfile, setUserProfile] = useState<SupabaseUserProfile | null>(() => {
    const active = getActiveSessionUser();
    if (active?.id) {
      const cached = getSyncCachedAppData(active.id) || getLatestCachedAppData();
      return cached?.userProfile || null;
    }
    return null;
  });
  const [tokens, setTokens] = useState<SubmittedToken[]>(() => {
    const active = getActiveSessionUser();
    if (active?.id) {
      const cached = getSyncCachedAppData(active.id) || getLatestCachedAppData();
      if (cached?.tokens && cached.tokens.length > 0) return cached.tokens;
      const t = getSubmittedTokens(active.id);
      if (t && t.length > 0) return t;
    }
    return [];
  });
  const [wallet, setWallet] = useState<UserRewardWallet>(() => {
    const active = getActiveSessionUser();
    const activeId = active?.id;
    if (activeId) {
      const cached = getSyncCachedAppData(activeId) || getLatestCachedAppData();
      if (cached?.wallet) return cached.wallet;
    }
    return getRewardWallet(activeId);
  });
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig>(getStoredApiKeys());

  // Automatic View Mode: strictly adapts to viewport width (<768px for mobile, >=768px for desktop)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  // Supabase Auth & Profile state
  const [authChecking, setAuthChecking] = useState(true);

  // Offline-first & Cache-first state architecture
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'authenticated_local'
  );
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
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

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

  // Progressive Verification Flow States
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStage, setVerificationStage] = useState<number>(4);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Notification state
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [isDesktopNotificationOpen, setIsDesktopNotificationOpen] = useState<boolean>(false);

  // Saved tokens count for floating badge in desktop view
  const [savedTokensCount, setSavedTokensCount] = useState<number>(() => getLocalSavedTokens(currentUser?.id).length);

  useEffect(() => {
    const updateSavedCount = () => {
      setSavedTokensCount(getLocalSavedTokens(currentUser?.id).length);
    };

    updateSavedCount();
    window.addEventListener('tokencare_saved_tokens_updated', updateSavedCount);
    window.addEventListener('storage', updateSavedCount);

    return () => {
      window.removeEventListener('tokencare_saved_tokens_updated', updateSavedCount);
      window.removeEventListener('storage', updateSavedCount);
    };
  }, [currentUser?.id]);

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

  // Load User Profile and Tokens from Vercel Backend gateway (getTokensByUser) & local storage
  const loadUserAndTokens = async (userId?: string, sessionUser?: any) => {
    if (!userId) {
      setTokens([]);
      return;
    }

    // 1. Check local cache first for instantaneous offline render
    const localTokens = getSubmittedTokens(userId);
    if (localTokens && localTokens.length > 0) {
      setTokens(localTokens);
    }

    // 2. Fetch user tokens from Vercel backend using action: getTokensByUser
    try {
      const rawUserTokens = await fetchTokensByUserFromBackend(userId);
      if (rawUserTokens && Array.isArray(rawUserTokens) && rawUserTokens.length > 0) {
        // Normalize returned token items directly into SubmittedToken list
        const formattedTokens: SubmittedToken[] = rawUserTokens.map((t, idx) => {
          const contractAddr = String(t.contractAddress || t.address || t.id || '').trim();
          const chain = String(t.blockchain || t.chainId || 'polygon').trim().toLowerCase();
          return normalizeWorkerToken(
            {
              ...t,
              contractAddress: contractAddr,
              address: contractAddr,
              blockchain: chain,
            },
            idx
          );
        }).filter((t) => Boolean(t.address));

        if (formattedTokens.length > 0) {
          setTokens(formattedTokens);
          saveSubmittedTokens(formattedTokens, userId);
        } else if (localTokens && localTokens.length > 0) {
          setTokens(localTokens);
        }
      } else {
        // If empty from backend, fallback to Supabase or keep local
        const supabaseTokens = await fetchTokensFromSupabase(userId).catch(() => []);
        if (supabaseTokens && supabaseTokens.length > 0) {
          setTokens(supabaseTokens);
          saveSubmittedTokens(supabaseTokens, userId);
        } else if (!localTokens || localTokens.length === 0) {
          setTokens([]);
        }
      }
    } catch (e) {
      console.warn('[UserTokens] Vercel Backend getTokensByUser note, using local cache:', e);
      const supabaseTokens = await fetchTokensFromSupabase(userId).catch(() => []);
      if (supabaseTokens && supabaseTokens.length > 0) {
        setTokens(supabaseTokens);
      } else if (localTokens && localTokens.length > 0) {
        setTokens(localTokens);
      }
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
      } = await supabase.auth.getSession().catch((err) => ({
        data: { session: null },
        error: err,
      }));

      if (sessionError || !session?.user) {
        // If there's an active local user in storage, NEVER log them out due to intermittent network or session glitch
        const activeLocalUser = getActiveSessionUser();
        if (activeLocalUser?.id) {
          console.warn('[BackgroundSync] Server session check note - maintaining local offline state:', sessionError?.message);
          setSessionStatus('offline');
          setIsSyncing(false);
          return;
        }

        if (!hasCache || sessionError?.message?.includes('invalid') || sessionError?.message?.includes('expired')) {
          console.warn('[BackgroundSync] Session expired or revoked on server.');
          const oldUserId = currentUserRef.current?.id;
          setSessionStatus('expired_revoked');
          clearActiveSessionUser(oldUserId);
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

      // Check MFA AAL2 requirement on server (only when online)
      try {
        const assurance = await getMFAAssuranceLevel();
        if (assurance.requiresMFA) {
          console.log('[BackgroundSync] Session requires AAL2 MFA on server.');
          const oldUserId = currentUserRef.current?.id;
          setSessionStatus('expired_revoked');
          clearActiveSessionUser(oldUserId);
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
      saveActiveSessionUser(serverUser);
      setCurrentUser(serverUser);
      const userId = serverUser.id;

      // Concurrently fetch fresh user profile, tokens, and unread notification count
      const [freshProfile, rawBackendTokens, freshUnread] = await Promise.all([
        getUserProfile(userId, serverUser).catch(() => null),
        fetchTokensByUserFromBackend(userId).catch(() => null),
        fetchUnreadNotificationCount(userId).catch(() => 0),
      ]);

      trackUserDeviceInSupabase(userId).catch(() => {});

      if (freshProfile) {
        setUserProfile(freshProfile);
      }

      let finalTokens = tokens;
      if (rawBackendTokens && Array.isArray(rawBackendTokens) && rawBackendTokens.length > 0) {
        finalTokens = rawBackendTokens
          .map((t, idx) => {
            const contractAddr = String(t.contractAddress || t.address || t.id || '').trim();
            const chain = String(t.blockchain || t.chainId || 'polygon').trim().toLowerCase();
            return normalizeWorkerToken(
              {
                ...t,
                contractAddress: contractAddr,
                address: contractAddr,
                blockchain: chain,
              },
              idx
            );
          })
          .filter((t) => Boolean(t.address));

        if (finalTokens.length > 0) {
          setTokens(finalTokens);
          saveSubmittedTokens(finalTokens, userId);
        }
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

      // Update local IndexedDB and localStorage cache with fresh payload
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
        // Step 1: Immediately restore from synchronous / IndexedDB local cache
        const localActiveUser = getActiveSessionUser();
        if (localActiveUser?.id) {
          const cachedData = await getCachedAppData(localActiveUser.id);
          if (cachedData) {
            if (cachedData.userProfile) setUserProfile(cachedData.userProfile);
            if (cachedData.tokens && cachedData.tokens.length > 0) setTokens(cachedData.tokens);
            if (cachedData.wallet) setWallet(cachedData.wallet);
            if (cachedData.unreadCount !== undefined) setUnreadNotificationCount(cachedData.unreadCount);
            if (cachedData.lastSyncTimestamp) setLastSyncTimestamp(cachedData.lastSyncTimestamp);
          } else {
            const userTokens = getSubmittedTokens(localActiveUser.id);
            if (userTokens && userTokens.length > 0) {
              setTokens(userTokens);
            }
          }
          setCurrentUser(localActiveUser);
          setSessionStatus(
            typeof navigator !== 'undefined' && navigator.onLine ? 'authenticated_local' : 'offline'
          );
        }

        // Step 2: Check Supabase session
        const supabase = getSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));

        if (session?.user) {
          const activeUserId = session.user.id;
          saveActiveSessionUser(session.user);
          setCurrentUser(session.user);

          const cachedData = await getCachedAppData(activeUserId);
          if (cachedData && cachedData.userId === activeUserId) {
            if (cachedData.userProfile) setUserProfile(cachedData.userProfile);
            if (cachedData.tokens) setTokens(cachedData.tokens);
            if (cachedData.wallet) setWallet(cachedData.wallet);
            if (cachedData.unreadCount !== undefined) setUnreadNotificationCount(cachedData.unreadCount);
            if (cachedData.lastSyncTimestamp) setLastSyncTimestamp(cachedData.lastSyncTimestamp);
          }

          const initialStatus: SessionStatus =
            typeof navigator !== 'undefined' && navigator.onLine ? 'authenticated_local' : 'offline';
          setSessionStatus(initialStatus);

          if (typeof navigator !== 'undefined' && navigator.onLine) {
            await performBackgroundSync(session.user, true);
          }
        } else {
          // If Supabase getSession returned null (e.g. offline or slow network)
          const fallbackUser = getActiveSessionUser() || getLatestCachedAppData();
          if (fallbackUser?.id || (fallbackUser as any)?.userId) {
            const resolvedUser = fallbackUser.id
              ? fallbackUser
              : {
                  id: (fallbackUser as any).userId,
                  email: (fallbackUser as any).userEmail || '',
                  user_metadata: (fallbackUser as any).userProfile
                    ? {
                        full_name: (fallbackUser as any).userProfile.display_name,
                        username: (fallbackUser as any).userProfile.username,
                        avatar_url: (fallbackUser as any).userProfile.avatar_url,
                      }
                    : {},
                };
            saveActiveSessionUser(resolvedUser);
            setCurrentUser(resolvedUser);

            const userCache = await getCachedAppData(resolvedUser.id);
            if (userCache) {
              if (userCache.userProfile) setUserProfile(userCache.userProfile);
              if (userCache.tokens) setTokens(userCache.tokens);
              if (userCache.wallet) setWallet(userCache.wallet);
              setUnreadNotificationCount(userCache.unreadCount || 0);
              setLastSyncTimestamp(userCache.lastSyncTimestamp || null);
            }
            setSessionStatus('offline');
          } else {
            setCurrentUser(null);
            setUserProfile(null);
            setTokens([]);
          }
        }
      } catch (err) {
        console.warn('[App] Offline cache bootstrap exception, checking local storage:', err);
        const fallbackUser = getActiveSessionUser();
        if (fallbackUser?.id) {
          setCurrentUser(fallbackUser);
          setSessionStatus('offline');
        }
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

      if (currentUserRef.current) {
        performBackgroundSync(currentUserRef.current, true);
      }
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
        // If device is offline, ignore SIGNED_OUT event so token refresh failure offline doesn't log user out
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          console.warn('[App] Offline SIGNED_OUT event ignored - preserving offline session.');
          setSessionStatus('offline');
          return;
        }

        const activeLocalUser = getActiveSessionUser();
        if (!activeLocalUser) {
          const oldUserId = currentUserRef.current?.id;
          setCurrentUser(null);
          setUserProfile(null);
          setTokens([]);
          setWallet(INITIAL_WALLET);
          setUnreadNotificationCount(0);
          if (oldUserId) {
            await clearCachedAppData(oldUserId);
          }
        }
      } else if (session?.user) {
        if (currentUserRef.current?.id && currentUserRef.current.id !== session.user.id) {
          setTokens([]);
          setUserProfile(null);
        }
        saveActiveSessionUser(session.user);
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

  // Check MFA level when app regains focus or is reopened (only when online)
  useEffect(() => {
    const handleFocus = async () => {
      if (currentUser && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const assurance = await getMFAAssuranceLevel();
          if (assurance.requiresMFA) {
            console.log('[App] Session requires AAL2 MFA on app focus.');
            clearActiveSessionUser(currentUser.id);
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

  // Auto-detect screen size and switch between Mobile and Desktop views automatically
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
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
  }, [authChecking, currentUser, isMobile, activeTab]);

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
      if (isWalletModalOpen) {
        setIsWalletModalOpen(false);
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
    isWalletModalOpen,
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
    const activeUserId = currentUser?.id;
    try {
      clearActiveSessionUser(activeUserId);
      const supabase = getSupabase();
      await supabase.auth.signOut().catch(() => {});
    } catch (e) {
      console.error('Sign out error:', e);
    } finally {
      if (activeUserId) {
        await clearCachedAppData(activeUserId).catch(() => {});
      }
      setCurrentUser(null);
      setUserProfile(null);
      setTokens([]);
      setWallet(INITIAL_WALLET);
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
    if (!cleanAddr) return;

    const timer = setTimeout(async () => {
      try {
        const lookup = await lookupBlockchainForToken(cleanAddr, selectedChain);
        if (lookup && lookup.chainId) {
          const normKey = normalizeChainKey(lookup.chainId);
          if (normKey !== normalizeChainKey(selectedChain)) {
            setSelectedChain(normKey);
            setAutoSwitchNotice(
              `⚡ Auto-switched network to ${lookup.blockchain} where token is deployed!`
            );
          }
        }
      } catch (e) {
        console.warn('Real-time auto-detect chain error:', e);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [addressInput, selectedChain]);

  // Handle Token Fetching with Network-Aware Discovery & Full Security Audit Pipeline
  const handleFetchToken = async (targetAddress?: string) => {
    const addr = (targetAddress || addressInput).trim();
    if (!addr || addr.length < 1) {
      setErrorMessage('Please enter a valid token contract address or asset identifier.');
      setIsLoading(false);
      setIsVerifying(false);
      setStatusMessage(null);
      setFetchedToken(null);
      return;
    }

    setIsLoading(true);
    setIsVerifying(true);
    setVerificationStage(0);
    setStatusMessage('Detecting blockchain network...');
    setErrorMessage(null);
    setAutoSwitchNotice(null);

    // Initial skeleton placeholder for smooth layout transition
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

    try {
      // ----------------------------------------------------
      // STAGE 0: Network Resolution & Format Validation
      // ----------------------------------------------------
      const lookup = await lookupBlockchainForToken(addr, selectedChain).catch(() => null);
      let activeChainKey = lookup?.chainId || normalizeChainKey(selectedChain);
      let blockchainType = lookup?.blockchainType || (isEvmChain(activeChainKey) ? 'evm' : 'unknown');

      if (activeChainKey !== normalizeChainKey(selectedChain) && SUPPORTED_CHAINS[activeChainKey]) {
        setSelectedChain(activeChainKey);
        setAutoSwitchNotice(
          `⚡ Auto-switched network to ${lookup?.blockchain || activeChainKey} where asset was identified!`
        );
      }

      const validation = validateTokenIdentifier(activeChainKey, addr, blockchainType);
      if (!validation.isValid) {
        setErrorMessage(validation.error || `Invalid contract address format for ${getChainInfo(activeChainKey).name}.`);
        setFetchedToken(null);
        return;
      }

      setVerificationStage(0);
      setStatusMessage('✓ Network identified');

      // ----------------------------------------------------
      // STAGE 1: On-Chain Metadata & Indexer Resolution
      // ----------------------------------------------------
      setVerificationStage(1);
      setStatusMessage('Reading on-chain smart contract...');

      // 1. Fetch smart contract metadata directly via Ethers.js for EVM chains
      let erc20Meta = isEvmChain(activeChainKey, blockchainType)
        ? await fetchERC20MetadataFromBlockchain(addr, activeChainKey, apiKeys).catch(() => null)
        : null;

      // 1b. If non-EVM chain (Polkadot, Solana, TON, TRON, XRPL, Cosmos, Move), fetch token metadata via specialized providers
      if (!erc20Meta && !isEvmChain(activeChainKey, blockchainType)) {
        erc20Meta = await fetchNonEvmTokenMetadata(addr, activeChainKey, blockchainType).catch(() => null);
      }

      // If erc20Meta wasn't found on selected EVM chain, check if contract exists on other major EVM chains
      if (!erc20Meta && isEvmChain(activeChainKey, blockchainType)) {
        const majorChainsToTest = ['1', '137', '8453', '42161', '56'].filter((c) => c !== activeChainKey);
        for (const testChain of majorChainsToTest) {
          const testMeta = await fetchERC20MetadataFromBlockchain(addr, testChain, apiKeys).catch(() => null);
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
      let [dexData, cgData] = await Promise.all([
        fetchDexScreenerData(addr, activeChainKey, erc20Meta?.name, erc20Meta?.symbol).catch(() => null),
        fetchCoinGeckoSupplyData(addr, activeChainKey, erc20Meta?.name, erc20Meta?.symbol).catch(() => null),
      ]);

      // If CoinGecko didn't return data on first pass but DexScreener or ERC20 found name/symbol, perform secondary search
      const resolvedNameCandidate = erc20Meta?.name || dexData?.name;
      const resolvedSymbolCandidate = erc20Meta?.symbol || dexData?.symbol;
      if ((!cgData || !cgData.logoUrl) && (resolvedNameCandidate || resolvedSymbolCandidate)) {
        const secondaryCg = await fetchCoinGeckoSupplyData(addr, activeChainKey, resolvedNameCandidate, resolvedSymbolCandidate).catch(() => null);
        if (secondaryCg) {
          cgData = { ...cgData, ...secondaryCg };
        }
      }

      // Fallback synthesis for identified non-EVM assets
      if (!erc20Meta && !isEvmChain(activeChainKey, blockchainType)) {
        const bName = lookup?.blockchain || (blockchainType === 'polkadot' ? 'Polkadot Network' : 'Multi-Chain Asset');
        const shortSym = addr.includes(':') ? addr.split(':')[1].toUpperCase() : addr.slice(0, 4).toUpperCase();
        erc20Meta = {
          address: addr,
          chainId: activeChainKey,
          blockchainType: blockchainType || 'polkadot',
          blockchainName: bName,
          tokenStandard: lookup?.tokenStandard || 'Substrate Asset',
          name: `${bName} (${shortSym})`,
          symbol: shortSym || 'DOT',
          decimals: 10,
          totalSupply: '1000000000',
          rawTotalSupply: '1000000000',
          logoUrl: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.svg?v=035',
          isRenounced: true,
        };
      }

      // Verify whether ANY valid token metadata or smart contract was actually found
      const hasValidName = cgData?.name || erc20Meta?.name || dexData?.name;
      const hasValidSymbol = cgData?.symbol || erc20Meta?.symbol || dexData?.symbol;

      if (!hasValidName && !hasValidSymbol && !erc20Meta) {
        throw new Error(`No token contract or market pair found for "${addr}" on ${getChainInfo(activeChainKey).name}. Please verify the contract address and network.`);
      }

      setStatusMessage('✓ Token metadata loaded');

      // ----------------------------------------------------
      // STAGE 2: Market & Liquidity Verification
      // ----------------------------------------------------
      setVerificationStage(2);
      setStatusMessage('Analyzing liquidity & market pairs...');

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

      const tokenName = erc20Meta?.name || cgData?.name || (dexData as any)?.name || 'Unknown Token';
      const tokenSymbol = erc20Meta?.symbol || cgData?.symbol || (dexData as any)?.symbol || 'TOK';
      const rawLogoUrl = erc20Meta?.logoUrl || cgData?.logoUrl || (dexData as any)?.logoUrl || '';
      
      // Multi-provider logo resolver with deterministic priority fallback (using address, symbol, and name)
      let resolvedLogo = { logoUrl: '', logoSource: 'fallback' };
      try {
        resolvedLogo = await resolveTokenLogoWithFallback(
          addr,
          activeChainKey,
          rawLogoUrl,
          blockchainType,
          tokenSymbol,
          tokenName
        );
      } catch {
        resolvedLogo = { logoUrl: rawLogoUrl, logoSource: 'fallback' };
      }

      const preparedLogoUrl = resolvedLogo.logoUrl ? await downloadAndPrepareImageSource(resolvedLogo.logoUrl).catch(() => resolvedLogo.logoUrl) : '';

      erc20Meta = {
        address: addr,
        chainId: activeChainKey,
        chainName: lookup?.blockchain || chainMeta.name,
        network: lookup?.blockchain || chainMeta.name,
        chainSymbol: chainMeta.symbol,
        chainLogoUrl: chainLogoUrl,
        name: tokenName,
        symbol: tokenSymbol,
        decimals: erc20Meta?.decimals || 18,
        totalSupply: resolvedSupplyNum.toString(),
        rawTotalSupply: String(resolvedSupplyNum),
        logoUrl: preparedLogoUrl,
        logoSource: resolvedLogo.logoSource,
        ownerAddress: erc20Meta?.ownerAddress,
        isRenounced: erc20Meta?.isRenounced ?? true,
        blockchainType,
        tokenStandard: lookup?.tokenStandard || (blockchainType === 'polkadot' ? 'Substrate Asset' : blockchainType === 'xrpl' ? 'issued_asset' : blockchainType === 'ton' ? 'Jetton' : blockchainType === 'solana' ? 'SPL' : blockchainType === 'cosmos' ? 'IBC Token' : 'ERC-20'),
        asset_identifier_type: blockchainType === 'polkadot' ? 'substrate_asset' : blockchainType === 'xrpl' ? 'issued_asset' : blockchainType === 'solana' ? 'mint' : blockchainType === 'ton' ? 'jetton' : isEvmChain(activeChainKey, blockchainType) ? 'contract_address' : 'asset_identifier',
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

      setStatusMessage('✓ Contract & liquidity verified');

      // ----------------------------------------------------
      // STAGE 3: Multi-Provider Security & Honeypot Scan
      // ----------------------------------------------------
      setVerificationStage(3);
      setStatusMessage('Running security & honeypot scan...');

      const [safety, verificationReport] = await Promise.all([
        analyzeTokenSafety(erc20Meta, marketData, activeChainKey),
        verifyToken(erc20Meta.address, activeChainKey, erc20Meta.logoUrl, blockchainType),
      ]);

      setStatusMessage('✓ Security scan complete');

      // ----------------------------------------------------
      // STAGE 4: Finalize Verification & Assemble Result
      // ----------------------------------------------------
      setVerificationStage(4);
      setStatusMessage('✓ Verification report complete');

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

      // Display the fully fetched token details immediately for review
      setErrorMessage(null);
      setFetchedToken(tokenObj);
      setCurrentStep(3); // Advance to Review Details
    } catch (err: any) {
      console.error('[App] Error fetching token:', err);
      setFetchedToken(null);
      setErrorMessage(err?.message || 'Could not complete token verification. Please check your contract address and selected network.');
    } finally {
      setIsVerifying(false);
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  // Handle Saving Token to Directory via Vercel Backend
  const handleSaveToken = async (settings: any) => {
    if (!fetchedToken) return;

    setIsSavingToken(true);
    setErrorMessage(null);

    try {
      const targetChain = fetchedToken.chainId || selectedChain;
      const chainInfo = getChainInfo(targetChain);
      const blockchain =
        fetchedToken.metadata.blockchainName ||
        (fetchedToken.metadata as any)?.blockchain_name ||
        (fetchedToken.metadata as any)?.blockchain ||
        fetchedToken.metadata.chainName ||
        chainInfo.name ||
        'Polygon';

      const blockchainSymbol =
        fetchedToken.metadata.chainSymbol ||
        (fetchedToken.metadata as any)?.blockchainSymbol ||
        chainInfo.symbol ||
        'MATIC';

      let chainIdNum = 137;
      if (typeof targetChain === 'number' && !isNaN(targetChain)) {
        chainIdNum = targetChain;
      } else if (chainInfo.id && !isNaN(Number(chainInfo.id))) {
        chainIdNum = Number(chainInfo.id);
      } else if (!isNaN(Number(targetChain)) && Number(targetChain) > 0) {
        chainIdNum = Number(targetChain);
      }

      const userId = currentUser?.id || wallet.walletAddress || 'anonymous_user';

      // 1. Always save to user's local Saved Tokens List (up to 20 tokens)
      const savedItem = submittedTokenToSavedItem(fetchedToken, selectedChain);
      const localRes = addLocalSavedToken(savedItem, currentUser?.id);
      if (localRes.success) {
        setSavedTokensCount(localRes.list.length);
      }

      // Submit token array directly to Vercel backend /api/save-token matching strict payload structure
      const payloadTokens = [
        {
          blockchain,
          blockchainSymbol,
          chainId: chainIdNum,
          contractAddress: fetchedToken.address,
          tokenName: fetchedToken.metadata.name || 'Unknown Token',
          tokenSymbol: (fetchedToken.metadata.symbol || 'TOK').toUpperCase(),
          logoUrl: fetchedToken.metadata.logoUrl || '',
        },
      ];

      const saveResponse = await saveTokensToBackend(userId, payloadTokens);

      if (saveResponse.success) {
        // If rejected as duplicate by backend
        const isDuplicateRejected =
          Array.isArray(saveResponse.rejected) &&
          saveResponse.rejected.length > 0 &&
          (!saveResponse.saved || saveResponse.saved.length === 0);

        if (isDuplicateRejected) {
          const rejectReason =
            saveResponse.rejected?.[0]?.reason ||
            saveResponse.message ||
            'This token already exists in TokenCare directory.';
          // Token is still saved in local saved list
          setSaveSuccessMessage(`"${savedItem.symbol}" saved to your list (${localRes.list.length}/${MAX_SAVED_TOKENS})! (Already registered in directory)`);
          setCurrentStep(4);
          setIsSavingToken(false);
          setTimeout(() => {
            setSaveSuccessMessage(null);
          }, 5000);
          return;
        }

        // Update local tokens list
        const updatedTokens = [
          fetchedToken,
          ...tokens.filter((t) => t.id !== fetchedToken.id && t.address.toLowerCase() !== fetchedToken.address.toLowerCase()),
        ];
        setTokens(updatedTokens);
        saveSubmittedTokens(updatedTokens, currentUser?.id);

        // Reflect rewards if returned from server response
        if (saveResponse.reward?.amount) {
          const earned = Number(saveResponse.reward.amount);
          setWallet((prev) => ({
            ...prev,
            totalTokens: prev.totalTokens + earned,
            totalUsd: (prev.totalTokens + earned) * REWARD_RATE_USD,
            unclaimedTokens: prev.unclaimedTokens + earned,
            unclaimedUsd: (prev.unclaimedTokens + earned) * REWARD_RATE_USD,
          }));
        }

        if (currentUser?.id) {
          loadUserProfile(currentUser.id);
          fetchUnreadNotificationCount(currentUser.id).then((count) => setUnreadNotificationCount(count)).catch(() => {});
        }

        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10B981', '#34D399', '#059669', '#F59E0B'],
        });

        setCurrentStep(4);
        const successMsg =
          saveResponse.message ||
          (saveResponse.reward?.amount
            ? `Token "${savedItem.symbol}" saved to your list (${localRes.list.length}/${MAX_SAVED_TOKENS})! You received ${saveResponse.reward.amount} ${saveResponse.reward.symbol || 'TC'}.`
            : `Token "${savedItem.symbol}" saved to your list (${localRes.list.length}/${MAX_SAVED_TOKENS})!`);
        setSaveSuccessMessage(successMsg);

        setTimeout(() => {
          setSaveSuccessMessage(null);
        }, 5000);
      } else {
        // Even if backend reports an error, if locally saved, inform user
        if (localRes.success) {
          setCurrentStep(4);
          setSaveSuccessMessage(`"${savedItem.symbol}" saved to your local list (${localRes.list.length}/${MAX_SAVED_TOKENS})!`);
          setTimeout(() => {
            setSaveSuccessMessage(null);
          }, 5000);
        } else {
          setErrorMessage(
            localRes.error || saveResponse.message || saveResponse.error || 'Failed to save token. Please try again.'
          );
        }
      }
    } catch (err: any) {
      console.error('[App] Save error:', err);
      setErrorMessage(err?.message || 'An error occurred while communicating with the token save backend.');
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleResetForm = () => {
    setCurrentStep(1);
    setAddressInput('');
    setFetchedToken(null);
    setAutoSwitchNotice(null);
    setErrorMessage(null);
  };

  const currentChainInfo = getChainInfo(selectedChain);

  const handleAuthenticated = async (authedUser?: any) => {
    let user = authedUser;
    if (!user) {
      try {
        const supabase = getSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        user = session?.user;
      } catch (e) {
        console.warn('AuthScreen authenticated getSession note:', e);
      }
    }
    if (!user) {
      user = getActiveSessionUser();
    }
    if (user?.id) {
      saveActiveSessionUser(user);
      setCurrentUser(user);
      await loadUserAndTokens(user.id, user);
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await performBackgroundSync(user, true);
      }
    }
  };

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
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  // Dedicated Mobile View (Separate UI with Bottom Navigation & Real-Time Sync)
  if (isMobile) {
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
          onOpenRewardModal={() => {
            // Navigate directly to mobile withdrawal view
            const mobileWithdrawTab = 'withdrawals';
            setActiveTab(mobileWithdrawTab);
          }}
          onOpenWalletModal={() => setIsWalletModalOpen(true)}
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

        <WalletConnectModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          wallet={wallet}
          onUpdateWallet={setWallet}
          userId={currentUser?.id}
        />
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
        onOpenRewardModal={() => setActiveTab('payouts')}
        unreadCount={unreadNotificationCount}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 h-screen overflow-hidden ${
          isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Top Fixed Header (Hidden on standalone views like MFA, Explore, Help Center, Contact Support, Terms & Privacy, Preferences) */}
        {activeTab !== 'mfa' &&
          activeTab !== 'directory' &&
          activeTab !== 'help-center' &&
          activeTab !== 'contact-support' &&
          activeTab !== 'terms-privacy' &&
          activeTab !== 'privacy-policy' &&
          activeTab !== 'preferences' && (
          <header className="shrink-0 bg-[#090C13]/90 backdrop-blur-md border-b border-zinc-800/80 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 z-30">
            <div className="flex items-center space-x-2.5 min-w-0">
              {/* Mobile Sidebar Hamburger Toggle */}
              <button
                onClick={() => setIsSidebarOpenMobile(true)}
                className="md:hidden p-1.5 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg border border-zinc-800 cursor-pointer"
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Desktop Collapse Toggle */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden md:flex p-1.5 text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-zinc-800/80 transition-colors cursor-pointer"
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
                    : activeTab.toUpperCase()}
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
                      {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="hidden sm:inline font-semibold text-emerald-400">
                    {currentUser.email?.split('@')[0]}
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
                onClick={() => setIsDesktopNotificationOpen((prev) => !prev)}
                className={`p-2 border rounded-xl relative transition-all cursor-pointer ${
                  isDesktopNotificationOpen
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
                onClick={() => setActiveTab('payouts')}
                className="hidden sm:flex px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 rounded-lg text-xs font-bold font-mono items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{wallet?.unclaimedTokens ?? 0} REWARD</span>
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
        ) : (
          <main className="flex-1 min-h-0 p-3 sm:p-5 space-y-4 max-w-7xl w-full mx-auto overflow-y-auto">
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
            <DesktopWithdrawalView
              currentUser={currentUser}
              userProfile={userProfile}
              wallet={wallet}
              onUpdateWallet={setWallet}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          ) : activeTab === 'notifications' ? (
            <NotificationCenterView
              currentUser={currentUser}
              onClose={() => setActiveTab('dashboard')}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onUnreadCountChange={(count) => setUnreadNotificationCount(count)}
            />
          ) : activeTab === 'settings' ? (
            <DesktopSettingsView
              currentUser={currentUser}
              userProfile={userProfile}
              onUpdateProfile={(updated) => setUserProfile(updated)}
              onSignOut={handleSignOut}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          ) : activeTab === 'saved-tokens' || activeTab === 'my-saved-tokens' || activeTab === 'my-saved-list' ? (
            <MySavedTokensView
              userId={currentUser?.id}
              onBackToDonate={() => setActiveTab('add-token')}
              onNavigateAddToken={() => setActiveTab('add-token')}
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

      <WalletConnectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        wallet={wallet}
        onUpdateWallet={setWallet}
        userId={currentUser?.id}
      />

      {/* Floating Desktop Notification Popover Card */}
      <DesktopNotificationPopover
        currentUser={currentUser}
        isOpen={isDesktopNotificationOpen}
        onClose={() => setIsDesktopNotificationOpen(false)}
        onNavigateToTab={(tab) => {
          setActiveTab(tab);
          setIsDesktopNotificationOpen(false);
        }}
        onUnreadCountChange={(count) => setUnreadNotificationCount(count)}
      />

      {/* Floating Draggable Saved Tokens Circle Badge in Desktop / Tablet view */}
      {!isMobile && activeTab !== 'saved-tokens' && activeTab !== 'my-saved-tokens' && activeTab !== 'my-saved-list' && savedTokensCount > 0 && (
        <FloatingSavedTokensBadge
          count={savedTokensCount}
          onClick={() => setActiveTab('saved-tokens')}
        />
      )}

      <PWAInstallBanner />
    </div>
  );
}
