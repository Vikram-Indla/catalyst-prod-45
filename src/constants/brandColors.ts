/**
 * Catalyst Brand Color Palette V5
 * Single source of truth for all brand colors used in Color Tag selectors
 * 
 * Blue + Teal Professional Palette
 */

export const CATALYST_BRAND_COLORS = [
  { value: '#2563eb', label: 'Blue', token: 'brand-primary' },
  { value: '#0d9488', label: 'Teal', token: 'brand-teal' },
  { value: '#5c7c5c', label: 'Olive Green', token: 'secondary-olive' },
  { value: '#8b7355', label: 'Bronze', token: 'secondary-bronze' },
  { value: '#c8ccd0', label: 'Grey', token: 'secondary-grey' },
] as const;

export type CatalystBrandColor = typeof CATALYST_BRAND_COLORS[number]['value'];

// Default color for new themes
export const DEFAULT_THEME_COLOR = '#2563eb';
