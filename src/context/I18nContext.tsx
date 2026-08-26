import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  SupportedLanguageCode,
  LanguageMeta,
  SUPPORTED_LANGUAGES,
  getSavedLanguage,
  saveLanguagePreference,
  t as translateHelper,
} from '../services/i18n';

interface I18nContextType {
  language: SupportedLanguageCode;
  setLanguage: (lang: SupportedLanguageCode) => void;
  t: (keyPath: string, paramsOrFallback?: Record<string, string | number> | string) => string;
  supportedLanguages: LanguageMeta[];
  currentLanguageMeta: LanguageMeta;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguageCode>(getSavedLanguage);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tokencare_language' && e.newValue) {
        setLanguageState(getSavedLanguage());
      }
    };

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ language: SupportedLanguageCode }>;
      if (customEvent.detail?.language) {
        setLanguageState(customEvent.detail.language);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tokencare:language_changed', handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokencare:language_changed', handleCustomChange);
    };
  }, []);

  const setLanguage = useCallback((newLang: SupportedLanguageCode) => {
    setLanguageState(newLang);
    saveLanguagePreference(newLang);
  }, []);

  const t = useCallback(
    (keyPath: string, paramsOrFallback?: Record<string, string | number> | string) => {
      return translateHelper(keyPath, paramsOrFallback, language);
    },
    [language]
  );

  const currentLanguageMeta = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      supportedLanguages: SUPPORTED_LANGUAGES,
      currentLanguageMeta,
    }),
    [language, setLanguage, t, currentLanguageMeta]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback if rendered outside provider
    const fallbackLang = getSavedLanguage();
    const meta = SUPPORTED_LANGUAGES.find((l) => l.code === fallbackLang) || SUPPORTED_LANGUAGES[0];
    return {
      language: fallbackLang,
      setLanguage: saveLanguagePreference,
      t: (keyPath, paramsOrFallback) => translateHelper(keyPath, paramsOrFallback, fallbackLang),
      supportedLanguages: SUPPORTED_LANGUAGES,
      currentLanguageMeta: meta,
    };
  }
  return context;
}

export const useTranslation = useI18n;
