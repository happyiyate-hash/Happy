import { parseCleanNumber, formatSmartNumber, NumberFormatOptions, safeLocaleString, safeFractionDigits } from '../utils/numberFormatting';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  rate: number; // 1 USD = rate units in target currency
  position: 'prefix' | 'suffix';
  flag: string;
  defaultDecimals: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rate: 1.0,
    position: 'prefix',
    flag: '🇺🇸',
    defaultDecimals: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rate: 0.92,
    position: 'prefix',
    flag: '🇪🇺',
    defaultDecimals: 2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    rate: 0.79,
    position: 'prefix',
    flag: '🇬🇧',
    defaultDecimals: 2,
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    rate: 155.0,
    position: 'prefix',
    flag: '🇯🇵',
    defaultDecimals: 0,
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    rate: 1.37,
    position: 'prefix',
    flag: '🇨🇦',
    defaultDecimals: 2,
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    rate: 1.52,
    position: 'prefix',
    flag: '🇦🇺',
    defaultDecimals: 2,
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF ',
    name: 'Swiss Franc',
    rate: 0.90,
    position: 'prefix',
    flag: '🇨🇭',
    defaultDecimals: 2,
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    rate: 7.24,
    position: 'prefix',
    flag: '🇨🇳',
    defaultDecimals: 2,
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    rate: 83.5,
    position: 'prefix',
    flag: '🇮🇳',
    defaultDecimals: 2,
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian Real',
    rate: 5.40,
    position: 'prefix',
    flag: '🇧🇷',
    defaultDecimals: 2,
  },
};

export const CURRENCIES_LIST: CurrencyConfig[] = Object.values(SUPPORTED_CURRENCIES);

export const PREFERENCES_STORAGE_KEY = 'tokencare_preferences';
export const DIRECT_CURRENCY_STORAGE_KEY = 'tokencare_currency';

/**
 * Retrieves the currently saved currency code from localStorage or defaults to 'USD'
 */
export function getSavedCurrency(): string {
  if (typeof window === 'undefined') return 'USD';
  try {
    const direct = localStorage.getItem(DIRECT_CURRENCY_STORAGE_KEY);
    if (direct && SUPPORTED_CURRENCIES[String(direct).toUpperCase()]) {
      return String(direct).toUpperCase();
    }
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.currency && SUPPORTED_CURRENCIES[String(parsed.currency).toUpperCase()]) {
        return String(parsed.currency).toUpperCase();
      }
    }
  } catch (e) {
    console.warn('[Currency] Error reading currency preference:', e);
  }
  return 'USD';
}

/**
 * Saves currency preference to localStorage under 'tokencare_preferences'
 * (matching existing preference schema) and dispatches a change event.
 */
export function saveCurrencyPreference(currencyCode: string): void {
  if (typeof window === 'undefined' || !currencyCode) return;
  const upper = String(currencyCode).toUpperCase();
  if (!SUPPORTED_CURRENCIES[upper]) return;

  try {
    localStorage.setItem(DIRECT_CURRENCY_STORAGE_KEY, upper);

    // Save in compound tokencare_preferences object
    const existing = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    const parsed = existing ? JSON.parse(existing) : {};
    parsed.currency = upper;
    parsed.updatedAt = new Date().toISOString();
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(parsed));

    // Dispatch custom event for real-time reactivity
    window.dispatchEvent(
      new CustomEvent('tokencare:currency_changed', {
        detail: { currency: upper, config: SUPPORTED_CURRENCIES[upper] },
      })
    );
  } catch (e) {
    console.warn('[Currency] Error saving currency preference:', e);
  }
}

/**
 * Converts a base USD numeric value to the target currency based on exchange rate multiplier.
 */
export function convertUsdToCurrency(
  amountInUSD: number | string | undefined | null,
  targetCurrencyCode?: string
): number {
  const num = parseCleanNumber(amountInUSD);
  const code = String(targetCurrencyCode || getSavedCurrency() || 'USD').toUpperCase();
  const config = SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.USD;
  return num * config.rate;
}

