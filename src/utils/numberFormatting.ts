import { formatCurrency as formatCurrencyService, FormatCurrencyOptions } from '../services/currency';

export { formatCurrencyService as formatCurrency };
export type { FormatCurrencyOptions };

/**
 * Universal Number & Currency Formatting Utilities
 * Supports intelligent compact formatting (K, M, B, T) and zero-safe handling.
 */

export interface NumberFormatOptions {
  decimals?: number;
  minDecimals?: number;
  maxDecimals?: number;
  trimTrailingZeros?: boolean;
}

/**
 * Safely clamps fraction digits to the valid ECMAScript range [0, 20],
 * ensuring maximumFractionDigits is never less than minimumFractionDigits
 * to prevent RangeError: maximumFractionDigits value is out of range.
 */
export function safeFractionDigits(
  min?: number,
  max?: number,
  fallbackMin = 0,
  fallbackMax = 2
): { minimumFractionDigits: number; maximumFractionDigits: number } {
  let minDigits = typeof min === 'number' && !isNaN(min) && isFinite(min) ? Math.floor(min) : fallbackMin;
  let maxDigits = typeof max === 'number' && !isNaN(max) && isFinite(max) ? Math.floor(max) : fallbackMax;

  // Clamp both to [0, 20] range supported universally by Intl.NumberFormat
  minDigits = Math.max(0, Math.min(20, minDigits));
  maxDigits = Math.max(0, Math.min(20, maxDigits));

  // Ensure maximum is never lower than minimum
  if (maxDigits < minDigits) {
    maxDigits = minDigits;
  }

  return { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits };
}

/**
 * Safe wrapper around toLocaleString that guarantees no RangeError is thrown
 */
export function safeLocaleString(
  value: number | string | undefined | null,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
  locale: string = 'en-US'
): string {
  const num = parseCleanNumber(value);
  try {
    const digits = safeFractionDigits(
      options?.minimumFractionDigits,
      options?.maximumFractionDigits,
      0,
      2
    );
    return num.toLocaleString(locale, digits);
  } catch {
    try {
      return num.toLocaleString(locale);
    } catch {
      return String(num);
    }
  }
}

/**
 * Parses any numerical or string input into a valid float number.
 */
export function parseCleanNumber(value: number | string | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? 0 : value;
  }
  const cleanStr = String(value).replace(/,/g, '').replace(/[$% ]/g, '').trim();
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
}

/**
 * Formats a number with smart compact notation:
 * - 0 -> "0" (or "0.00" if minDecimals is specified)
 * - < 1,000 -> "100" or "100.00" or "250.75"
 * - 1,000 - 999,999 -> "1K", "1.25K", "125.76K", "999K"
 * - 1,000,000 - 999,999,999 -> "1M", "1.5M", "340M", "340.5M"
 * - 1,000,000,000 - 999,999,999,999 -> "1B", "2.4B", "4.11B"
 * - >= 1,000,000,000,000 -> "1T", "1.1T"
 */
export function formatSmartNumber(
  value: number | string | undefined | null,
  options: NumberFormatOptions = {}
): string {
  const num = parseCleanNumber(value);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  if (absNum === 0) {
    if (options.minDecimals !== undefined && options.minDecimals > 0) {
      const clamped = Math.max(0, Math.min(20, Math.floor(options.minDecimals)));
      return (0).toFixed(clamped);
    }
    return '0';
  }

  let formatted = '';
  let suffix = '';

  if (absNum >= 1_000_000_000_000) {
    // Trillions
    suffix = 'T';
    const valInT = absNum / 1_000_000_000_000;
    formatted = formatCompactUnit(valInT, options.decimals ?? 2);
  } else if (absNum >= 1_000_000_000) {
    // Billions
    suffix = 'B';
    const valInB = absNum / 1_000_000_000;
    formatted = formatCompactUnit(valInB, options.decimals ?? 2);
  } else if (absNum >= 1_000_000) {
    // Millions
    suffix = 'M';
    const valInM = absNum / 1_000_000;
    formatted = formatCompactUnit(valInM, options.decimals ?? 2);
  } else if (absNum >= 1_000) {
    // Thousands
    suffix = 'K';
    const valInK = absNum / 1_000;
    formatted = formatCompactUnit(valInK, options.decimals ?? 2);
  } else {
    // Standard < 1,000
    const fallbackDec = absNum < 1 && absNum > 0 ? 4 : 2;
    const defaultDec = options.decimals ?? fallbackDec;
    const minDec = options.minDecimals ?? (Number.isInteger(absNum) ? 0 : Math.min(2, defaultDec));
    const maxDec = options.maxDecimals ?? Math.max(minDec, defaultDec);

    if (options.trimTrailingZeros !== false) {
      formatted = safeLocaleString(absNum, safeFractionDigits(minDec, maxDec, 0, 2));
    } else {
      const clampedDec = Math.max(0, Math.min(20, Math.floor(defaultDec)));
      formatted = absNum.toFixed(clampedDec);
    }
  }

  return `${isNegative ? '-' : ''}${formatted}${suffix}`;
}

