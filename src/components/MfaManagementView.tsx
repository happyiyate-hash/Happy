import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ShieldCheck,
  Check,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  X,
  Shield,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  beginMFAEnrollment,
  verifyMFAEnrollment,
  getMFAStatus,
  disableMFA,
  cancelMFAEnrollment,
  clearPendingMFAEnrollment,
  reauthenticatePassword,
} from '../lib/mfa';
import { getSupabase } from '../lib/supabase';

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

const Switch: React.FC<{
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}> = ({ checked, onCheckedChange, disabled, className = '' }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onCheckedChange(!checked)}
    className={cn(
      'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
      checked ? 'bg-emerald-500' : 'bg-zinc-800',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}
  >
    <span
      className={cn(
        'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
        checked ? 'translate-x-5' : 'translate-x-0'
      )}
    />
  </button>
);

interface MfaManagementViewProps {
  currentUser: any;
  userProfile?: any;
  onBackToSettings?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const MfaManagementView: React.FC<MfaManagementViewProps> = ({
  currentUser,
  userProfile,
  onBackToSettings,
  onNavigateTab,
}) => {
  const [mfaStatus, setMfaStatus] = useState<{
    enabled: boolean;
    hasPending: boolean;
    verifiedFactors: any[];
    unverifiedFactors: any[];
  }>({
    enabled: false,
    hasPending: false,
    verifiedFactors: [],
    unverifiedFactors: [],
  });

  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [is2FAProcessing, setIs2FAProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // MFA Modal & Setup State
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
  const [isMfaDisableConfirmOpen, setIsMfaDisableConfirmOpen] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<
    'intro' | 'qr' | 'verify' | 'success'
  >('intro');

  const [otpCode, setOtpCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [tempMfaSecret, setTempMfaSecret] = useState('');
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState<string | null>(null);
  const [mfaEnrollData, setMfaEnrollData] = useState<any>(null);
  const [isSecretCopied, setIsSecretCopied] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // Disable Confirmation Password Input
  const [disablePasswordInput, setDisablePasswordInput] = useState('');
  const [showDisablePassword, setShowDisablePassword] = useState(false);

  const email = currentUser?.email || userProfile?.email || '';

  // Load Status
  const loadStatus = async () => {
    setIsLoadingStatus(true);
    setErrorMessage(null);
    try {
      const status = await getMFAStatus();
      setMfaStatus(status);
    } catch (err: any) {
      console.warn('[MFA View] Status fetch error:', err);
      setErrorMessage('Could not load authenticator status.');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const resetMfaState = () => {
    setTwoFactorStep('intro');
    setOtpCode('');
    setFactorId('');
    setGeneratedQrDataUrl(null);
    setTempMfaSecret('');
    setIsSecretCopied(false);
    setMfaEnrollData(null);
    setShowSecretKey(false);
  };

  const handleMfaToggle = async (enabled: boolean) => {
    if (enabled) {
      setIs2FAProcessing(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const { data: factors, error: listError } =
          await getSupabase().auth.mfa.listFactors();

        if (listError) throw listError;

        const existingFactor = factors?.totp?.find(
          (f) => f.status === 'verified'
        );

        const unverifiedFactor = factors?.totp?.find(
          (f) => (f.status as string) === 'unverified'
        );

        if (existingFactor) {
          if (userProfile?.id) {
            await getSupabase()
              .from('profiles')
              .update({
                mfa_enabled: true,
                mfa_active: true,
              })
              .eq('id', userProfile.id);
          }

          setSuccessMessage('MFA Reactivated: Authenticator link restored.');
          await loadStatus();
        } else {
          if (unverifiedFactor) {
            await cancelMFAEnrollment(unverifiedFactor.id);
          }

          resetMfaState();
          setIsTwoFactorModalOpen(true);
        }
      } catch (e: any) {
        setErrorMessage(e.message || 'MFA toggle failed.');
      } finally {
        setIs2FAProcessing(false);
      }
    } else {
      setIsMfaDisableConfirmOpen(true);
    }
  };

  const startMfaSetup = async () => {
    setIs2FAProcessing(true);
    setErrorMessage(null);

    try {
      const enroll = await beginMFAEnrollment(true);
      setMfaEnrollData(enroll);
      setFactorId(enroll.factorId);
      setTempMfaSecret(enroll.secret);

      if (enroll.uri) {
        try {
          const url = await QRCode.toDataURL(enroll.uri, {
            width: 280,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });
          setGeneratedQrDataUrl(url);
        } catch (err) {
          setGeneratedQrDataUrl(enroll.qrCode || null);
        }
      } else if (enroll.qrCode) {
        setGeneratedQrDataUrl(enroll.qrCode);
      }

      setTwoFactorStep('qr');
    } catch (e: any) {
      setErrorMessage(e.message || 'Enrollment initialization failed.');
      setTwoFactorStep('intro');
    } finally {
      setIs2FAProcessing(false);
    }
  };

  const handleMfaVerify = async () => {
    if (otpCode.length !== 6 || !factorId) return;

    setIs2FAProcessing(true);
    setErrorMessage(null);

    try {
      await verifyMFAEnrollment(factorId, otpCode);

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#3B82F6', '#10B981', '#34D399', '#60A5FA'],
        });
      } catch (e) {}

      await finalizeMFA();
      setTwoFactorStep('success');
    } catch (e: any) {
      setErrorMessage(
        e.message?.includes('Invalid code') || e.message?.includes('invalid')
          ? 'Invalid cryptographic code.'
          : e.message || 'Handshake Failed'
      );
    } finally {
      setIs2FAProcessing(false);
    }
  };

  const finalizeMFA = async () => {
    try {
      if (userProfile?.id) {
        await getSupabase()
          .from('profiles')
          .update({
            mfa_enabled: true,
            mfa_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userProfile.id);
      }

      await loadStatus();
      setSuccessMessage('MFA Authorized: Identity node linked.');
    } catch (e: any) {
      console.warn('[MFA Finalize] Sync failed:', e);
    }
  };

  const copyMfaSecret = () => {
    if (!tempMfaSecret) return;
    navigator.clipboard.writeText(tempMfaSecret);
    setIsSecretCopied(true);
    setTimeout(() => setIsSecretCopied(false), 2000);
  };

  const confirmMfaDisable = async () => {
    setIs2FAProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (disablePasswordInput && email) {
        await reauthenticatePassword(email, disablePasswordInput);
      }

      const activeFactor =
        mfaStatus.verifiedFactors[0] || mfaStatus.unverifiedFactors[0];
      const targetFactorId = activeFactor?.id;

      if (targetFactorId) {
        await disableMFA(targetFactorId);
      } else {
        const { data: factors } = await getSupabase().auth.mfa.listFactors();
        if (factors?.totp) {
          for (const factor of factors.totp) {
            await cancelMFAEnrollment(factor.id);
          }
        }
      }

      if (userProfile?.id) {
        await getSupabase()
          .from('profiles')
          .update({
            mfa_enabled: false,
            mfa_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userProfile.id);
      }

      setIsMfaDisableConfirmOpen(false);
      setDisablePasswordInput('');
      setSuccessMessage('MFA Deactivated successfully.');
      await loadStatus();
    } catch (e: any) {
      setErrorMessage(e.message || 'Deactivation Failed');
    } finally {
      setIs2FAProcessing(false);
    }
  };

  const handleCancelEnrollment = async () => {
    if (factorId) {
      await cancelMFAEnrollment(factorId);
    }
    clearPendingMFAEnrollment();
    resetMfaState();
    setIsTwoFactorModalOpen(false);
  };

  const handleBackNavigation = () => {
    if (onBackToSettings) {
      onBackToSettings();
    } else if (onNavigateTab) {
      onNavigateTab('settings');
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden bg-[#06080E] text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Bar Header */}
      <div className="shrink-0 z-30 w-full bg-[#06080E]/95 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={handleBackNavigation}
            className="inline-flex items-center space-x-1.5 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer py-1.5 px-3 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-semibold">Security Settings</span>
          </button>
          <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
            SECURITY PROTOCOL
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto max-w-md mx-auto w-full p-4 sm:p-6 space-y-6 animate-in fade-in duration-200 pb-24">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Two-Factor Authentication
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Manage your Google Authenticator node and account security parameters.
          </p>
        </div>

        {/* Feedback Banners */}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-300 text-xs font-medium flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-zinc-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-emerald-300 text-xs font-medium flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-zinc-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. Main MFA Security Card ("Authenticator Protocol") */}
        <section className="space-y-4">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">
            Authenticator Protocol
          </p>

          <div className="p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 space-y-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Smartphone className="w-6 h-6" />
                </div>

                <div>
                  <p className="font-black text-sm text-white uppercase tracking-tight">
                    Google Authenticator
                  </p>

                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        mfaStatus.enabled ? 'bg-green-500' : 'bg-zinc-600'
                      )}
                    />

                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">
                      {mfaStatus.enabled ? 'MFA Node Active' : 'Not Linked'}
                    </p>
                  </div>
                </div>
              </div>

              <Switch
                checked={mfaStatus.enabled}
                onCheckedChange={(checked) => handleMfaToggle(checked)}
                disabled={is2FAProcessing || isLoadingStatus}
              />
            </div>

            {!mfaStatus.enabled && (
              <button
                type="button"
                onClick={() => handleMfaToggle(true)}
                disabled={is2FAProcessing || isLoadingStatus}
                className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 flex items-center justify-center cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {is2FAProcessing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Initializing...</span>
                  </span>
                ) : (
                  'Setup Authenticator Node'
                )}
              </button>
            )}
          </div>
        </section>

        {/* Security Context Info Card */}
        <div className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Shield className="w-4 h-4 text-blue-400" />
            <span>Protocol Overview</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Linking a Google Authenticator node adds time-based cryptographic verification (TOTP) to your account. Dynamic 6-digit codes protect sensitive wallet operations and setting changes.
          </p>
        </div>
      </div>

      {/* 2. MFA Setup Modal / Bottom Dialog */}
      {isTwoFactorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[95vw] sm:max-w-[400px] bg-[#0A0D14] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => {
                if (twoFactorStep === 'qr') {
                  handleCancelEnrollment();
                } else {
                  setIsTwoFactorModalOpen(false);
                  resetMfaState();
                }
              }}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* INTRO SCREEN */}
            {twoFactorStep === 'intro' && (
              <div className="space-y-6 text-center pt-2">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                  <Smartphone className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    Google Authenticator
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                    Protect your account with Time-based One-Time Passwords (TOTP). Scan a QR code using Google Authenticator or any compatible TOTP app.
                  </p>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-left space-y-2">
                  <div className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                    NODE SPECIFICATIONS
                  </div>
                  <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside font-medium">
                    <li>Compatible with Google Authenticator</li>
                    <li>Time-based 6-digit key rotation</li>
                    <li>Offline-ready authentication</li>
                  </ul>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={startMfaSetup}
                    disabled={is2FAProcessing}
                    className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 flex items-center justify-center cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {is2FAProcessing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Generating Secret...</span>
                      </span>
                    ) : (
                      'Continue Setup'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsTwoFactorModalOpen(false);
                      resetMfaState();
                    }}
                    className="w-full h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold uppercase text-[10px] tracking-widest transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* QR CODE SCREEN */}
            {twoFactorStep === 'qr' && (
              <div className="space-y-5 text-center pt-2">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Scan QR Code
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Scan with Google Authenticator on your phone.
                  </p>
                </div>

                {/* QR Container */}
                <div className="p-4 bg-white rounded-2xl shadow-2xl w-56 h-56 mx-auto flex items-center justify-center border-4 border-white/10">
                  {generatedQrDataUrl ? (
                    <img
                      src={generatedQrDataUrl}
                      alt="Google Authenticator QR Code"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 text-zinc-800">
                      <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
                      <span className="text-[10px] font-bold">Rendering QR...</span>
                    </div>
                  )}
                </div>

                {/* Manual Secret Key Underneath */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-left space-y-2">
                  <div className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">
                    Can't scan the QR code?
                  </div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    YOUR SECRET KEY
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <code className="text-blue-400 font-mono text-xs font-bold tracking-wider break-all select-all">
                      {showSecretKey ? tempMfaSecret : '•••• •••• •••• ••••'}
                    </code>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-white/5 border border-white/10 transition-colors"
                        title={showSecretKey ? 'Hide key' : 'Show key'}
                      >
                        {showSecretKey ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={copyMfaSecret}
                        className={cn(
                          'px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border',
                          isSecretCopied
                            ? 'bg-green-500/20 border-green-500/40 text-green-400'
                            : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                        )}
                      >
                        {isSecretCopied ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelEnrollment}
                    className="w-1/3 h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold uppercase text-[10px] tracking-widest transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setTwoFactorStep('verify')}
                    className="w-2/3 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* VERIFICATION SCREEN */}
            {twoFactorStep === 'verify' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleMfaVerify();
                }}
                className="space-y-6 text-center pt-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Verify Authenticator
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Enter the 6-digit code generated by Google Authenticator.
                  </p>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, ''))
                    }
                    placeholder="000 000"
                    className="w-full bg-white/[0.03] border border-white/10 text-white font-mono text-center text-3xl tracking-[0.5em] font-extrabold rounded-2xl py-3.5 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                  />
                  <p className="text-[10px] text-zinc-500 font-mono">
                    The code refreshes every 30 seconds.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTwoFactorStep('qr')}
                    disabled={is2FAProcessing}
                    className="w-1/3 h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold uppercase text-[10px] tracking-widest transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={is2FAProcessing || otpCode.length !== 6}
                    className="w-2/3 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 flex items-center justify-center cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {is2FAProcessing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Verifying...</span>
                      </span>
                    ) : (
                      'Verify & Activate'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* SUCCESSFUL MFA SCREEN */}
            {twoFactorStep === 'success' && (
              <div className="space-y-6 text-center pt-2 animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 flex items-center justify-center mx-auto shadow-inner">
                  <Check className="w-8 h-8 text-green-400" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    MFA Authorized
                  </h3>
                  <p className="text-xs text-green-400 font-bold uppercase tracking-wider">
                    Identity node linked.
                  </p>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto pt-2">
                    Your Google Authenticator protocol is active and operational.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsTwoFactorModalOpen(false);
                    resetMfaState();
                  }}
                  className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 cursor-pointer transition-all active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 10. Disable Confirmation Dialog */}
      {isMfaDisableConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[95vw] sm:max-w-[400px] bg-[#0A0D14] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl space-y-5 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1 text-center">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Disable MFA?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Are you sure you want to deactivate your authenticator protection? High-value transactions will no longer require dynamic TOTP codes.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                ACCOUNT PASSWORD CONFIRMATION
              </label>
              <div className="relative">
                <input
                  type={showDisablePassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={disablePasswordInput}
                  onChange={(e) => setDisablePasswordInput(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full bg-white/[0.03] border border-white/10 text-white text-xs font-mono rounded-xl px-3.5 py-3 pr-10 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowDisablePassword(!showDisablePassword)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                >
                  {showDisablePassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsMfaDisableConfirmOpen(false);
                  setDisablePasswordInput('');
                }}
                className="w-1/2 h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold uppercase text-[10px] tracking-widest transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmMfaDisable}
                disabled={is2FAProcessing}
                className="w-1/2 h-12 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-600/20 flex items-center justify-center cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {is2FAProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  'Yes, Deactivate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
