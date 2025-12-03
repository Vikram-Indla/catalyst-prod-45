// Currency configuration for Saudi Arabia
export const CURRENCY_CODE = 'SAR';
export const CURRENCY_SYMBOL = 'SAR';
export const CURRENCY_LOCALE = 'en-SA';

/**
 * Format a number as currency (SAR)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return `${CURRENCY_SYMBOL} 0.00`;
  }
  return `${CURRENCY_SYMBOL} ${value.toLocaleString(CURRENCY_LOCALE, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * Parse a currency string to number
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Format a number with currency symbol prefix for input display
 */
export function formatCurrencyInput(value: number): string {
  return value.toFixed(2);
}