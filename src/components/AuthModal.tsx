import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  UserCheck,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Sparkles,
  LogOut,
  User,
  Copy,
  Check,
  Database,
  ArrowRight,
} from 'lucide-react';
import { getSupabase, SupabaseUserProfile, createNotificationInSupabase } from '../lib/supabase';
import { sendRegistrationVerificationEmail, verifyOtpCodeLocally } from '../services/emailService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  userProfile: SupabaseUserProfile | null;
  onAuthChange: () => void;
  onOpenSqlModal?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onAuthChange,
  onOpenSqlModal,
}) => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP' | 'OTP'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
        text: err.message || 'Google Auth initiation failed. Check your Supabase Google OAuth setup.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setLoading(true);
    setStatusMessage(null);

    const supabase = getSupabase();

    try {
      if (authMode === 'SIGNUP') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error && !error.message?.includes('already registered')) {
          console.warn('[AuthModal] Supabase signup note:', error.message);
        }

        // Send 6-digit registration confirmation email via Nodemailer service
        await sendRegistrationVerificationEmail({
          to: cleanEmail,
          userName: cleanEmail.split('@')[0],
        });

        setStatusMessage({
          type: 'success',
          text: `Registration email sent! A 6-digit confirmation code has been dispatched to ${cleanEmail}. Please enter it below.`,
        });
        setAuthMode('OTP');
      } else if (authMode === 'LOGIN') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) {
          // Fallback option: Try requesting 6-digit OTP code for magic login
          setStatusMessage({
            type: 'error',
            text: error.message + '. Sending 6-digit login verification code...',
          });
          await sendOtpCode();
          return;
        }

        setStatusMessage({
          type: 'success',
          text: 'Successfully authenticated!',
        });
        onAuthChange();
        setTimeout(onClose, 1000);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Authentication error.',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendOtpCode = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setStatusMessage({ type: 'error', text: 'Please enter your email address first.' });
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabase();
      await supabase.auth.signInWithOtp({
        email: cleanEmail,
      }).catch(() => {});

      await sendRegistrationVerificationEmail({
        to: cleanEmail,
        userName: cleanEmail.split('@')[0],
      });

      setStatusMessage({
        type: 'success',
        text: `6-digit OTP code sent! Check your email inbox for ${cleanEmail}.`,
      });
      setAuthMode('OTP');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to send OTP code.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const token = otpCode.join('');
    if (token.length < 6) {
      setStatusMessage({ type: 'error', text: 'Please enter all 6 digits of the code.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const supabase = getSupabase();
      let isVerified = false;

      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: authMode === 'SIGNUP' ? 'signup' : 'email',
      });

      if (!error) {
        isVerified = true;
      } else {
        const localCheck = verifyOtpCodeLocally(cleanEmail, token);
        if (localCheck.valid) {
          isVerified = true;
        } else {
          throw new Error(error.message || localCheck.reason || 'Invalid 6-digit code.');
        }
      }

      if (isVerified) {
        await createNotificationInSupabase({
          userId: cleanEmail,
          type: 'security',
          title: 'Registration Confirmed',
          message: `🎉 Email address verified! Account registered for ${cleanEmail}.`,
          icon: 'security',
          status: 'success',
        }).catch(() => {});

        setStatusMessage({
          type: 'success',
          text: 'Code verified successfully! You are now logged in.',
        });
        onAuthChange();
        setTimeout(onClose, 1200);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Invalid 6-digit code. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newCode = [...otpCode];
    newCode[index] = val.slice(-1);
    setOtpCode(newCode);

    // Auto-advance input focus
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
      onAuthChange();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0B0E17] border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glow background pill */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Supabase Developer Auth</h3>
              <p className="text-xs text-zinc-400">Cloud database user session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-xl border border-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LOGGED IN VIEW */}
        {currentUser ? (
          <div className="space-y-5 relative z-10">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shrink-0 shadow-lg shadow-emerald-500/20">
                {currentUser.user_metadata?.avatar_url || userProfile?.avatar_url ? (
                  <img
                    src={currentUser.user_metadata?.avatar_url || userProfile?.avatar_url}
                    alt="User Profile"
                    className="w-full h-full object-cover rounded-[14px]"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center text-emerald-400 font-bold text-lg">
                    {String(currentUser?.email || currentUser?.user_metadata?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="space-y-1 overflow-hidden">
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> Authenticated
                </div>
                <div className="text-sm font-bold text-white truncate">{currentUser.email}</div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  ID: {String(currentUser?.id || '').slice(0, 8)}...
                </div>
              </div>
            </div>

            {/* Supabase Reward Balance Card */}
            <div className="bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
                <span>Supabase Total Reward Balance</span>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {userProfile?.total_reward_balance || 0}{' '}
                <span className="text-xs font-semibold text-emerald-400">REWARD</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Synced in real-time with your Supabase <code className="text-emerald-400">profiles</code> table.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* NOT LOGGED IN AUTH FORMS */
          <div className="space-y-4 relative z-10">
            {/* OAuth Google Button */}
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-zinc-100 text-black font-bold rounded-2xl text-xs flex items-center justify-center space-x-3 transition-all shadow-lg shadow-white/5 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-zinc-800" />
              <span className="px-3 text-[11px] uppercase font-semibold text-zinc-500">
                or use email
              </span>
              <div className="flex-1 border-t border-zinc-800" />
            </div>

            {/* Auth Mode Toggle Tabs */}
            <div className="bg-zinc-950 p-1 rounded-2xl border border-zinc-800/80 flex text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAuthMode('LOGIN')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  authMode === 'LOGIN'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('SIGNUP')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  authMode === 'SIGNUP'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('OTP')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  authMode === 'OTP'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                6-Digit Code
              </button>
            </div>

            {/* STATUS MESSAGE */}
            {statusMessage && (
              <div
                className={`p-3 rounded-2xl border text-xs flex items-start space-x-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span className="leading-tight font-medium">{statusMessage.text}</span>
              </div>
            )}

            {/* 6-DIGIT OTP VERIFICATION FORM */}
            {authMode === 'OTP' ? (
              <form onSubmit={handleOtpVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-20 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={sendOtpCode}
                      disabled={loading}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/30 transition-colors cursor-pointer"
                    >
                      Send Code
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">
                    Enter 6-Digit Code
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-input-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        className="w-11 h-12 bg-zinc-900 border border-zinc-800 rounded-xl text-center text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Verify & Access Account</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* EMAIL & PASSWORD LOGIN / SIGNUP FORM */
              <form onSubmit={handleEmailPasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="dev@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{authMode === 'LOGIN' ? 'Log In' : 'Create Account'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
