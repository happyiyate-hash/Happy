import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  CurrencyConfig,
  SUPPORTED_CURRENCIES,
  CURRENCIES_LIST,
  getSavedCurrency,
  saveCurrencyPreference,
  formatCurrency as formatCurrencyHelper,
  convertUsdToCurrency as convertUsdHelper,
  FormatCurrencyOptions,
} from '../services/currency';

interface CurrencyContextType {
  currency: string;
  setCurrency: (code: string) => void;
  activeCurrency: CurrencyConfig;
  supportedCurrencies: CurrencyConfig[];
  formatCurrency: (amountInUSD: number | string | undefined | null, options?: FormatCurrencyOptions) => string;
  convertFromUSD: (amountInUSD: number | string | undefined | null) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<string>(getSavedCurrency);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tokencare_preferences' || e.key === 'tokencare_currency') {
        setCurrencyState(getSavedCurrency());
      }
    };

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ currency: string }>;
      if (customEvent.detail?.currency) {
        setCurrencyState(customEvent.detail.currency);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tokencare:currency_changed', handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokencare:currency_changed', handleCustomChange);
    };
  }, []);

  const setCurrency = useCallback((code: string) => {
    if (!code) return;
    const upper = String(code).toUpperCase();
    if (SUPPORTED_CURRENCIES[upper]) {
      setCurrencyState(upper);
      saveCurrencyPreference(upper);
    }
  }, []);

  const activeCurrency = useMemo(() => {
    return SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;
  }, [currency]);

  const formatCurrency = useCallback(
    (amountInUSD: number | string | undefined | null, options?: FormatCurrencyOptions) => {
      return formatCurrencyHelper(amountInUSD, {
        currencyCode: currency,
        ...options,
      });
    },
    [currency]
  );

  const convertFromUSD = useCallback(
    (amountInUSD: number | string | undefined | null) => {
      return convertUsdHelper(amountInUSD, currency);
    },
    [currency]
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      activeCurrency,
      supportedCurrencies: CURRENCIES_LIST,
      formatCurrency,
      convertFromUSD,
    }),
    [currency, setCurrency, activeCurrency, formatCurrency, convertFromUSD]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (!context) {
    // Fallback outside provider
    const fallbackCode = getSavedCurrency();
    const active = SUPPORTED_CURRENCIES[fallbackCode] || SUPPORTED_CURRENCIES.USD;
    return {
      currency: fallbackCode,
      setCurrency: saveCurrencyPreference,
      activeCurrency: active,
      supportedCurrencies: CURRENCIES_LIST,
      formatCurrency: (amount, opts) => formatCurrencyHelper(amount, { currencyCode: fallbackCode, ...opts }),
      convertFromUSD: (amount) => convertUsdHelper(amount, fallbackCode),
    };
  }
  return context;
}
