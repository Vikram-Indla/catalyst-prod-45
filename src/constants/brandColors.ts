/**
 * Catalyst Brand Color Palette
 * Single source of truth for all brand colors used in Color Tag selectors
 * 
 * NO blues, purples, pinks, or other non-brand colors allowed.
 * These are derived from the Catalyst brand palette (Golden Hour theme).
 */

export const CATALYST_BRAND_COLORS = [
  { value: '#c69c6d', label: 'Gold', token: 'brand-primary' },
  { value: '#5c7c5c', label: 'Olive Green', token: 'secondary-green' },
  { value: '#8b7355', label: 'Bronze', token: 'secondary-bronze' },
  { value: '#d4b896', label: 'Champagne', token: 'secondary-champagne' },
  { value: '#c8ccd0', label: 'Grey', token: 'secondary-grey' },
] as const;

export type CatalystBrandColor = typeof CATALYST_BRAND_COLORS[number]['value'];

// Default color for new themes
export const DEFAULT_THEME_COLOR = '#c69c6d';
