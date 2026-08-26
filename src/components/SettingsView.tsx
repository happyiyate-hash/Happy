import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  User,
  Camera,
  LogOut,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Mail,
  AtSign,
  Loader2,
  Upload,
  Moon,
  Globe,
  Wallet,
  Lock,
  Key,
  Bell,
  Coins,
  TrendingUp,
  HelpCircle,
  MessageSquare,
  FileText,
  ChevronRight,
  Pencil,
  X,
  Database,
  RefreshCw,
  Sparkles,
  Check,
  Copy,
  QrCode,
  KeyRound,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import {
  beginMFAEnrollment,
  verifyMFAEnrollment,
  getMFAStatus,
  disableMFA,
  getPendingMFAEnrollment,
  cancelMFAEnrollment,
  clearPendingMFAEnrollment,
} from '../lib/mfa';
import {
  SupabaseUserProfile,
  updateUserProfile,
  deleteUserAccount,
  saveUserWithdrawalAddress,
  getUserWithdrawalAddress,
  uploadAvatarToSupabaseStorage,
  getSupabase,
} from '../lib/supabase';
import { clearAllAppStorage } from '../services/storage';
import { useTranslation } from '../context/I18nContext';
import { useCurrency } from '../context/CurrencyContext';
import { HelpCenterView } from './HelpCenterView';
import { ContactSupportView } from './ContactSupportView';
import { TermsAndPrivacyView } from './TermsAndPrivacyView';