export interface FormatCurrencyOptions extends NumberFormatOptions {
  currencyCode?: string;
  showCode?: boolean; // e.g. "$100 USD"
  compact?: boolean;  // whether to format large numbers as 1.2M, 2.4B (defaults to true)
}

/**
 * Helper utility formatCurrency(amountInUSD, options?) that:
 * 1. Takes a base USD value
 * 2. Converts it based on the active (or requested) currency state
 * 3. Formats it cleanly with the appropriate symbol ($ , € , £, etc.) and decimal places.
 *
 * Examples:
 * - formatCurrency(1250) -> "$1.25K" (or "€1.15K" in EUR)
 * - formatCurrency(0) -> "$0"
 * - formatCurrency(340000000) -> "$340M"
 * - formatCurrency(0.1342, { minDecimals: 3 }) -> "$0.134"
 */
export function formatCurrency(
  amountInUSD: number | string | undefined | null,
  options: FormatCurrencyOptions = {}
): string {
  const code = String(options.currencyCode || getSavedCurrency() || 'USD').toUpperCase();
  const config = SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.USD;
  const num = parseCleanNumber(amountInUSD);
  const converted = num * config.rate;
  const isNegative = converted < 0;
  const absNum = Math.abs(converted);

  // Exact 0 handling
  if (absNum === 0) {
    const zeroDecimals = options.minDecimals !== undefined
      ? Math.max(0, Math.min(20, Math.floor(options.minDecimals)))
      : 0;
    const zeroStr = zeroDecimals > 0 ? (0).toFixed(zeroDecimals) : '0';
    return config.position === 'prefix'
      ? `${config.symbol}${zeroStr}${options.showCode ? ` ${config.code}` : ''}`
      : `${zeroStr} ${config.symbol}${options.showCode ? ` ${config.code}` : ''}`;
  }

  // Very small micro-amounts
  if (absNum < 0.0001 && absNum > 0) {
    const expStr = absNum.toExponential(2);
    const result = `${isNegative ? '-' : ''}${config.symbol}${expStr}`;
    return options.showCode ? `${result} ${config.code}` : result;
  }

  // Values under 1000: standard precision formatting
  if (absNum < 1000) {
    const fallbackDec = config.defaultDecimals === 0 ? 0 : (absNum < 1 ? 4 : 2);
    const minDec = options.minDecimals ?? (config.defaultDecimals === 0 ? 0 : (Number.isInteger(absNum) ? 0 : Math.min(2, fallbackDec)));
    const maxDec = options.maxDecimals ?? Math.max(minDec, fallbackDec);

    const formatted = safeLocaleString(absNum, safeFractionDigits(minDec, maxDec, 0, 2));

    const sign = isNegative ? '-' : '';
    const body = config.position === 'prefix'
      ? `${sign}${config.symbol}${formatted}`
      : `${sign}${formatted} ${config.symbol}`;

    return options.showCode ? `${body} ${config.code}` : body;
  }

  // Values >= 1000: dynamic smart magnitude formatting (K, M, B, T)
  const isCompact = options.compact !== false;
  if (isCompact) {
    const smartFormatted = formatSmartNumber(absNum, options);
    const sign = isNegative ? '-' : '';
    const body = config.position === 'prefix'
      ? `${sign}${config.symbol}${smartFormatted}`
      : `${sign}${smartFormatted} ${config.symbol}`;

    return options.showCode ? `${body} ${config.code}` : body;
  } else {
    const minDec = options.minDecimals ?? 2;
    const maxDec = options.maxDecimals ?? Math.max(minDec, 2);
    const formatted = safeLocaleString(absNum, safeFractionDigits(minDec, maxDec, 2, 2));
    const sign = isNegative ? '-' : '';
    const body = config.position === 'prefix'
      ? `${sign}${config.symbol}${formatted}`
      : `${sign}${formatted} ${config.symbol}`;

    return options.showCode ? `${body} ${config.code}` : body;
  }
}
