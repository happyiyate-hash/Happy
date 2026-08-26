import { getSupabase, getSupabaseConfig } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { safeSetItem } from '../services/storage';

/**
 * TokenCare MFA Engine
 *
 * Uses Supabase Auth TOTP MFA.
 */

const PENDING_STORAGE_KEY = 'tokencare_mfa_pending';

export function getPendingMFAEnrollment() {
  try {
    const saved = localStorage.getItem(PENDING_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('[MFA] Parse pending enrollment note:', e);
  }
  return null;
}

export function clearPendingMFAEnrollment() {
  try {
    localStorage.removeItem(PENDING_STORAGE_KEY);
  } catch (e) {}
}

/**
 * Begin or resume MFA enrollment.
 * Checks listFactors() FIRST to avoid calling enroll() when an unverified or verified factor exists.
 */
export async function beginMFAEnrollment(forceReset = false) {
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    throw new Error('You must be signed in to enable MFA.');
  }

  // Prevent accidentally creating duplicate pending factors.
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();

  if (listError) {
    throw listError;
  }

  const verifiedTotp = factors?.totp?.filter(
    (factor) => factor.status === 'verified'
  ) || [];

  if (verifiedTotp.length > 0) {
    throw new Error('MFA is already enabled on your account.');
  }

  const unverifiedTotp = factors?.totp?.filter(
    (factor) => (factor.status as string) === 'unverified'
  ) || [];

  // Resume existing saved pending enrollment if valid and not forcing reset
  const savedPending = getPendingMFAEnrollment();
  if (!forceReset && unverifiedTotp.length > 0 && savedPending && savedPending.factorId) {
    const matchingFactor = unverifiedTotp.find((f) => f.id === savedPending.factorId);
    if (matchingFactor) {
      return savedPending;
    }
  }

  // Remove old unverified factors before creating a new one
  if (factors?.totp) {
    for (const factor of factors.totp) {
      if ((factor.status as string) === 'unverified') {
        try {
          await supabase.auth.mfa.unenroll({
            factorId: factor.id,
          });
        } catch (e) {
          console.warn('[MFA] Cleanup unverified factor note:', e);
        }
      }
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'TokenCare Authenticator',
  });

  if (error) {
    // Handle potential friendly name collision by unenrolling unverified factors and retrying once
    if (error.message?.includes('already exists')) {
      const { data: freshFactors } = await supabase.auth.mfa.listFactors();
      if (freshFactors?.totp) {
        for (const f of freshFactors.totp) {
          if ((f.status as string) !== 'verified') {
            try {
              await supabase.auth.mfa.unenroll({ factorId: f.id });
            } catch (e) {
              console.warn('[MFA] Retry unenroll note:', e);
            }
          }
        }
      }
      const retry = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'TokenCare Authenticator',
      });
      if (retry.error) throw retry.error;
      if (!retry.data?.totp) throw new Error('Supabase did not return TOTP enrollment data.');
      
      const setupResult = {
        factorId: retry.data.id,
        qrCode: retry.data.totp.qr_code,
        secret: retry.data.totp.secret,
        uri: retry.data.totp.uri,
        friendlyName: retry.data.friendly_name,
      };

      try {
        safeSetItem(PENDING_STORAGE_KEY, JSON.stringify(setupResult));
      } catch (e) {}

      return setupResult;
    }
    throw error;
  }

  if (!data?.totp) {
    throw new Error('Supabase did not return TOTP enrollment data.');
  }

  const setupResult = {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
    friendlyName: data.friendly_name,
  };

  try {
    safeSetItem(PENDING_STORAGE_KEY, JSON.stringify(setupResult));
  } catch (e) {}

  return setupResult;
}

/**
 * Cancel a pending MFA enrollment factor.
 */
export async function cancelMFAEnrollment(factorId: string) {
  const supabase = getSupabase();
  try {
    await supabase.auth.mfa.unenroll({ factorId });
  } catch (e) {
    console.warn('[MFA] Cancel enrollment unenroll note:', e);
  }
  clearPendingMFAEnrollment();
}

/**
 * Verify the code after the user scans the QR code.
 */
export async function verifyMFAEnrollment(
  factorId: string,
  code: string
) {
  const supabase = getSupabase();
  const cleanCode = code.replace(/\D/g, '');

  if (!/^\d{6}$/.test(cleanCode)) {
    throw new Error('Enter the 6-digit authentication code.');
  }

  const { data, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });

  if (challengeError) {
    throw challengeError;
  }

  const { data: verified, error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: data.id,
    code: cleanCode,
  });

  if (verifyError) {
    throw verifyError;
  }

  // Clear pending storage once verified
  clearPendingMFAEnrollment();

  // Refresh the session so the JWT reflects AAL2.
  await supabase.auth.refreshSession();

  return verified;
}

/**
 * Check whether the current user has MFA enabled or pending setup.
 */
export async function getMFAStatus() {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) {
    throw error;
  }

  const verifiedTotp = data?.totp?.filter(
    (factor) => factor.status === 'verified'
  ) || [];

  const unverifiedTotp = data?.totp?.filter(
    (factor) => (factor.status as string) === 'unverified'
  ) || [];

  return {
    enabled: verifiedTotp.length > 0,
    hasPending: unverifiedTotp.length > 0,
    verifiedFactors: verifiedTotp,
    unverifiedFactors: unverifiedTotp,
  };
}

/**
 * Get the current and next authentication assurance level.
 */
export async function getMFAAssuranceLevel() {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (error) {
    throw error;
  }

  return {
    currentLevel: data.currentLevel,
    nextLevel: data.nextLevel,
    requiresMFA:
      data.currentLevel === 'aal1' &&
      data.nextLevel === 'aal2',
  };
}

/**
 * Create a login MFA challenge.
 */
export async function createMFAChallenge(
  factorId: string
) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.mfa.challenge({
    factorId,
  });

  if (error) {
    throw error;
  }

  return data.id;
}

/**
 * Verify the MFA code during login.
 */
export async function verifyMFALogin(
  factorId: string,
  challengeId: string,
  code: string
) {
  const supabase = getSupabase();
  const cleanCode = code.replace(/\D/g, '');

  if (!/^\d{6}$/.test(cleanCode)) {
    throw new Error('Enter the 6-digit authentication code.');
  }

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code: cleanCode,
  });

  if (error) {
    throw error;
  }

  await supabase.auth.refreshSession();

  return data;
}

/**
 * Re-authenticate user's password using a temporary isolated Supabase client
 * so the main app session and onAuthStateChange listeners are not degraded or logged out.
 */
export async function reauthenticatePassword(email: string, password: string): Promise<boolean> {
  if (!email || !password) {
    throw new Error('Email and password are required for identity verification.');
  }

  const { url, anonKey } = getSupabaseConfig();
  const tempClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await tempClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error('Incorrect password. Please enter your correct account password.');
  }

  return true;
}

/**
 * Disable/remove MFA.
 * Removes active TOTP factor directly without logging the user out.
 */
export async function disableMFA(
  factorId: string
) {
  const supabase = getSupabase();

  const { error } = await supabase.auth.mfa.unenroll({
    factorId,
  });

  if (error) {
    throw error;
  }

  await supabase.auth.refreshSession();

  return true;
}