interface SettingsViewProps {
  currentUser?: any;
  userProfile?: SupabaseUserProfile | null;
  onUpdateProfile?: (profile: SupabaseUserProfile) => void;
  onSignOut?: () => void;
  handleSignOut?: () => void;
  apiKeys?: any;
  setApiKeys?: any;
  onNavigateTab?: (tab: string) => void;
  onOpenApiConsole?: () => void;
  initialSubView?: 'main' | 'help-center' | 'contact-support' | 'privacy-policy' | 'terms' | 'cookies' | 'preferences';
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  userProfile,
  onUpdateProfile,
  onSignOut,
  handleSignOut,
  onNavigateTab,
  onOpenApiConsole,
  initialSubView = 'main',
}) => {
  const signOutHandler = onSignOut || handleSignOut;

  // Active SubView state for Help Center, Contact Support, and Terms & Privacy
  const [subView, setSubView] = useState<'main' | 'help-center' | 'contact-support' | 'privacy-policy' | 'terms' | 'cookies' | 'preferences'>(initialSubView);

  const [username, setUsername] = useState(
    userProfile?.username || currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || ''
  );
  const [displayName, setDisplayName] = useState(
    userProfile?.display_name || currentUser?.user_metadata?.full_name || ''
  );
  const [avatarUrl, setAvatarUrl] = useState(
    userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || ''
  );

  const [darkModeEnabled, setDarkModeEnabled] = useState(true);
  
  // Offline-first i18n and Currency conversion context
  const { t, language, setLanguage, supportedLanguages, currentLanguageMeta } = useTranslation();
  const { currency, setCurrency, supportedCurrencies, activeCurrency } = useCurrency();

  // Saved Address State
  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressMessage, setAddressMessage] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Clean Storage State
  const [isClearingStorage, setIsClearingStorage] = useState(false);
  const [storageCleanMessage, setStorageCleanMessage] = useState<string | null>(null);

  // MFA / 2FA State
  const [mfaStatus, setMfaStatus] = useState<{
    enabled: boolean;
    hasPending: boolean;
    factorId?: string;
    pendingFactorId?: string;
  }>({ enabled: false, hasPending: false });
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaEnrollData, setMfaEnrollData] = useState<{ factorId: string; qrCode: string; secret: string; uri: string } | null>(null);
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState<string | null>(null);
  const [mfaCodeInput, setMfaCodeInput] = useState('');
  const [isMfaLoading, setIsMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccessMsg, setMfaSuccessMsg] = useState<string | null>(null);
  const [copiedMfaSecret, setCopiedMfaSecret] = useState(false);
  const [showDisableOptions, setShowDisableOptions] = useState(false);

  // Edit Profile Modal / Drawer state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Change Password State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Notifications State
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [securityNotifs, setSecurityNotifs] = useState(true);
  const [notifSuccessMsg, setNotifSuccessMsg] = useState<string | null>(null);

  // Verification & Preference Modals State
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const email = currentUser?.email || userProfile?.email || '';
  const userId = currentUser?.id || userProfile?.id || '';

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccessMsg(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccessMsg('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Send Password Reset Email Handler
  const handleSendResetEmail = async () => {
    setPasswordError(null);
    setPasswordSuccessMsg(null);
    if (!email) {
      setPasswordError('No email associated with this account.');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccessMsg(`Password reset link sent to ${email}. Check your inbox!`);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to send reset email.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Load MFA status
  const loadMfaStatus = async () => {
    try {
      const status = await getMFAStatus();
      const savedPending = getPendingMFAEnrollment();

      if (status.enabled && status.verifiedFactors.length > 0) {
        setMfaStatus({
          enabled: true,
          hasPending: false,
          factorId: status.verifiedFactors[0].id,
        });
      } else if (status.hasPending && status.unverifiedFactors.length > 0) {
        setMfaStatus({
          enabled: false,
          hasPending: true,
          pendingFactorId: status.unverifiedFactors[0].id,
        });
        if (savedPending) {
          setMfaEnrollData(savedPending);
        }
      } else {
        setMfaStatus({ enabled: false, hasPending: false });
      }
    } catch (e) {
      console.warn('[SettingsView] MFA status check note:', e);
    }
  };

  // Dynamically generate crisp PNG QR code whenever mfaEnrollData changes
  useEffect(() => {
    if (mfaEnrollData) {
      const totpUri =
        mfaEnrollData.uri ||
        `otpauth://totp/TokenCare:${encodeURIComponent(email || 'User')}?secret=${mfaEnrollData.secret}&issuer=TokenCare`;

      QRCode.toDataURL(totpUri, {
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url) => {
          setGeneratedQrDataUrl(url);
        })
        .catch((err) => {
          console.warn('[SettingsView] QRCode.toDataURL failed, fallback to raw qrCode:', err);
          setGeneratedQrDataUrl(null);
        });
    } else {
      setGeneratedQrDataUrl(null);
    }
  }, [mfaEnrollData, email]);

  // Load saved withdrawal address & MFA status on mount
  useEffect(() => {
    if (userId) {
      getUserWithdrawalAddress(userId).then((addr) => {
        if (addr) {
          setSavedAddress(addr);
          setAddressInput(addr);
        }
      });
      loadMfaStatus();
    }
  }, [userId]);

  const handleStartMfaEnrollment = async (forceReset = false) => {
    setIsMfaLoading(true);
    setMfaError(null);
    try {
      const setup = await beginMFAEnrollment(forceReset);
      setMfaEnrollData(setup);
      setMfaStatus((prev) => ({ ...prev, hasPending: true, pendingFactorId: setup.factorId }));
    } catch (err: any) {
      setMfaError(err.message || 'Failed to start MFA enrollment.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleResetMfaEnrollment = async () => {
    if (mfaEnrollData?.factorId) {
      setIsMfaLoading(true);
      await cancelMFAEnrollment(mfaEnrollData.factorId);
    }
    setMfaEnrollData(null);
    setMfaCodeInput('');
    await handleStartMfaEnrollment(true);
  };

  const handleVerifyMfaEnrollment = async () => {
    if (!mfaEnrollData?.factorId || !mfaCodeInput.trim()) return;
    setIsMfaLoading(true);
    setMfaError(null);
    try {
      await verifyMFAEnrollment(mfaEnrollData.factorId, mfaCodeInput.trim());
      setMfaSuccessMsg('Two-Factor Authentication (2FA) enabled successfully!');
      setMfaEnrollData(null);
      setMfaCodeInput('');
      await loadMfaStatus();
    } catch (err: any) {
      setMfaError(err.message || 'Invalid authenticator code. Please check your app and try again.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!mfaStatus.factorId) return;
    setIsMfaLoading(true);
    setMfaError(null);
    try {
      await disableMFA(mfaStatus.factorId);
      setMfaSuccessMsg('Two-Factor Authentication disabled successfully.');
      setMfaCodeInput('');
      await loadMfaStatus();
    } catch (err: any) {
      setMfaError(err.message || 'Failed to disable 2FA. Make sure you verified your code.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleCleanStorage = async () => {
    setIsClearingStorage(true);
    setStorageCleanMessage(null);
    clearAllAppStorage();
    setTimeout(() => {
      setIsClearingStorage(false);
      setStorageCleanMessage('Storage cache cleared! Database synchronized.');
      setTimeout(() => setStorageCleanMessage(null), 3000);
    }, 500);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(null);
    setAddressMessage(null);

    const clean = addressInput.trim();
    if (!clean || !/^0x[a-fA-F0-9]{40}$/.test(clean)) {
      setAddressError('Please enter a valid EVM wallet address (0x followed by 40 hex characters).');
      return;
    }

    setIsSavingAddress(true);
    try {
      const res = await saveUserWithdrawalAddress(userId, clean);
      if (res.success && res.address) {
        setSavedAddress(res.address);
        if (userProfile && onUpdateProfile) {
          onUpdateProfile({
            ...userProfile,
            wallet_address: res.address,
          });
        }
        setAddressMessage('✓ Verified on Polygon Blockchain & saved to address table!');
        setTimeout(() => {
          setShowAddressModal(false);
          setAddressMessage(null);
        }, 1500);
      } else {
        setAddressError(res.error || 'Failed to save address.');
      }
    } catch (err: any) {
      setAddressError(err.message || 'An error occurred while saving address.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Synchronize state when userProfile or currentUser updates
  useEffect(() => {
    if (userProfile) {
      if (userProfile.username) setUsername(userProfile.username);
      if (userProfile.display_name) setDisplayName(userProfile.display_name);
      if (userProfile.avatar_url !== undefined) setAvatarUrl(userProfile.avatar_url);
    } else if (currentUser) {
      if (currentUser.user_metadata?.username) setUsername(currentUser.user_metadata.username);
      if (currentUser.user_metadata?.full_name) setDisplayName(currentUser.user_metadata.full_name);
      if (currentUser.user_metadata?.avatar_url) setAvatarUrl(currentUser.user_metadata.avatar_url);
    }
  }, [userProfile, currentUser]);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Avatar File Upload Handler (Supabase Storage 'avatars' Bucket Flow)
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Profile image file size must be under 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage(null);

    try {
      const res = await uploadAvatarToSupabaseStorage(userId, file);
      if (res.success && res.publicUrl) {
        setAvatarUrl(res.publicUrl);
        // Automatically save to profile
        if (userId && userId !== 'anon-user-id') {
          const updateRes = await updateUserProfile(
            userId,
            {
              username,
              display_name: displayName,
              avatar_url: res.publicUrl,
            },
            currentUser
          );
          if (updateRes.success && updateRes.profile && onUpdateProfile) {
            onUpdateProfile(updateRes.profile);
          }
        }
      } else {
        setErrorMessage(res.error || 'Failed to upload photo to Supabase Storage avatars bucket.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Avatar upload error.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Save Profile Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    setIsSaving(true);
    try {
      if (userId && userId !== 'anon-user-id') {
        const result = await updateUserProfile(
          userId,
          {
            username,
            display_name: displayName,
            avatar_url: avatarUrl,
          },
          currentUser
        );

        if (result.success && result.profile && onUpdateProfile) {
          onUpdateProfile(result.profile);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowEditProfile(false);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Account Handler
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await deleteUserAccount();
      if (res.success && signOutHandler) {
        signOutHandler();
      } else {
        setErrorMessage(res.error || 'Failed to delete user account.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while deleting account.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  // Render SubViews directly if activated
  if (subView === 'help-center') {
    return (
      <HelpCenterView
        onBack={() => setSubView('main')}
        onNavigateContactSupport={() => setSubView('contact-support')}
      />
    );
  }

  if (subView === 'contact-support') {
    return (
      <ContactSupportView
        onBack={() => setSubView('main')}
        onNavigateHelpCenter={() => setSubView('help-center')}
        currentUser={currentUser}
      />
    );
  }

  if (subView === 'privacy-policy' || subView === 'terms' || subView === 'cookies' || subView === 'preferences') {
    return (
      <TermsAndPrivacyView
        onBack={() => setSubView('main')}
        onNavigateContactSupport={() => setSubView('contact-support')}
        initialTab={subView === 'preferences' ? 'preferences' : subView === 'terms' ? 'terms' : subView === 'cookies' ? 'cookies' : 'privacy'}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden text-white font-sans animate-in fade-in duration-200">
      {/* FIXED TOP NAVIGATION HEADER FOR SETTINGS PAGE */}
      <header className="shrink-0 z-40 bg-[#090C12] backdrop-blur-xl border-b border-emerald-500/30 rounded-b-2xl p-2.5 pt-safe-nav shadow-[0_4px_25px_rgba(0,0,0,0.7)] max-w-md mx-auto w-full transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {/* Avatar circle with online green status badge */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-[#22C55E]/60 overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] flex items-center justify-center text-black font-extrabold text-xs">
                    {String(displayName || username || 'W').slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Green Online Badge */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#22C55E] border-2 border-[#090C12] rounded-full shadow-[0_0_6px_rgba(34,197,94,0.8)]"></span>
            </div>

            {/* User Info */}
            <div className="space-y-0.2 min-w-0">
              <div className="flex items-center space-x-1.5">
                <h2 className="text-xs font-bold text-white tracking-tight truncate">
                  {displayName || username || 'Wisdom'}
                </h2>
                <span
                  onClick={() => setShowVerificationModal(true)}
                  className="inline-flex items-center space-x-0.5 text-[8px] font-bold text-[#4ADE80] bg-[#22C55E]/15 border border-[#22C55E]/40 px-1.5 py-0.2 rounded-full font-mono shrink-0 cursor-pointer hover:bg-[#22C55E]/25 transition-colors"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 text-[#22C55E] fill-[#22C55E]/20" />
                  <span>{t('settings.verified', 'Verified')}</span>
                </span>
              </div>
              <div className="text-[9.5px] text-zinc-400 font-mono truncate max-w-[170px]">
                {email}
              </div>
            </div>
          </div>

          {/* Right Green Outline Edit Profile Button */}
          <button
            type="button"
            onClick={() => setShowEditProfile(true)}
            className="px-2.5 py-1.5 bg-[#22C55E]/15 hover:bg-[#22C55E]/25 border border-[#22C55E]/40 text-[#4ADE80] text-[10px] font-bold rounded-xl flex items-center space-x-1 transition-all cursor-pointer shrink-0 active:scale-95 shadow-[0_2px_10px_rgba(34,197,94,0.15)]"
          >
            <Pencil className="w-3 h-3 text-[#4ADE80]" />
            <span>{t('settings.editProfile', 'Edit Profile')}</span>
          </button>
        </div>
      </header>

      {/* BODY CONTENT BELOW HEADER */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 py-3 space-y-3 pb-36 max-w-md mx-auto w-full"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* 1. Subtitle */}
        <div className="text-center pt-1">
          <p className="text-[10.5px] text-zinc-400 font-normal">
            {t('settings.manageAccountPreferences', 'Manage your account and preferences')}
          </p>
        </div>

      {/* 3. Section: APPEARANCE */}
      <div className="space-y-1">
        <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 px-1">
          {t('settings.appearance', 'APPEARANCE')}
        </div>
        <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden shadow-sm">
          {/* Dark Mode */}
          <div
            onClick={() => setDarkModeEnabled(!darkModeEnabled)}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Moon className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {t('settings.darkMode', 'Dark Mode')}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-emerald-400 font-medium">{t('common.enabled', 'Enabled')}</span>
              {/* Green Toggle Switch */}
              <div className="w-8 h-4.5 bg-[#22C55E] rounded-full p-0.5 transition-colors flex items-center justify-end shadow-sm">
                <div className="w-3.5 h-3.5 bg-white rounded-full shadow-md"></div>
              </div>
            </div>
          </div>

          {/* Language */}
          <div
            onClick={() => setShowLanguageModal(true)}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Globe className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {t('settings.language', 'Language')}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] text-zinc-300 font-medium flex items-center space-x-1">
                <span>{currentLanguageMeta.flag}</span>
                <span>{currentLanguageMeta.nativeName}</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Section: WALLET & SECURITY */}
      <div className="space-y-1">
        <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 px-1">
          {t('settings.walletSecurity', 'WALLET & SECURITY')}
        </div>
        <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden shadow-sm">
          {/* Saved Wallet Address (Polygon Payout Destination) */}
          <div
            onClick={() => setShowAddressModal(true)}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Wallet className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                  {t('settings.savedAddress', 'Saved Payout Wallet Address')}
                  {savedAddress && (
                    <span className="text-[8.5px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                      {t('settings.polygonVerified', 'Polygon Verified')}
                    </span>
                  )}
                </div>
                <div className="text-[9.5px] text-zinc-400 font-mono truncate max-w-[200px]">
                  {savedAddress ? `${String(savedAddress).slice(0, 8)}...${String(savedAddress).slice(-6)}` : t('settings.clickToAddAddress', 'Click to add single Polygon address')}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
            </div>
          </div>

          {/* Change Password */}
          <div
            onClick={() => {
              setShowChangePasswordModal(true);
              setPasswordError(null);
              setPasswordSuccessMsg(null);
            }}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Lock className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {t('settings.changePassword', 'Change Password')}
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  {t('settings.updatePasswordDesc', 'Update your account password')}
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>

          {/* Two-Factor Authentication (2FA) */}
          <div
            onClick={() => {
              if (onNavigateTab) {
                onNavigateTab('mfa');
              } else {
                setShowMfaModal(true);
                setMfaError(null);
                setMfaSuccessMsg(null);
                setMfaCodeInput('');
              }
            }}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Shield className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {t('settings.twoFactor', 'Two-Factor Authentication (2FA)')}
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  {t('settings.twoFactorDesc', 'TOTP authenticator app protection')}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {mfaStatus.enabled ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[#00E575] text-[10px] font-bold flex items-center gap-1 shadow-sm">
                  <ShieldCheck className="w-2.5 h-2.5 text-[#00E575]" /> {t('settings.protected', 'Protected')}
                </span>
              ) : mfaStatus.hasPending ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                  <KeyRound className="w-2.5 h-2.5 text-amber-400" /> {t('settings.setupPending', 'Setup Pending')}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-500 font-medium px-1.5 py-0.5 bg-zinc-900 rounded-full border border-zinc-800">{t('settings.off', 'Off')}</span>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
            </div>
          </div>

          {/* Developer API */}
          <div
            id="developer-api-settings-btn"
            onClick={() => {
              if (onNavigateTab) {
                onNavigateTab('developer');
              } else if (onOpenApiConsole) {
                onOpenApiConsole();
              }
            }}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Code2 className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                  Developer API
                  <span className="text-[8.5px] bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/40 px-1.5 py-0.2 rounded font-mono font-bold">
                    Console
                  </span>
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  Manage projects, generate API keys, RPC endpoints & limits
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>
        </div>
      </div>

      {/* 5. Section: PREFERENCES & STORAGE */}
      <div className="space-y-1">
        <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 px-1">
          {t('settings.preferencesAndStorage', 'PREFERENCES & SYSTEM CACHE')}
        </div>
        <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden shadow-sm">
          {/* Clean Storage Button */}
          <div
            onClick={handleCleanStorage}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Database className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                  {t('settings.clearStorage', 'Clear Storage')}
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  {t('settings.clearStorageDesc', 'Wipe cached items & fetch fresh database records')}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isClearingStorage}
              className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[10px] font-bold rounded-xl flex items-center space-x-1 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              {isClearingStorage ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                  <span>{t('settings.clearing', 'Clearing...')}</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3 h-3 text-amber-400" />
                  <span>{t('settings.cleanStorageBtn', 'Clean Storage')}</span>
                </>
              )}
            </button>
          </div>

          {storageCleanMessage && (
            <div className="bg-emerald-500/15 border-t border-emerald-500/30 p-2 px-3 text-[10.5px] font-semibold text-emerald-300 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{storageCleanMessage}</span>
            </div>
          )}

          {/* Notifications */}
          <div
            onClick={() => {
              setShowNotificationsModal(true);
              setNotifSuccessMsg(null);
            }}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Bell className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {t('settings.notifications', 'Notifications')}
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  {t('settings.notificationsDesc', 'Manage your notification preferences')}
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>

          {/* Currency Display */}
          <div
            onClick={() => setShowCurrencyModal(true)}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Coins className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {t('settings.currencyDisplay', 'Currency Display')}
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  {t('settings.currencyDisplayDesc', 'Select your preferred fiat currency')}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-[9.5px] font-bold text-emerald-400 border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 rounded-md font-mono flex items-center space-x-1">
                <span>{activeCurrency.flag}</span>
                <span>{activeCurrency.symbol}</span>
                <span>{currency}</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
            </div>
          </div>

          {/* Data & Analytics */}
          <div
            onClick={() => {
              if (onNavigateTab) {
                onNavigateTab('preferences');
              } else {
                setSubView('preferences');
              }
            }}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {t('settings.dataAnalytics', 'Data & Analytics')}
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  {t('settings.dataAnalyticsDesc', 'Manage analytics and data sharing')}
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>
        </div>
      </div>

      {/* 6. Section: SUPPORT */}
      <div className="space-y-1">
        <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 px-1">
          {t('settings.support', 'SUPPORT')}
        </div>
        <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden shadow-sm">
          {/* Help Center */}
          <div
            onClick={() => {
              if (onNavigateTab) {
                onNavigateTab('help-center');
              } else {
                setSubView('help-center');
              }
            }}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <HelpCircle className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {t('settings.helpCenter', 'Help Center')}
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  {t('settings.helpCenterDesc', 'Get help and find answers')}
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>

          {/* Contact Support */}
          <div
            onClick={() => {
              if (onNavigateTab) {
                onNavigateTab('contact-support');
              } else {
                setSubView('contact-support');
              }
            }}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <MessageSquare className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {t('settings.contactSupport', 'Contact Support')}
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  {t('settings.contactSupportDesc', 'Reach out to our support team')}
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>

          {/* Terms & Privacy */}
          <div
            onClick={() => {
              if (onNavigateTab) {
                onNavigateTab('terms-privacy');
              } else {
                setSubView('privacy-policy');
              }
            }}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <FileText className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {t('settings.termsAndPrivacy', 'Terms & Privacy')}
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  {t('settings.termsAndPrivacyDesc', 'Read our terms and privacy policy')}
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>
        </div>
      </div>

      {/* 7. Section: ACCOUNT / ACCPORT (Log Out) */}
      <div className="space-y-1">
        <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 px-1">
          {t('settings.account', 'ACCOUNT')}
        </div>
        <div
          onClick={() => signOutHandler && signOutHandler()}
          className="bg-[#1A0A0F]/70 border border-rose-950/70 rounded-2xl p-2.5 flex items-center justify-between hover:bg-rose-950/40 transition-colors cursor-pointer group shadow-sm"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div>
              <div className="text-[11.5px] font-bold text-rose-400 group-hover:text-rose-300 transition-colors">
                {t('settings.logOut', 'Log Out')}
              </div>
              <div className="text-[9.5px] text-zinc-400 font-normal">
                {t('settings.logOutDesc', 'Sign out from your account')}
              </div>
            </div>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-rose-500/70 group-hover:text-rose-400 shrink-0" />
        </div>
      </div>

      {/* Footer text */}
      <div className="text-[9px] text-zinc-600 font-mono text-center pt-2">
        {t('settings.versionFooter', 'TokenCare Security Dashboard v1.0.0')}
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in">
          {/* Hidden file input for Avatar upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="bg-[#0B0E17] border border-zinc-800 rounded-2xl p-4 max-w-sm w-full space-y-3.5 shadow-2xl relative">
            {/* Close Button */}
            <button
              onClick={() => setShowEditProfile(false)}
              className="absolute top-3 right-3 p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-400" />
                {t('settings.editProfile', 'Edit Profile')}
              </h3>
              <p className="text-[10.5px] text-zinc-400">
                {t('settings.editProfileDesc', 'Update your avatar, username, and public profile details.')}
              </p>
            </div>

            {/* Success / Error Banners */}
            {saveSuccess && (
              <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-2 text-emerald-300 text-[10.5px] font-semibold flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{t('settings.profileUpdated', 'Profile updated successfully!')}</span>
              </div>
            )}
            {errorMessage && (
              <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-2 text-rose-300 text-[10.5px] font-semibold flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3">
              {/* Avatar Upload Box */}
              <div className="bg-[#06080E] border border-zinc-800/80 rounded-xl p-2.5 flex items-center space-x-3">
                <div className="relative group shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-emerald-500/40 bg-zinc-900 flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-xs text-emerald-400 font-mono">
                        {String(displayName || username || 'W').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-[10px] text-zinc-400">Profile Image</div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-medium rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3 h-3 text-emerald-400" />
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>

              {/* Display Name Input */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-zinc-300">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Wisdom"
                  className="w-full bg-[#06080E] border border-zinc-800 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Username Input */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-zinc-300">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full bg-[#06080E] border border-zinc-800 text-white font-mono text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Email (Readonly) */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-zinc-300">Email Address</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-zinc-950 border border-zinc-800/60 text-zinc-400 font-mono text-xs rounded-xl px-2.5 py-1.5 cursor-not-allowed opacity-80"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-semibold rounded-xl flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  <span>Delete</span>
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] hover:from-[#16A34A] hover:to-[#4ADE80] text-black font-black text-xs rounded-xl flex items-center space-x-1 cursor-pointer shadow-[0_4px_16px_rgba(34,197,94,0.4)] transition-all"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-black" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAVED PAYOUT WALLET ADDRESS MODAL */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-[#0B0E17] border border-zinc-800 rounded-2xl p-4 max-w-sm w-full space-y-3.5 shadow-2xl relative">
            <button
              onClick={() => setShowAddressModal(false)}
              className="absolute top-3 right-3 p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-[#4ADE80]" />
                Single Saved Payout Address
              </h3>
              <p className="text-[10.5px] text-zinc-400">
                Save your primary EVM address on the Polygon network. It will be verified via public RPC and automatically used for future withdrawal requests.
              </p>
            </div>

            {/* Notification messages */}
            {addressMessage && (
              <div className="bg-[#22C55E]/15 border border-[#22C55E]/40 rounded-xl p-2 text-[#4ADE80] text-[10.5px] font-semibold flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                <span>{addressMessage}</span>
              </div>
            )}
            {addressError && (
              <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-2 text-rose-300 text-[10.5px] font-semibold flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{addressError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-zinc-300 flex items-center justify-between">
                  <span>Polygon Wallet Address (0x...)</span>
                  <span className="text-[9px] text-[#4ADE80] font-mono">Polygon RPC Verified</span>
                </label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                  className="w-full bg-[#06080E] border border-zinc-800 text-white font-mono text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#22C55E] transition-colors"
                />
                <p className="text-[9.5px] text-zinc-500">
                  Only one address is stored at a time in the database address table for automated withdrawals.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="px-4 py-1.5 bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] hover:from-[#16A34A] hover:to-[#4ADE80] text-black font-black text-xs rounded-xl flex items-center space-x-1 cursor-pointer shadow-[0_4px_16px_rgba(34,197,94,0.4)] transition-all"
                >
                  {isSavingAddress ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Verifying on Polygon...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-black" />
                      <span>Verify & Save Address</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0B0E17] border border-rose-500/40 rounded-2xl p-4 max-w-xs w-full space-y-3 shadow-2xl">
            <div className="flex items-center space-x-2.5 text-rose-400">
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Delete Account?</h3>
                <p className="text-[10px] text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-[10.5px] text-zinc-300 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
              Are you sure you want to delete your TokenCare account?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TWO-FACTOR AUTHENTICATION (2FA / MFA) MODAL */}
      {showMfaModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-[#0B0E17] border border-zinc-800/90 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-[0_16px_48px_rgba(0,0,0,0.8)] relative max-h-[92vh] overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-[#0B0E17] to-[#0B0E17]">
            <button
              onClick={() => {
                setShowMfaModal(false);
                setMfaEnrollData(null);
                setMfaError(null);
                setMfaSuccessMsg(null);
                setMfaCodeInput('');
                setShowDisableOptions(false);
              }}
              className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer bg-zinc-900/60 border border-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pr-6">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#0E2E21] border border-[#00E575]/30 flex items-center justify-center text-[#00E575] shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00E575]" />
                </div>
                <span>Two-Factor Authentication</span>
              </h3>
              <p className="text-[10.5px] text-zinc-400 leading-relaxed">
                TOTP authenticator protection for your TokenCare account.
              </p>
            </div>

            {/* Notification messages */}
            {mfaSuccessMsg && (
              <div className="bg-[#0E2E21]/80 border border-[#00E575]/40 rounded-2xl p-3 text-[#00E575] text-[11px] font-semibold flex items-center space-x-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-[#00E575] shrink-0" />
                <span>{mfaSuccessMsg}</span>
              </div>
            )}
            {mfaError && (
              <div className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-3 text-rose-300 text-[11px] font-semibold flex items-center space-x-2 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{mfaError}</span>
              </div>
            )}

            {/* IF 2FA IS NOT ENABLED AND NO ENROLLMENT IN PROGRESS */}
            {!mfaStatus.enabled && !mfaEnrollData && (
              <div className="space-y-4 pt-1">
                <div className="bg-[#06080E]/90 border border-zinc-800/80 rounded-2xl p-4 space-y-2.5 text-center shadow-inner">
                  <div className="w-12 h-12 rounded-full bg-[#0E2E21] border border-emerald-500/30 flex items-center justify-center text-[#00E575] mx-auto shadow-sm">
                    <KeyRound className="w-6 h-6 text-[#00E575]" />
                  </div>
                  <div className="text-xs font-black text-white">Enable Authenticator 2FA</div>
                  <p className="text-[10.5px] text-zinc-400 leading-relaxed">
                    Require a 6-digit security code generated by Google Authenticator or Authy whenever logging in to keep your token wallet safe.
                  </p>
                </div>

                <button
                  onClick={() => handleStartMfaEnrollment(false)}
                  disabled={isMfaLoading}
                  className="w-full py-3 bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] hover:from-[#16A34A] hover:to-[#4ADE80] text-black font-extrabold text-xs rounded-2xl flex items-center justify-center space-x-2 cursor-pointer shadow-[0_4px_20px_rgba(34,197,94,0.35)] transition-all"
                >
                  {isMfaLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Generating QR Code...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 text-black" />
                      <span>Enable 2FA Now</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* IF 2FA ENROLLMENT IS IN PROGRESS (DISPLAY QR CODE & SECRET) */}
            {!mfaStatus.enabled && mfaEnrollData && (
              <div className="space-y-3.5 pt-1">
                <div className="bg-[#06080E]/90 border border-zinc-800/90 rounded-2xl p-3.5 text-center space-y-3">
                  <div className="text-[11.5px] font-extrabold text-zinc-200 flex items-center justify-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-[#00E575] text-[10px] font-bold flex items-center justify-center">1</span>
                    <span>Scan QR Code with Authenticator App</span>
                  </div>
                  
                  {/* QR Code Container */}
                  <div className="bg-white p-3 rounded-2xl border-2 border-emerald-500/40 shadow-[0_0_24px_rgba(0,229,117,0.15)] w-52 h-52 mx-auto flex items-center justify-center overflow-hidden">
                    {generatedQrDataUrl ? (
                      <img
                        src={generatedQrDataUrl}
                        alt="Scan this QR code with your authenticator app"
                        className="w-full h-full object-contain"
                      />
                    ) : mfaEnrollData.qrCode && mfaEnrollData.qrCode.startsWith('<svg') ? (
                      <div
                        className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                        dangerouslySetInnerHTML={{ __html: mfaEnrollData.qrCode }}
                      />
                    ) : mfaEnrollData.qrCode && mfaEnrollData.qrCode.startsWith('data:') ? (
                      <img
                        src={mfaEnrollData.qrCode}
                        alt="Scan this QR code with your authenticator app"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-zinc-600 text-[10.5px] font-bold text-center p-2 flex flex-col items-center justify-center gap-1.5">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                        <span>Generating QR Code...</span>
                      </div>
                    )}
                  </div>

                  {/* Manual Secret Key */}
                  <div className="space-y-1.5 text-center pt-2 border-t border-zinc-800/80">
                    <div className="text-[10px] text-zinc-400 font-medium">Can't scan? Copy setup key manually:</div>
                    <div className="flex items-center justify-between gap-2 bg-[#080A10] px-3 py-2 rounded-xl border border-zinc-800">
                      <code className="text-emerald-400 font-mono text-[11px] font-bold tracking-wider select-all break-all">
                        {mfaEnrollData.secret}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(mfaEnrollData.secret);
                          setCopiedMfaSecret(true);
                          setTimeout(() => setCopiedMfaSecret(false), 2000);
                        }}
                        className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                        title="Copy secret key"
                      >
                        {copiedMfaSecret ? (
                          <Check className="w-3.5 h-3.5 text-[#00E575]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 2: Verification Code Input */}
                <div className="space-y-2">
                  <div className="text-[11.5px] font-extrabold text-zinc-200 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-[#00E575] text-[10px] font-bold flex items-center justify-center">2</span>
                    <span>Enter 6-Digit Code</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={mfaCodeInput}
                    onChange={(e) => setMfaCodeInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-[#06080E] border border-zinc-800 text-white font-mono text-center text-lg tracking-[0.3em] font-black rounded-2xl py-2.5 focus:outline-none focus:border-[#00E575] focus:ring-1 focus:ring-[#00E575]/50 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={handleResetMfaEnrollment}
                    disabled={isMfaLoading}
                    className="text-[10px] text-zinc-400 hover:text-rose-300 underline flex items-center gap-1 cursor-pointer transition-colors"
                    title="Generate a new QR code"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset QR Code</span>
                  </button>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowMfaModal(false)}
                      className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyMfaEnrollment}
                      disabled={isMfaLoading || mfaCodeInput.length < 6}
                      className="px-4 py-2 bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] hover:from-[#16A34A] hover:to-[#4ADE80] text-black font-extrabold text-xs rounded-xl flex items-center space-x-1 cursor-pointer shadow-[0_4px_16px_rgba(34,197,94,0.35)] transition-all disabled:opacity-50"
                    >
                      {isMfaLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 text-black" />
                          <span>Verify & Enable</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* IF 2FA IS ALREADY ENABLED */}
            {mfaStatus.enabled && (
              <div className="space-y-4 pt-1">
                <div className="bg-gradient-to-b from-[#0E2E21] to-[#081F16] border border-[#00E575]/35 rounded-2xl p-4 text-center space-y-2.5 shadow-lg shadow-emerald-950/40">
                  <div className="w-12 h-12 rounded-full bg-[#00E575]/15 border border-[#00E575]/40 flex items-center justify-center text-[#00E575] mx-auto shadow-inner">
                    <ShieldCheck className="w-6 h-6 text-[#00E575]" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white flex items-center justify-center gap-1.5">
                      Two-Factor Authentication Active
                      <span className="w-2 h-2 rounded-full bg-[#00E575] animate-pulse" />
                    </div>
                    <p className="text-[11px] text-emerald-200/80 mt-1 leading-relaxed">
                      Your TokenCare account is protected with Google Authenticator / Authy TOTP.
                    </p>
                  </div>

                  <div className="bg-[#0B0E17]/80 rounded-xl p-2.5 border border-emerald-500/20 text-left space-y-1.5 text-[10.5px]">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Security Status:</span>
                      <span className="text-[#00E575] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Protected
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Method:</span>
                      <span className="text-white font-medium font-mono">TOTP Authenticator App</span>
                    </div>
                  </div>
                </div>

                {!showDisableOptions ? (
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDisableOptions(true)}
                      className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors underline cursor-pointer"
                    >
                      Disable 2FA
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMfaModal(false)}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-extrabold text-xs rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#080A10] border border-zinc-800 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in">
                    <div className="text-[11px] font-bold text-zinc-200 flex items-center justify-between">
                      <span>Disable 2FA Protection</span>
                      <button
                        type="button"
                        onClick={() => setShowDisableOptions(false)}
                        className="text-zinc-500 hover:text-zinc-300 text-[10px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Enter your current 6-digit authenticator code to confirm and disable 2FA protection on your account.
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={mfaCodeInput}
                      onChange={(e) => setMfaCodeInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-zinc-950 border border-zinc-800 text-white font-mono text-center text-sm tracking-[0.2em] font-bold rounded-xl py-2 focus:outline-none focus:border-rose-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleDisableMfa}
                      disabled={isMfaLoading || mfaCodeInput.length < 6}
                      className="w-full py-2 bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {isMfaLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Disabling 2FA...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Confirm & Disable 2FA</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. LANGUAGE SELECTION MODAL */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00E575]">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{t('settings.selectLanguage')}</h3>
                  <p className="text-[10px] text-zinc-400">Offline i18n localization dictionary</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLanguageModal(false)}
                className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 max-h-80 overflow-y-auto space-y-1.5">
              {supportedLanguages.map((langItem) => {
                const isSelected = language === langItem.code;
                return (
                  <button
                    key={langItem.code}
                    type="button"
                    onClick={() => {
                      setLanguage(langItem.code);
                      setShowLanguageModal(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-[0_0_15px_rgba(0,229,117,0.15)]'
                        : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl select-none">{langItem.flag}</span>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                          <span>{langItem.nativeName}</span>
                          <span className="text-[10px] font-mono text-zinc-500 font-normal">({langItem.name})</span>
                        </div>
                        <div className="text-[9px] text-zinc-400 font-mono uppercase tracking-wider">
                          Code: {langItem.code}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#00E575] flex items-center justify-center text-black shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-zinc-950/60 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
              <span>Saved to <code className="text-emerald-400">tokencare_language</code></span>
              <button
                type="button"
                onClick={() => setShowLanguageModal(false)}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium cursor-pointer transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. CURRENCY DISPLAY SELECTION MODAL */}
      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00E575]">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{t('settings.selectCurrency')}</h3>
                  <p className="text-[10px] text-zinc-400">Multi-currency exchange rate engine</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCurrencyModal(false)}
                className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 max-h-80 overflow-y-auto space-y-1.5">
              {supportedCurrencies.map((currItem) => {
                const isSelected = currency === currItem.code;
                return (
                  <button
                    key={currItem.code}
                    type="button"
                    onClick={() => {
                      setCurrency(currItem.code);
                      setShowCurrencyModal(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-[0_0_15px_rgba(0,229,117,0.15)]'
                        : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl select-none">{currItem.flag}</span>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                          <span>{currItem.name}</span>
                          <span className="text-[10.5px] font-mono text-emerald-400 font-bold">({currItem.code})</span>
                        </div>
                        <div className="text-[9.5px] text-zinc-400 font-mono">
                          Symbol: <strong className="text-white">{currItem.symbol}</strong> • Rate: 1 USD ≈ {currItem.rate} {currItem.code}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#00E575] flex items-center justify-center text-black shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-zinc-950/60 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
              <span>Saved to <code className="text-emerald-400">tokencare_preferences</code></span>
              <button
                type="button"
                onClick={() => setShowCurrencyModal(false)}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium cursor-pointer transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
