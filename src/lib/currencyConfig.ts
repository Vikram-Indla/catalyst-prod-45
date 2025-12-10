// Centralized system currency configuration
// Used across all modules for consistent currency display

export const SYSTEM_CURRENCY = {
  code: 'SAR',
  symbol: 'ر.س',
  name: 'Saudi Riyal',
  locale: 'en-SA',
} as const;

export type CurrencyConfig = typeof SYSTEM_CURRENCY;

/**
 * Format a number as currency using the system currency
 */
export function formatCurrency(value: number): string {
  return `${SYSTEM_CURRENCY.code} ${value.toLocaleString(SYSTEM_CURRENCY.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Get currency display label for metric type displays
 */
export function getCurrencyLabel(): string {
  return SYSTEM_CURRENCY.code;
}
