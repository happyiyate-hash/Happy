/**
 * Safely overrides or wraps window.fetch in environments where window.fetch
 * only has a getter or is defined strictly on the Window/global prototype.
 */
export function safePatchFetch(newFetch: typeof window.fetch): boolean {
  if (typeof window === 'undefined') return false;

  try {
    Object.defineProperty(window, 'fetch', {
      value: newFetch,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    return true;
  } catch {
    try {
      window.fetch = newFetch;
      return true;
    } catch {
      try {
        if (typeof globalThis !== 'undefined') {
          (globalThis as any).fetch = newFetch;
          return true;
        }
      } catch (err) {
        console.warn('[TokenCare] Failed to patch global fetch:', err);
      }
    }
  }
  return false;
}