/**
 * Formats a currency value smartly:
 * - 0 -> "$0" or "$0.00" (NEVER "$0.0M" or "$0.0K")
 * - 100 -> "$100" or "$100.00"
 * - 1,250 -> "$1.25K" (or "€1.15K" if EUR)
 * - 340,000,000 -> "$340M" or "$340.5M"
 * - 2,400,000,000 -> "$2.4B"
 */
export function formatSmartCurrency(
  value: number | string | undefined | null,
  options: FormatCurrencyOptions = {}
): string {
  return formatCurrencyService(value, options);
}

/**
 * Formats a token total supply string/number from database column total_supply.
 * Reads properly without hardcoding and appends symbol.
 */
export function formatTokenSupply(
  supply: number | string | undefined | null,
  symbol?: string,
  useCompact: boolean = true
): string {
  if (supply === undefined || supply === null || supply === '') {
    return symbol ? `0.00 ${symbol}` : '0.00';
  }

  const cleanNum = parseCleanNumber(supply);
  const symSuffix = symbol ? ` ${symbol}` : '';

  if (cleanNum === 0) {
    // If supply is non-zero string like "Uncapped" or custom text
    const str = String(supply).trim();
    if (str && isNaN(parseFloat(str.replace(/,/g, '')))) {
      return `${str}${symSuffix}`;
    }
    return `0.00${symSuffix}`;
  }

  if (useCompact && cleanNum >= 1000) {
    return `${formatSmartNumber(cleanNum)}${symSuffix}`;
  }

  return `${safeLocaleString(cleanNum, safeFractionDigits(Number.isInteger(cleanNum) ? 0 : 2, 2))}${symSuffix}`;
}

/**
 * Calculates USD valuation of a token supply
 */
export function calculateTokenUsdValue(
  supply: number | string | undefined | null,
  priceUsd: number | undefined | null,
  marketCapUsd?: number | undefined | null
): string {
  if (marketCapUsd && marketCapUsd > 0) {
    return formatSmartCurrency(marketCapUsd);
  }
  const cleanSupply = parseCleanNumber(supply);
  const cleanPrice = parseCleanNumber(priceUsd);
  if (cleanSupply > 0 && cleanPrice > 0) {
    return formatSmartCurrency(cleanSupply * cleanPrice);
  }
  if (cleanPrice > 0) {
    return formatSmartCurrency(cleanPrice);
  }
  return '$0.00';
}

/**
 * Helper to format compact unit numbers cleanly without redundant trailing zeros
 * e.g. 340.0 -> "340", 340.5 -> "340.5", 1.25 -> "1.25"
 */
function formatCompactUnit(val: number, maxDecimals: number = 2): string {
  const safeMax = Math.max(0, Math.min(20, Math.floor(maxDecimals)));
  const multiplier = Math.pow(10, safeMax);
  const rounded = Math.round(val * multiplier) / multiplier;

  // If rounded has decimals, show up to maxDecimals without useless trailing zeroes
  if (Number.isInteger(rounded)) {
    return rounded.toString();
  }

  return safeLocaleString(rounded, safeFractionDigits(0, safeMax, 0, 2));
}
