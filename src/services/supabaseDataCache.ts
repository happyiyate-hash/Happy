import { safePatchFetch } from '../utils/fetchBridge';

const DB_NAME = 'tokencare_data_cache_v1';
const STORE_NAME = 'responses';
const DEFAULT_TTL_MS = 15 * 60 * 1000;

interface CachedResponse {
  key: string;
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
  savedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open cache database'));
  });
  return dbPromise;
}

function isSupabaseDataRead(url: string, method: string): boolean {
  if (!/^(GET|HEAD)$/i.test(method)) return false;
  return /\/rest\/v1\/(tokens|user_tokens)(?:[/?]|$)/i.test(url);
}

function isSupabaseGraphQLRead(url: string, method: string, body: string): boolean {
  if (!/^POST$/i.test(method) || !/\/graphql\/v1(?:[/?]|$)/i.test(url)) return false;
  const normalized = body.toLowerCase();
  return !/\bmutation\b|\binsert\b|\bupdate\b|\bdelete\b/.test(normalized);
}

function makeKey(url: string, method: string, body: string): string {
  return `${String(method || 'GET').toUpperCase()}:${url}:${body}`;
}

async function readCached(key: string): Promise<CachedResponse | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function writeCached(entry: CachedResponse): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    // Cache failures must never break the network request.
  }
}

export async function clearSupabaseDataCache(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    // Ignore cache cleanup failures.
  }
}

/**
 * Persistent app-private cache for token reads. Cached data is returned
 * immediately when it is fresh, while a silent network refresh updates the
 * cache in the background. Stale cache is used only as an offline fallback.
 */
export function installSupabaseDataCache(ttlMs = DEFAULT_TTL_MS): void {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  const marker = '__tokencareSupabaseDataCacheInstalled';
  const win = window as Window & { [marker]?: boolean };
  if (win[marker]) return;
  win[marker] = true;

  const originalFetch = window.fetch.bind(window);

  const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : null;
    const url = request ? request.url : String(input);
    const method = (init?.method || request?.method || 'GET').toUpperCase();

    let body = '';
    if (init?.body && typeof init.body === 'string') body = init.body;
    else if (request && method === 'POST') {
      try { body = await request.clone().text(); } catch { body = ''; }
    }

    const cacheable = isSupabaseDataRead(url, method) || isSupabaseGraphQLRead(url, method, body);
    const mutatesTokenData = /\/rest\/v1\/(tokens|user_tokens)(?:[/?]|$)/i.test(url) && !/^(GET|HEAD)$/i.test(method);

    if (mutatesTokenData) {
      await clearSupabaseDataCache();
      return originalFetch(input, init);
    }

    if (!cacheable) return originalFetch(input, init);

    const key = makeKey(url, method, body);
    const cached = await readCached(key);
    const isFresh = !!cached && Date.now() - cached.savedAt <= ttlMs;

    const refresh = async (): Promise<Response> => {
      const response = await originalFetch(input, init);
      if (response.ok) {
        const responseClone = response.clone();
        const responseBody = await responseClone.text();
        await writeCached({
          key,
          status: response.status,
          statusText: response.statusText,
          headers: Array.from(response.headers.entries()),
          body: responseBody,
          savedAt: Date.now(),
        });
      }
      return response;
    };

    // Fast path: return persistent local data immediately and refresh silently.
    if (isFresh && cached) {
      void refresh().catch(() => {});
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: cached.headers,
      });
    }

    try {
      return await refresh();
    } catch (networkError) {
      if (cached) {
        return new Response(cached.body, {
          status: cached.status,
          statusText: cached.statusText,
          headers: cached.headers,
        });
      }
      throw networkError;
    }
  };

  safePatchFetch(customFetch);

  window.addEventListener('tokencare:clear-data-cache', () => {
    clearSupabaseDataCache().catch(() => {});
  });
}
