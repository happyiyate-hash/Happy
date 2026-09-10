import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  User,
  Camera,
  Shield,
  Key,
  Globe,
  Wallet,
  Database,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Save,
  Trash2,
  RefreshCw,
  LogOut,
  Sparkles,
  Check,
  Copy,
  Pencil,
  X,
  ExternalLink,
  ShieldCheck,
  Coins,
  TrendingUp,
  FileText,
  MessageSquare,
  Lock,
  QrCode,
  KeyRound,
  ChevronRight,
  Info,
  Zap,
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
} from '../lib/supabase';
import { clearAllAppStorage } from '../services/storage';
import { useTranslation } from '../context/I18nContext';
import { useCurrency } from '../context/CurrencyContext';

interface DesktopSettingsViewProps {
  currentUser?: any;
  userProfile?: SupabaseUserProfile | null;
  onUpdateProfile?: (profile: SupabaseUserProfile) => void;
  onSignOut?: () => void;
  onNavigateTab?: (tab: string) => void;
}

type DesktopSettingsTab =
  | 'profile'
  | 'security'
  | 'localization'
  | 'address'
  | 'storage'
  | 'support'
  | 'danger';

export const DesktopSettingsView: React.FC<DesktopSettingsViewProps> = ({
  currentUser,
  userProfile,
  onUpdateProfile,
  onSignOut,
  onNavigateTab,
}) => {
  const { t, language, setLanguage, supportedLanguages } = useTranslation();
  const { currency, setCurrency, supportedCurrencies, activeCurrency } = useCurrency();

  const [activeTab, setActiveTab] = useState<DesktopSettingsTab>('profile');

  // Profile Form States
  const [username, setUsername] = useState(
    userProfile?.username || currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || ''
  );
  const [displayName, setDisplayName] = useState(
    userProfile?.display_name || currentUser?.user_metadata?.full_name || ''
  );
  const [avatarUrl, setAvatarUrl] = useState(
    userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || ''
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Address States
  const [savedAddress, setSavedAddress] = useState<string>('');
  const [addressInput, setAddressInput] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressSuccessMsg, setAddressSuccessMsg] = useState<string | null>(null);
  const [addressErrorMsg, setAddressErrorMsg] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Security / MFA States
  const [mfaStatus, setMfaStatus] = useState<{
    enabled: boolean;
    hasPending: boolean;
    factorId?: string;
    pendingFactorId?: string;
  }>({ enabled: false, hasPending: false });
  const [mfaEnrollData, setMfaEnrollData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
    uri: string;
  } | null>(null);
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState<string | null>(null);
  const [mfaCodeInput, setMfaCodeInput] = useState('');
  const [isMfaLoading, setIsMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccessMsg, setMfaSuccessMsg] = useState<string | null>(null);
  const [copiedMfaSecret, setCopiedMfaSecret] = useState(false);

  // Storage / Diagnostics State
  const [isClearingStorage, setIsClearingStorage] = useState(false);
  const [storageCleanMessage, setStorageCleanMessage] = useState<string | null>(null);

  // Delete Account Confirmation
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const userId = currentUser?.id;
  const email = currentUser?.email || 'user@tokencare.io';

  // Load Saved Payout Address
  useEffect(() => {
    let isMounted = true;
    async function loadAddress() {
      if (!userId) return;
      setIsLoadingAddress(true);
      try {
        if (userProfile?.wallet_address && /^0x[a-fA-F0-9]{40}$/.test(userProfile.wallet_address.trim())) {
          if (isMounted) {
            setSavedAddress(userProfile.wallet_address.trim());
            setAddressInput(userProfile.wallet_address.trim());
          }
        } else {
          const addr = await getUserWithdrawalAddress(userId);
          if (isMounted && addr) {
            setSavedAddress(addr);
            setAddressInput(addr);
          }
        }
      } catch (e) {
        console.warn('Error loading withdrawal address:', e);
      } finally {
        if (isMounted) setIsLoadingAddress(false);
      }
    }
    loadAddress();
    return () => {
      isMounted = false;
    };
  }, [userId, userProfile]);

  // Load MFA Status
  useEffect(() => {
    async function loadMfa() {
      try {
        const st = await getMFAStatus();
        setMfaStatus(st);
      } catch (err) {
        console.warn('Error checking MFA status:', err);
      }
    }
    loadMfa();
  }, []);

  // Save Profile Handler
  const handleSaveProfile = async () => {
    if (!userId) return;
    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);
    try {
      const res = await updateUserProfile(userId, {
        username: username.trim(),
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim(),
      }, currentUser);
      if (res.success && res.profile) {
        setProfileSuccessMsg('Profile information updated successfully!');
        if (onUpdateProfile) onUpdateProfile(res.profile);
      } else {
        setProfileErrorMsg(res.error || 'Failed to update profile.');
      }
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'An error occurred while updating profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Avatar Upload Handler
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setIsUploadingAvatar(true);
    setProfileErrorMsg(null);
    try {
      const res = await uploadAvatarToSupabaseStorage(file, userId);
      if (res.success && res.publicUrl) {
        setAvatarUrl(res.publicUrl);
        setProfileSuccessMsg('Avatar image uploaded successfully! Press Save to apply.');
      } else {
        setProfileErrorMsg(res.error || 'Failed to upload avatar image.');
      }
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Error uploading avatar.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Save Payout Address Handler
  const handleSaveAddress = async () => {
    if (!addressInput || !/^0x[a-fA-F0-9]{40}$/.test(addressInput.trim())) {
      setAddressErrorMsg('Please enter a valid EVM polygon wallet address (0x followed by 40 hex characters).');
      return;
    }

    setIsSavingAddress(true);
    setAddressSuccessMsg(null);
    setAddressErrorMsg(null);
    try {
      const clean = addressInput.trim();
      const res = await saveUserWithdrawalAddress(userId, clean);
      if (res.success) {
        setSavedAddress(clean);
        setAddressSuccessMsg('Payout address successfully updated and verified in database.');
        if (userProfile && onUpdateProfile) {
          onUpdateProfile({ ...userProfile, wallet_address: clean });
        }
      } else {
        setAddressErrorMsg(res.error || 'Failed to save address.');
      }
    } catch (err: any) {
      setAddressErrorMsg(err.message || 'Error saving payout address.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Begin MFA Enrollment
  const handleStartMfaEnrollment = async () => {
    setIsMfaLoading(true);
    setMfaError(null);
    setMfaSuccessMsg(null);
    try {
      const res = await beginMFAEnrollment(true);
      if (res && res.factorId) {
        setMfaEnrollData(res);
        if (res.qrCode) {
          setGeneratedQrDataUrl(res.qrCode);
        } else if (res.uri) {
          const qrUrl = await QRCode.toDataURL(res.uri, {
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          setGeneratedQrDataUrl(qrUrl);
        }
      } else {
        setMfaError('Failed to start MFA enrollment.');
      }
    } catch (err: any) {
      setMfaError(err.message || 'Error during MFA enrollment.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  // Verify MFA Code
  const handleVerifyMfaCode = async () => {
    if (!mfaEnrollData?.factorId || mfaCodeInput.length !== 6) {
      setMfaError('Please enter a complete 6-digit authentication code.');
      return;
    }

    setIsMfaLoading(true);
    setMfaError(null);
    try {
      const verified = await verifyMFAEnrollment(mfaEnrollData.factorId, mfaCodeInput.trim());
      if (verified) {
        setMfaSuccessMsg('Two-Factor Authentication successfully activated!');
        setMfaStatus({ enabled: true, hasPending: false, factorId: mfaEnrollData.factorId });
        setMfaEnrollData(null);
        setGeneratedQrDataUrl(null);
        setMfaCodeInput('');
      } else {
        setMfaError('Invalid authentication code. Please try again.');
      }
    } catch (err: any) {
      setMfaError(err.message || 'Verification error.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  // Disable MFA
  const handleDisableMfa = async () => {
    if (!mfaStatus.factorId) return;
    if (!window.confirm('Are you sure you want to disable Two-Factor Authentication? Your account will have lower security protection.')) return;

    setIsMfaLoading(true);
    setMfaError(null);
    try {
      await disableMFA(mfaStatus.factorId);
      setMfaSuccessMsg('Two-Factor Authentication disabled.');
      setMfaStatus({ enabled: false, hasPending: false });
    } catch (err: any) {
      setMfaError(err.message || 'Error disabling 2FA.');
    } finally {
      setIsMfaLoading(false);
    }
  };

  // Clear Storage & Fresh Resync
  const handleClearCache = async () => {
    if (!window.confirm('This will purge local offline token cache and resync fresh state from Supabase. Continue?')) return;
    setIsClearingStorage(true);
    setStorageCleanMessage(null);
    try {
      clearAllAppStorage();
      setStorageCleanMessage('Local cache cleared! Re-syncing latest data.');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e: any) {
      setStorageCleanMessage('Cache cleared.');
    } finally {
      setIsClearingStorage(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteUserAccount();
      if (res.success && onSignOut) {
        onSignOut();
      } else {
        alert(res.error || 'Failed to delete account.');
      }
    } catch (e: any) {
      alert(e.message || 'Error deleting account.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const menuItems = [
    { id: 'profile' as const, label: 'Profile & Identity', icon: User, desc: 'Display name, username & avatar' },
    { id: 'security' as const, label: 'Security & 2FA', icon: ShieldCheck, desc: 'TOTP authenticator & password' },
    { id: 'localization' as const, label: 'Language & Currency', icon: Globe, desc: 'Multi-currency & localization' },
    { id: 'address' as const, label: 'Saved Payout Address', icon: Wallet, desc: 'Polygon EVM withdrawal destination' },
    { id: 'storage' as const, label: 'Storage & Diagnostics', icon: Database, desc: 'Offline storage & cache manager' },
    { id: 'support' as const, label: 'Support & Legal', icon: HelpCircle, desc: 'Help Center, chat & terms' },
    { id: 'danger' as const, label: 'Danger Zone', icon: AlertTriangle, desc: 'Account deletion & purge' },
  ];

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Top Profile Summary Header Card */}
      <div className="bg-[#0C0E17] border border-emerald-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-4 min-w-0">
          {/* Avatar with click-to-upload */}
          <div className="relative group shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border-2 border-emerald-500/50 overflow-hidden flex items-center justify-center shadow-lg">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-emerald-700 to-emerald-400 flex items-center justify-center text-black font-black text-xl">
                  {(displayName || username || 'U').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center text-white cursor-pointer"
              title="Change avatar"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-white truncate">
                {displayName || username || 'TokenCare User'}
              </h1>
              <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Verified Account</span>
              </span>
            </div>
            <div className="text-xs text-zinc-400 font-mono truncate">{email}</div>
            <div className="text-[11px] text-zinc-500 flex items-center space-x-2 pt-0.5">
              <span>Currency: <strong className="text-emerald-400">{currency}</strong></span>
              <span>•</span>
              <span>2FA: <strong className={mfaStatus.enabled ? 'text-emerald-400' : 'text-amber-400'}>{mfaStatus.enabled ? 'Enabled' : 'Disabled'}</strong></span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3 shrink-0">
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="px-4 py-2 bg-zinc-900 hover:bg-rose-950/40 text-zinc-300 hover:text-rose-300 border border-zinc-800 hover:border-rose-500/40 text-xs font-bold rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-md"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Settings 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Sidebar (4 Columns) */}
        <div className="lg:col-span-4 bg-[#0C0E17] border border-zinc-800/90 rounded-2xl p-3 shadow-lg space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Settings & Preferences
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isDanger = item.id === 'danger';

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-center space-x-3 cursor-pointer ${
                  isActive
                    ? isDanger
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-md font-bold'
                      : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-md font-bold'
                    : isDanger
                    ? 'text-rose-400/80 hover:bg-rose-950/30 hover:text-rose-300 border border-transparent'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80 border border-transparent'
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? (isDanger ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-400') : 'bg-zinc-900 text-zinc-400'}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold leading-tight">{item.label}</div>
                  <div className="text-[10.5px] text-zinc-500 truncate">{item.desc}</div>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-600'}`} />
              </button>
            );
          })}
        </div>

        {/* Right Active Content Panel (8 Columns) */}
        <div className="lg:col-span-8 bg-[#0C0E17] border border-zinc-800/90 rounded-2xl p-6 shadow-lg min-h-[500px]">
          {/* TAB 1: Profile & Identity */}
          {activeTab === 'profile' && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h2 className="text-base font-extrabold text-white">Profile & Identity</h2>
                <p className="text-xs text-zinc-400">Manage your public name, unique handle, and account details.</p>
              </div>

              {profileSuccessMsg && (
                <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-3 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrorMsg && (
                <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-3 text-rose-300 text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full bg-[#06080F] border border-zinc-700 focus:border-emerald-500 text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">Username / Handle</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-zinc-500 text-xs font-mono">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      className="w-full bg-[#06080F] border border-zinc-700 focus:border-emerald-500 text-white text-xs font-mono rounded-xl pl-8 pr-3.5 py-2.5 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">Email Address (Verified)</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-[#06080F]/60 border border-zinc-800 text-zinc-400 font-mono text-xs rounded-xl px-3.5 py-2.5 cursor-not-allowed"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile || isUploadingAvatar}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#16A34A] to-[#22C55E] hover:from-[#15803D] hover:to-[#16A34A] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-[0_4px_15px_rgba(34,197,94,0.4)] transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-black" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Security & 2FA */}
          {activeTab === 'security' && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h2 className="text-base font-extrabold text-white">Security & Two-Factor Authentication (2FA)</h2>
                <p className="text-xs text-zinc-400">Protect your account and withdrawal requests with time-based OTP codes (Google Authenticator, Authy).</p>
              </div>

              {mfaSuccessMsg && (
                <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-3 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{mfaSuccessMsg}</span>
                </div>
              )}

              {mfaError && (
                <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-3 text-rose-300 text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{mfaError}</span>
                </div>
              )}

              {/* Status Box */}
              <div className="bg-[#06080F] border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${mfaStatus.enabled ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      Status: {mfaStatus.enabled ? <span className="text-emerald-400">Active & Enrolled</span> : <span className="text-amber-400">Not Configured</span>}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {mfaStatus.enabled ? 'Your account is secured with TOTP 2-Factor Authentication.' : 'Add an extra layer of protection when signing in or withdrawing.'}
                    </div>
                  </div>
                </div>

                <div>
                  {mfaStatus.enabled ? (
                    <button
                      type="button"
                      onClick={handleDisableMfa}
                      disabled={isMfaLoading}
                      className="px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-xl cursor-pointer transition-all"
                    >
                      Disable 2FA
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartMfaEnrollment}
                      disabled={isMfaLoading || Boolean(mfaEnrollData)}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black text-xs font-extrabold rounded-xl cursor-pointer transition-all shadow-md"
                    >
                      {isMfaLoading ? 'Generating QR...' : 'Enable 2FA Now'}
                    </button>
                  )}
                </div>
              </div>

              {/* Enrollment Step-by-Step Box */}
              {mfaEnrollData && (
                <div className="bg-[#06080F] border border-emerald-500/40 rounded-2xl p-5 space-y-4 animate-in fade-in">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Step 1: Scan QR Code with Authenticator App</h3>

                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {generatedQrDataUrl && (
                      <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
                        <img src={generatedQrDataUrl} alt="2FA QR Code" className="w-36 h-36" />
                      </div>
                    )}

                    <div className="space-y-2 flex-1">
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Open Google Authenticator, Authy, or 1Password and scan the QR code. If you cannot scan, manually enter this setup key:
                      </p>

                      <div className="bg-[#0A0D18] border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between font-mono text-xs">
                        <span className="text-emerald-400 truncate max-w-xs">{mfaEnrollData.secret}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(mfaEnrollData.secret);
                            setCopiedMfaSecret(true);
                            setTimeout(() => setCopiedMfaSecret(false), 2000);
                          }}
                          className="text-zinc-400 hover:text-emerald-400 ml-2"
                        >
                          {copiedMfaSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Step 2: Enter 6-Digit Verification Code</h3>
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        maxLength={6}
                        value={mfaCodeInput}
                        onChange={(e) => setMfaCodeInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="bg-[#06080F] border border-zinc-700 focus:border-emerald-500 text-center font-mono text-lg tracking-widest text-white rounded-xl px-4 py-2 w-36 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyMfaCode}
                        disabled={isMfaLoading || mfaCodeInput.length !== 6}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-black font-extrabold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                      >
                        {isMfaLoading ? 'Verifying...' : 'Confirm & Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Language & Multi-Currency */}
          {activeTab === 'localization' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-base font-extrabold text-white">Language & Global Currency</h2>
                <p className="text-xs text-zinc-400">Choose your preferred fiat reporting currency and interface language.</p>
              </div>

              {/* Currency Selector Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Reporting Currency</h3>
                  <span className="text-xs font-mono text-emerald-400">Active: {currency} ({activeCurrency.symbol})</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {supportedCurrencies.map((c) => {
                    const isSelected = currency === c.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setCurrency(c.code)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-md font-bold'
                            : 'bg-[#06080F] border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs">{c.code}</span>
                          <span className="text-xs font-bold text-zinc-400">{c.symbol}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate mt-1">{c.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language Selector Grid */}
              <div className="space-y-3 pt-4 border-t border-zinc-800/80">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Interface Language</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {supportedLanguages.map((l) => {
                    const isSelected = language === l.code;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setLanguage(l.code)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-3 ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-md font-bold'
                            : 'bg-[#06080F] border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <span className="text-lg">{l.flag}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-tight">{l.nativeName}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{l.name}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Saved Payout Address */}
          {activeTab === 'address' && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h2 className="text-base font-extrabold text-white">Saved EVM Payout Address</h2>
                <p className="text-xs text-zinc-400">Your default recipient wallet address for fast, gas-free Polygon USDT reward withdrawals.</p>
              </div>

              {addressSuccessMsg && (
                <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-3 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{addressSuccessMsg}</span>
                </div>
              )}

              {addressErrorMsg && (
                <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-3 text-rose-300 text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{addressErrorMsg}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 block">EVM Polygon Address (0x...)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="0x1234...abcd"
                    className="w-full bg-[#06080F] border border-zinc-700 focus:border-emerald-500 text-white font-mono text-xs rounded-xl pl-3.5 pr-20 py-3 focus:outline-none"
                  />
                  {savedAddress && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(savedAddress);
                        setCopiedAddress(true);
                        setTimeout(() => setCopiedAddress(false), 2000);
                      }}
                      className="absolute right-3 top-2.5 text-xs text-zinc-400 hover:text-emerald-400 font-sans flex items-center space-x-1"
                    >
                      {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-[#06080F] border border-zinc-800 rounded-xl p-4 space-y-2 text-xs text-zinc-400">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <Info className="w-4 h-4" />
                  <span>Automatic Verification</span>
                </div>
                <p className="leading-relaxed">
                  Ensure you control the private key or seed phrase for this address on Polygon (Chain ID 137). Do NOT use centralized exchange deposit addresses that require a memo or specific sub-contract routing.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  disabled={isSavingAddress}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#16A34A] to-[#22C55E] hover:from-[#15803D] hover:to-[#16A34A] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-[0_4px_15px_rgba(34,197,94,0.4)] transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingAddress ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Saving Address...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-black" />
                      <span>Save Payout Address</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: Storage & Diagnostics */}
          {activeTab === 'storage' && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h2 className="text-base font-extrabold text-white">Storage & Offline Cache Diagnostics</h2>
                <p className="text-xs text-zinc-400">Inspect offline token database storage, cache keys, and reset local caches.</p>
              </div>

              {storageCleanMessage && (
                <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-3 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{storageCleanMessage}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="bg-[#06080F] border border-zinc-800 rounded-xl p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">Offline Cache Persistence</div>
                    <div className="text-zinc-400">LocalStorage & IndexedDB state caching for instant render</div>
                  </div>
                  <span className="text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                    Active & Synchronized
                  </span>
                </div>

                <div className="bg-[#06080F] border border-zinc-800 rounded-xl p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">Purge Local Cache & Force Resync</div>
                    <div className="text-zinc-400">Clears stale cached RPC tokens and pulls fresh state from Supabase</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    disabled={isClearingStorage}
                    className="px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {isClearingStorage ? 'Clearing...' : 'Clear Cache'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Support & Legal */}
          {activeTab === 'support' && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h2 className="text-base font-extrabold text-white">Support & Legal Documents</h2>
                <p className="text-xs text-zinc-400">Get assistance, read FAQs, or review our privacy policies and terms.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => onNavigateTab && onNavigateTab('help-center')}
                  className="bg-[#06080F] border border-zinc-800 hover:border-emerald-500/40 rounded-xl p-4 space-y-2 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                      <HelpCircle className="w-4 h-4" />
                      <span>Help Center</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <p className="text-xs text-zinc-400">Browse FAQs and token verification guidelines.</p>
                </div>

                <div
                  onClick={() => onNavigateTab && onNavigateTab('contact-support')}
                  className="bg-[#06080F] border border-zinc-800 hover:border-emerald-500/40 rounded-xl p-4 space-y-2 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                      <MessageSquare className="w-4 h-4" />
                      <span>Contact Support</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <p className="text-xs text-zinc-400">Submit a support ticket or speak with our team.</p>
                </div>

                <div
                  onClick={() => onNavigateTab && onNavigateTab('terms-privacy')}
                  className="bg-[#06080F] border border-zinc-800 hover:border-emerald-500/40 rounded-xl p-4 space-y-2 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                      <FileText className="w-4 h-4" />
                      <span>Terms of Service</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <p className="text-xs text-zinc-400">Read our user terms and verification policies.</p>
                </div>

                <div
                  onClick={() => onNavigateTab && onNavigateTab('privacy-policy')}
                  className="bg-[#06080F] border border-zinc-800 hover:border-emerald-500/40 rounded-xl p-4 space-y-2 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                      <Shield className="w-4 h-4" />
                      <span>Privacy Policy</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <p className="text-xs text-zinc-400">Learn how your data and encryption are protected.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: Danger Zone */}
          {activeTab === 'danger' && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h2 className="text-base font-extrabold text-rose-400">Account Danger Zone</h2>
                <p className="text-xs text-zinc-400">Permanent and irreversible account management actions.</p>
              </div>

              <div className="bg-[#180C0E] border border-rose-500/40 rounded-2xl p-5 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Delete Account & Purge Data</h3>
                    <p className="text-xs text-rose-200/70">
                      Permanently delete your profile, submitted tokens, withdrawal history, and credentials.
                    </p>
                  </div>
                </div>

                {showConfirmDelete ? (
                  <div className="p-4 bg-black/60 border border-rose-500/50 rounded-xl space-y-3 animate-in fade-in">
                    <p className="text-xs font-bold text-rose-300">
                      Are you absolutely sure? This action cannot be undone. All unclaimed rewards and verified listings will be deleted.
                    </p>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmDelete(false)}
                        className="px-4 py-2 bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/50 text-rose-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Delete My Account
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
