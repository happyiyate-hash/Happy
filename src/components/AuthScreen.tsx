import React, { useState, useEffect, useRef } from 'react';
import { TOKENCARE_LOGO_URL } from '../constants/logo';
import { useStatusBarColor } from '../lib/statusBar';
import {
  ShieldCheck,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  RotateCw,
  Sparkles,
  UserPlus,
  LogIn,
  Key,
} from 'lucide-react';
import { getSupabase, createNotificationInSupabase } from '../lib/supabase';
import { sendRegistrationVerificationEmail, verifyOtpCodeLocally } from '../services/emailService';
import {
  getMFAAssuranceLevel,
  createMFAChallenge,
  verifyMFALogin,
} from '../lib/mfa';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

type AuthPage = 'WELCOME' | 'LOGIN' | 'SIGNUP' | 'EMAIL_VERIFY' | 'MFA_LOGIN';

// Helper to mask email address: e.g. happyiyate@gmail.com -> h***e@gmail.com
const maskEmail = (emailStr: string): string => {
  if (!emailStr || !emailStr.includes('@')) return emailStr || '';
  const [local, domain] = emailStr.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  useStatusBarColor('#030710');
  const [authPage, setAuthPage] = useState<AuthPage>('WELCOME');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);

  // MFA Backup code mode inside MFA_LOGIN
  const [useBackupCodeMode, setUseBackupCodeMode] = useState(false);
  const [backupCodeInput, setBackupCodeInput] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // MFA Login Challenge state
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaChallengeId, setMfaChallengeId] = useState('');

  // Countdown timer for Resend Code button
  const [resendTimer, setResendTimer] = useState(0);

  // Ref to track last auto-pasted code
  const lastAutoPastedCodeRef = useRef<string>('');

  // Check if there is an active session requiring MFA verification on mount
  useEffect(() => {
    const checkPendingMfaSession = async () => {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const assurance = await getMFAAssuranceLevel();
          if (assurance.requiresMFA) {
            const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
            if (!factorsErr && factorsData?.totp) {
              const verifiedFactor = factorsData.totp.find((f) => f.status === 'verified');
              if (verifiedFactor) {
                const challengeId = await createMFAChallenge(verifiedFactor.id);
                setMfaFactorId(verifiedFactor.id);
                setMfaChallengeId(challengeId);
                setEmail(session.user?.email || '');
                setOtpCode(['', '', '', '', '', '']);
                setAuthPage('MFA_LOGIN');
              }
            }
          }
        }
      } catch (err) {
        console.warn('[AuthScreen] Pending MFA check note:', err);
      }
    };

    checkPendingMfaSession();
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Focus the first OTP input when switching to EMAIL_VERIFY or MFA_LOGIN
  useEffect(() => {
    if (authPage === 'EMAIL_VERIFY' || authPage === 'MFA_LOGIN') {
      const prefix = authPage === 'EMAIL_VERIFY' ? 'email-otp-' : 'mfa-otp-';
      setTimeout(() => {
        const firstInput = document.getElementById(`${prefix}0`);
        firstInput?.focus();
      }, 150);
    }
  }, [authPage, useBackupCodeMode]);

  // Direct OTP verification trigger
  const verifyCodeDirectly = async (token: string) => {
    if (loading) return;

    setLoading(true);
    setStatusMessage(null);

    const cleanEmail = email.trim();

    try {
      // 1. MFA Verification Flow
      if (authPage === 'MFA_LOGIN') {
        if (useBackupCodeMode) {
          const cleanBackup = backupCodeInput.trim();
          if (!cleanBackup) {
            throw new Error('Please enter a valid backup code.');
          }
          await verifyMFALogin(mfaFactorId, mfaChallengeId, cleanBackup);
        } else {
          if (token.length < 6) {
            throw new Error('Enter the complete 6-digit authenticator code.');
          }
          await verifyMFALogin(mfaFactorId, mfaChallengeId, token);
        }
        onAuthenticated();
        return;
      }

      // 2. Email Verification Flow
      if (token.length < 6) {
        throw new Error('Enter the complete 6-digit verification code.');
      }

      const supabase = getSupabase();
      let verifiedSuccess = false;

      // Try Supabase verifyOtp first
      const { error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: 'signup',
      });

      if (!error) {
        verifiedSuccess = true;
      } else {
        // Fallback check against local OTP store
        const localCheck = verifyOtpCodeLocally(cleanEmail, token);
        if (localCheck.valid) {
          verifiedSuccess = true;
        } else {
          throw new Error(error.message || localCheck.reason || 'Invalid verification code.');
        }
      }

      if (verifiedSuccess) {
        await createNotificationInSupabase({
          userId: cleanEmail,
          type: 'security',
          title: 'Registration Confirmed',
          message: `🎉 Account registration confirmed! Welcome to TokenCare platform (${cleanEmail}).`,
          icon: 'security',
          status: 'success',
          actionUrl: '/dashboard',
        }).catch(() => {});

        onAuthenticated();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Invalid or expired verification code. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Clipboard auto-read when verification screen is active
  const checkAndPasteClipboard = async () => {
    if ((authPage !== 'EMAIL_VERIFY' && authPage !== 'MFA_LOGIN') || loading || useBackupCodeMode) return;

    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) return;
      const text = await navigator.clipboard.readText();
      if (!text) return;

      const digits = text.trim().replace(/\D/g, '');
      if (digits.length === 6 && digits !== lastAutoPastedCodeRef.current) {
        lastAutoPastedCodeRef.current = digits;
        setOtpCode(digits.split(''));
        setStatusMessage({
          type: 'success',
          text: `Detected code ${digits} from clipboard. Verifying...`,
        });
        verifyCodeDirectly(digits);
      }
    } catch (e) {
      // Ignore clipboard permission restrictions
    }
  };

  useEffect(() => {
    if (authPage !== 'EMAIL_VERIFY' && authPage !== 'MFA_LOGIN') return;

    checkAndPasteClipboard();

    const handleFocus = () => checkAndPasteClipboard();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkAndPasteClipboard();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [authPage, email, loading, useBackupCodeMode]);

  // Google OAuth
  const handleGoogleAuth = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Google authentication failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit Log In form
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      // Check if MFA/TOTP is enabled on account
      try {
        const assurance = await getMFAAssuranceLevel();
        if (assurance.requiresMFA) {
          const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
          if (!factorsErr && factorsData?.totp) {
            const verifiedFactor = factorsData.totp.find((f) => f.status === 'verified');
            if (verifiedFactor) {
              const challengeId = await createMFAChallenge(verifiedFactor.id);
              setMfaFactorId(verifiedFactor.id);
              setMfaChallengeId(challengeId);
              setOtpCode(['', '', '', '', '', '']);
              setUseBackupCodeMode(false);
              setAuthPage('MFA_LOGIN');
              return;
            }
          }
        }
      } catch (mfaErr: any) {
        console.warn('[AuthScreen] MFA assurance check note:', mfaErr);
      }

      onAuthenticated();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Invalid login credentials. Please check your email and password.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit Sign Up form -> triggers full-screen Email Verification page
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error && !error.message?.includes('already registered')) {
        console.warn('[AuthScreen] Signup notice:', error.message);
      }

      // Send 6-digit verification email
      await sendRegistrationVerificationEmail({
        to: cleanEmail,
        userName: cleanEmail.split('@')[0],
      });

      setResendTimer(60);
      setOtpCode(['', '', '', '', '', '']);
      setAuthPage('EMAIL_VERIFY');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Registration failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Resend 6-digit code
  const handleResendCode = async () => {
    const cleanEmail = email.trim();
    if (resendTimer > 0 || !cleanEmail) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const supabase = getSupabase();
      await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      }).catch(() => {});

      await sendRegistrationVerificationEmail({
        to: cleanEmail,
        userName: cleanEmail.split('@')[0],
      });

      setStatusMessage({
        type: 'success',
        text: `New 6-digit verification code sent to ${maskEmail(cleanEmail)}.`,
      });
      setResendTimer(60);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to resend code.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string, inputPrefix: string) => {
    const cleanDigits = val.replace(/\D/g, '');
    if (cleanDigits.length >= 6) {
      const code6 = cleanDigits.slice(0, 6);
      setOtpCode(code6.split(''));
      lastAutoPastedCodeRef.current = code6;
      verifyCodeDirectly(code6);
      return;
    }

    if (!/^\d*$/.test(val)) return;

    const newCode = [...otpCode];
    newCode[index] = val.slice(-1);
    setOtpCode(newCode);

    if (val && index < 5) {
      const nextInput = document.getElementById(`${inputPrefix}${index + 1}`);
      nextInput?.focus();
    }

    const fullCode = newCode.join('');
    if (fullCode.length === 6) {
      verifyCodeDirectly(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>, inputPrefix: string) => {
    if (e.key === 'Backspace') {
      if (!otpCode[index] && index > 0) {
        const prevInput = document.getElementById(`${inputPrefix}${index - 1}`);
        prevInput?.focus();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>, inputPrefix: string) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    const digits = pastedText.trim().replace(/\D/g, '');
    if (digits.length >= 6) {
      const code6 = digits.slice(0, 6);
      setOtpCode(code6.split(''));
      lastAutoPastedCodeRef.current = code6;
      verifyCodeDirectly(code6);
    } else if (digits.length > 0) {
      const newCode = [...otpCode];
      for (let i = 0; i < Math.min(digits.length, 6); i++) {
        newCode[i] = digits[i];
      }
      setOtpCode(newCode);

      const nextIdx = Math.min(digits.length, 5);
      const nextInput = document.getElementById(`${inputPrefix}${nextIdx}`);
      nextInput?.focus();

      if (newCode.join('').length === 6) {
        verifyCodeDirectly(newCode.join(''));
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#030710] relative flex flex-col justify-between items-center p-4 sm:p-8 overflow-x-hidden font-sans select-none">
      {/* Continuous #030710 Dark Navy Background Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#030710]">
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-20" />
      </div>

      {/* Top Header Branding */}
      <header className="relative z-10 pt-4 sm:pt-8 flex flex-col items-center text-center space-y-3 max-w-sm w-full mx-auto">
        <div className="flex items-center justify-center">
          <img
            src={TOKENCARE_LOGO_URL}
            alt="TokenCare Logo"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center justify-center gap-2">
            <span className="text-white">Token</span>
            <span className="text-[#00E575]">Care</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              PRO
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-1">
            Secure Web3 Token & Donation Platform
          </p>
        </div>
      </header>

      {/* Main Flow Content */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto py-6 space-y-6">
        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs font-medium flex items-start space-x-3 backdrop-blur-md transition-all shadow-xl ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{statusMessage.text}</span>
          </div>
        )}

        {/* 1. WELCOME PAGE VIEW */}
        {authPage === 'WELCOME' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center space-y-1.5">
              <h2 className="text-2xl font-bold text-white tracking-tight">Sign up or login</h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Choose an option to access your TokenCare dashboard
              </p>
            </div>

            {/* Welcome Options Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setAuthPage('SIGNUP');
                }}
                className="w-full py-4 px-5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm rounded-2xl flex items-center justify-between shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <UserPlus className="w-5 h-5 text-black" />
                  <span>Sign Up with Email</span>
                </div>
                <ArrowRight className="w-5 h-5 text-black group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setAuthPage('LOGIN');
                }}
                className="w-full py-4 px-5 bg-zinc-900/80 hover:bg-zinc-800/90 text-white font-bold text-sm rounded-2xl border border-zinc-700/60 hover:border-emerald-500/50 flex items-center justify-between transition-all cursor-pointer backdrop-blur-md group"
              >
                <div className="flex items-center space-x-3">
                  <LogIn className="w-5 h-5 text-emerald-400" />
                  <span>Log In to Account</span>
                </div>
                <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-zinc-800/80" />
              <span className="px-3 text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider">
                OR
              </span>
              <div className="flex-1 border-t border-zinc-800/80" />
            </div>

            {/* Continue with Google Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3.5 px-5 bg-white hover:bg-zinc-100 text-black font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-3 transition-all shadow-lg cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        {/* 2. LOG IN PAGE VIEW */}
        {authPage === 'LOGIN' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Navigation back */}
            <button
              type="button"
              onClick={() => {
                setStatusMessage(null);
                setAuthPage('WELCOME');
              }}
              className="inline-flex items-center space-x-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">Log In</h2>
              <p className="text-xs text-zinc-400">Welcome back! Please enter your details below.</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-medium transition-all backdrop-blur-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-medium transition-all backdrop-blur-md"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Log In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center text-xs text-zinc-400 pt-1">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setAuthPage('SIGNUP');
                }}
                className="text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                Sign Up
              </button>
            </div>

            <div className="flex items-center my-3">
              <div className="flex-1 border-t border-zinc-800/80" />
              <span className="px-3 text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider">
                OR
              </span>
              <div className="flex-1 border-t border-zinc-800/80" />
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3.5 px-5 bg-white hover:bg-zinc-100 text-black font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-3 transition-all shadow-lg cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        {/* 3. SIGN UP PAGE VIEW */}
        {authPage === 'SIGNUP' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Navigation back */}
            <button
              type="button"
              onClick={() => {
                setStatusMessage(null);
                setAuthPage('WELCOME');
              }}
              className="inline-flex items-center space-x-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">Create an Account</h2>
              <p className="text-xs text-zinc-400">Sign up to get started with TokenCare.</p>
            </div>

            <form onSubmit={handleSignUpSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-medium transition-all backdrop-blur-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-medium transition-all backdrop-blur-md"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center text-xs text-zinc-400 pt-1">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setAuthPage('LOGIN');
                }}
                className="text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                Log In
              </button>
            </div>

            <div className="flex items-center my-3">
              <div className="flex-1 border-t border-zinc-800/80" />
              <span className="px-3 text-[10px] uppercase font-mono font-bold text-zinc-500 tracking-wider">
                OR
              </span>
              <div className="flex-1 border-t border-zinc-800/80" />
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3.5 px-5 bg-white hover:bg-zinc-100 text-black font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-3 transition-all shadow-lg cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        {/* 4. DEDICATED FULL-SCREEN EMAIL VERIFICATION PAGE */}
        {authPage === 'EMAIL_VERIFY' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Back action */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setAuthPage('SIGNUP');
                }}
                className="inline-flex items-center space-x-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer bg-zinc-900/60 px-3.5 py-2 rounded-xl border border-zinc-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Verify your email
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                We sent a 6-digit confirmation code to{' '}
                <span className="text-emerald-400 font-semibold">{maskEmail(email)}</span>.
              </p>
            </div>

            {/* OTP Code Input */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`email-otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value, 'email-otp-')}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e, 'email-otp-')}
                    onPaste={(e) => handleOtpPaste(e, 'email-otp-')}
                    className="w-11 h-14 sm:w-13 sm:h-16 bg-zinc-900/90 border border-zinc-800 focus:border-emerald-500 rounded-2xl text-center text-xl sm:text-2xl font-bold text-emerald-400 focus:outline-none transition-all font-mono shadow-inner"
                  />
                ))}
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={checkAndPasteClipboard}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Paste Code from Clipboard</span>
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => verifyCodeDirectly(otpCode.join(''))}
              disabled={loading || otpCode.join('').length < 6}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-black" />
              ) : (
                <>
                  <span>Verify & Continue</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>

            {/* Resend Code Section */}
            <div className="flex items-center justify-center pt-2">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendTimer > 0 || loading}
                className={`inline-flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer ${
                  resendTimer > 0
                    ? 'text-zinc-500 cursor-not-allowed'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 5. DEDICATED FULL-SCREEN MFA / 2FA LOGIN PAGE */}
        {authPage === 'MFA_LOGIN' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Back action */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setAuthPage('LOGIN');
                }}
                className="inline-flex items-center space-x-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer bg-zinc-900/60 px-3.5 py-2 rounded-xl border border-zinc-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Log In</span>
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Two-factor authentication
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                {useBackupCodeMode
                  ? 'Enter one of your emergency backup codes to log in to your TokenCare account.'
                  : 'Enter the 6-digit verification code generated by your authenticator app.'}
              </p>
            </div>

            {/* Input Section */}
            <div className="space-y-4 pt-2">
              {useBackupCodeMode ? (
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Backup Code
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. 8A3F-9B1C"
                      value={backupCodeInput}
                      onChange={(e) => setBackupCodeInput(e.target.value)}
                      className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-emerald-500 rounded-2xl pl-10 pr-4 py-4 text-sm text-white placeholder-zinc-500 focus:outline-none font-mono tracking-widest uppercase transition-all"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`mfa-otp-${idx}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value, 'mfa-otp-')}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e, 'mfa-otp-')}
                        onPaste={(e) => handleOtpPaste(e, 'mfa-otp-')}
                        className="w-11 h-14 sm:w-13 sm:h-16 bg-zinc-900/90 border border-zinc-800 focus:border-emerald-500 rounded-2xl text-center text-xl sm:text-2xl font-bold text-emerald-400 focus:outline-none transition-all font-mono shadow-inner"
                      />
                    ))}
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={checkAndPasteClipboard}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Paste Code from Clipboard</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => {
                if (useBackupCodeMode) {
                  verifyCodeDirectly(backupCodeInput);
                } else {
                  verifyCodeDirectly(otpCode.join(''));
                }
              }}
              disabled={
                loading ||
                (useBackupCodeMode ? !backupCodeInput.trim() : otpCode.join('').length < 6)
              }
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-black" />
              ) : (
                <>
                  <span>Verify & Continue</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>

            {/* Subtle Backup Code Toggle Link */}
            <div className="flex items-center justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setUseBackupCodeMode(!useBackupCodeMode);
                }}
                className="text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer py-1 px-3 rounded-lg hover:bg-zinc-900/60"
              >
                {useBackupCodeMode ? 'Use authenticator code instead' : 'Use a backup code instead'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Copy */}
      <footer className="relative z-10 pb-4 text-center text-[11px] text-zinc-500 font-medium">
        &copy; {new Date().getFullYear()} TokenCare. All rights reserved.
      </footer>
    </div>
  );
};
