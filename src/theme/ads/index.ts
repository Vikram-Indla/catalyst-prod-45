/**
 * ADS Theme — barrel export.
 *
 * Consumers import from '@/theme/ads'. Never reach into individual files
 * from outside this folder — the contract is this barrel plus the named
 * tokens in tokens.ts.
 */
export { AdsThemeProvider } from './AdsThemeProvider';
export { adsTokens, cp, resolved, atlaskitCustomColors } from './tokens';
export type { AdsToken } from './tokens';
