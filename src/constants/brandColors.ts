/**
 * Catalyst Brand Color Palette V5
 * Single source of truth for all brand colors used in Color Tag selectors
 * 
 * Blue + Teal Professional Palette
 */

export const CATALYST_BRAND_COLORS = [
  { value: 'var(--ds-text-brand, #2563eb)', label: 'Blue', token: 'brand-primary' },
  { value: '#0d9488', label: 'Teal', token: 'brand-teal' },
  { value: '#6b7280', label: 'Gray', token: 'secondary-grey' },
  { value: 'var(--ds-text-subtlest, #64748b)', label: 'Slate', token: 'secondary-slate' },
  { value: '#c8ccd0', label: 'Light Grey', token: 'secondary-light-grey' },
] as const;

export type CatalystBrandColor = typeof CATALYST_BRAND_COLORS[number]['value'];

// Default color for new themes
export const DEFAULT_THEME_COLOR = 'var(--ds-text-brand, #2563eb)';
