import React, { useState, useEffect, useCallback } from 'react';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import pt from '../locales/pt.json';
import ja from '../locales/ja.json';
import zh from '../locales/zh.json';

export type SupportedLanguageCode = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ja' | 'zh';

export interface LanguageMeta {
  code: SupportedLanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  direction?: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳' },
];

export const DICTIONARIES: Record<SupportedLanguageCode, any> = {
  en,
  es,
  fr,
  de,
  pt,
  ja,
  zh,
};

export const LANGUAGE_STORAGE_KEY = 'tokencare_language';
export const PREFERENCES_STORAGE_KEY = 'tokencare_preferences';

/**
 * Retrieves the currently saved language or defaults to 'en'
 */
export function getSavedLanguage(): SupportedLanguageCode {
  if (typeof window === 'undefined') return 'en';
  try {
    const direct = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (direct && (direct in DICTIONARIES)) {
      return direct as SupportedLanguageCode;
    }
    const prefs = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (prefs) {
      const parsed = JSON.parse(prefs);
      if (parsed.language && (parsed.language in DICTIONARIES)) {
        return parsed.language as SupportedLanguageCode;
      }
    }
  } catch (e) {
    console.warn('[i18n] Error reading language from localStorage:', e);
  }
  return 'en';
}

/**
 * Saves selected language to localStorage under both 'tokencare_language'
 * and the compound 'tokencare_preferences' object.
 */
export function saveLanguagePreference(lang: SupportedLanguageCode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

    // Also sync compound tokencare_preferences
    try {
      const existing = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      const parsed = existing ? JSON.parse(existing) : {};
      parsed.language = lang;
      parsed.updatedAt = new Date().toISOString();
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(parsed));
    } catch {}

    // Dispatch a custom window event so listeners can re-render immediately
    window.dispatchEvent(new CustomEvent('tokencare:language_changed', { detail: { language: lang } }));
  } catch (e) {
    console.warn('[i18n] Error saving language to localStorage:', e);
  }
}

/**
 * Resolves a nested key in an object (e.g. 'settings.darkMode' -> dict.settings.darkMode)
 */
function resolveNestedKey(obj: any, keyPath: string): string | undefined {
  if (!obj || !keyPath) return undefined;
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Translates a key path using the active dictionary with fallback to English ('en').
 * Interpolates `{param}` variables if provided.
 *
 * Example:
 * t('settings.darkMode') -> "Dark Mode"
 * t('tokens.holdersCount', { count: 120 }) -> "120 Holders"
 */
export function t(
  keyPath: string,
  paramsOrFallback?: Record<string, string | number> | string,
  langOverride?: SupportedLanguageCode
): string {
  const fallbackString = typeof paramsOrFallback === 'string' ? paramsOrFallback : undefined;
  const params = typeof paramsOrFallback === 'object' ? paramsOrFallback : undefined;
  const activeLang = langOverride || getSavedLanguage();
  const activeDict = DICTIONARIES[activeLang] || DICTIONARIES.en;
  const fallbackDict = DICTIONARIES.en;

  // 1. Try active language
  let translation = resolveNestedKey(activeDict, keyPath);

  // 2. Fallback to English if missing
  if (translation === undefined && activeLang !== 'en') {
    translation = resolveNestedKey(fallbackDict, keyPath);
  }

  // 3. Fallback to fallback string or key itself if missing everywhere
  if (translation === undefined) {
    if (fallbackString !== undefined) {
      translation = fallbackString;
    } else {
      const segments = keyPath.split('.');
      translation = segments[segments.length - 1] || keyPath;
    }
  }

  // 4. Interpolate parameters (e.g. {count}, {name})
  if (params && typeof translation === 'string') {
    return Object.entries(params).reduce((acc, [key, val]) => {
      return acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
    }, translation);
  }

  return translation;
}

/**
 * Custom React Hook for real-time i18n reactivity.
 * Automatically triggers component re-renders whenever the user switches language.
 */
export function useTranslation() {
  const [language, setLanguageState] = useState<SupportedLanguageCode>(() => getSavedLanguage());

  useEffect(() => {
    const handleLanguageChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ language: SupportedLanguageCode }>;
      if (customEvent.detail && customEvent.detail.language) {
        setLanguageState(customEvent.detail.language);
      } else {
        setLanguageState(getSavedLanguage());
      }
    };

    window.addEventListener('tokencare:language_changed', handleLanguageChange);
    window.addEventListener('storage', handleLanguageChange);

    return () => {
      window.removeEventListener('tokencare:language_changed', handleLanguageChange);
      window.removeEventListener('storage', handleLanguageChange);
    };
  }, []);

  const changeLanguage = useCallback((lang: SupportedLanguageCode) => {
    saveLanguagePreference(lang);
    setLanguageState(lang);
  }, []);

  const translate = useCallback(
    (keyPath: string, paramsOrFallback?: Record<string, string | number> | string) => {
      return t(keyPath, paramsOrFallback, language);
    },
    [language]
  );

  return {
    t: translate,
    language,
    setLanguage: changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}

