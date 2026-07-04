/**
 * Astryx adapter — barrel export
 *
 * Consumers import from '@/modules/strategy/astryx' only.
 * Internal files (CSS, config) stay private.
 */

export { AstryxZone } from './AstryxProvider';
export { useAstryxTheme, type AstryxThemeState } from './useAstryxTheme';
export { ASTRYX_TOKEN_MAP } from './config/astryx-token-map';
