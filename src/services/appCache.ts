import { SubmittedToken, UserRewardWallet } from '../types';
import { SupabaseUserProfile } from '../lib/supabase';
import { safeSetItem, sanitizeTokenForStorage } from './storage';

export type SessionStatus =
  | 'authenticated_local' // Restored locally from cache
  | 'online_validated'    // Online and server sync confirmed
  | 'offline'             // Device is offline, displaying cached data
  | 'expired_revoked';    // Session token expired or revoked by server

export interface CachedAppData {
  userId: string;
  userEmail: string;
  userProfile: SupabaseUserProfile | null;
  tokens: SubmittedToken[];
  wallet: UserRewardWallet | null;
  unreadCount: number;
  lastSyncTimestamp: number; // Date.now() timestamp
  sessionStatus: SessionStatus;
}

const DB_NAME = 'tokencare_offline_cache_v1';
const STORE_NAME = 'tokencare_store';
const DATA_KEY = 'cached_dashboard_payload';

// Helper to open IndexedDB with automatic fallback
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Save non-sensitive cached dashboard and session application payload into IndexedDB / localStorage
 * Scoped specifically to data.userId
 */
export async function setCachedAppData(data: CachedAppData): Promise<void> {
  if (!data || !data.userId) return;
  const userKey = `user_cache_${data.userId}`;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(data, userKey);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[AppCache] IndexedDB set failed, using localStorage fallback:', err);
    try {
      const sanitizedPayload = {
        ...data,
        tokens: (data.tokens || []).slice(0, 50).map(sanitizeTokenForStorage),
      };
      safeSetItem(`tokencare_cache_${data.userId}`, JSON.stringify(sanitizedPayload));
    } catch (lsErr) {
      console.warn('[AppCache] localStorage fallback set note:', lsErr);
    }
  }
}

/**
 * Retrieve cached dashboard and session payload for a specific authenticated user
 */
export async function getCachedAppData(userId?: string): Promise<CachedAppData | null> {
  if (!userId) return null;
  const userKey = `user_cache_${userId}`;
  try {
    const db = await openDB();
    const result = await new Promise<CachedAppData | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(userKey);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
    });

    if (result && result.userId === userId) return result;
  } catch (err) {
    console.warn('[AppCache] IndexedDB get failed, reading from localStorage fallback:', err);
  }

  // Fallback to localStorage
  try {
    const lsItem = localStorage.getItem(`tokencare_cache_${userId}`);
    if (lsItem) {
      const parsed = JSON.parse(lsItem) as CachedAppData;
      if (parsed && parsed.userId === userId) {
        return parsed;
      }
    }
  } catch (lsErr) {
    console.error('[AppCache] localStorage fallback read error:', lsErr);
  }

  return null;
}

/**
 * Synchronous local storage reader for instant synchronous hydration before React renders
 */
export function getSyncCachedAppData(userId?: string): CachedAppData | null {
  if (!userId) return null;
  try {
    const lsItem = localStorage.getItem(`tokencare_cache_${userId}`);
    if (lsItem) {
      const parsed = JSON.parse(lsItem) as CachedAppData;
      if (parsed && parsed.userId === userId) {
        return parsed;
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Clear user-scoped cached application data
 */
export async function clearCachedAppData(userId?: string): Promise<void> {
  if (!userId) return;
  const userKey = `user_cache_${userId}`;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(userKey);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore
  }

  try {
    localStorage.removeItem(`tokencare_cache_${userId}`);
  } catch {
    // Ignore
  }
}
