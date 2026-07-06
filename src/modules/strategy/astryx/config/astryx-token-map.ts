/**
 * Astryx Token Map — ADS ↔ Astryx bridging spec
 *
 * Defines the contract between Astryx design tokens and Catalyst ADS tokens.
 * Used to populate AstryCSSScope.module.css and for component prop validation.
 *
 * Light mode only (Phase 0). Dark mode mappings added later.
 */

export const ASTRYX_TOKEN_MAP = {
  // ─ Colors: Accents & Interaction ─
  color: {
    accent: 'var(--ds-text-brand)',
    accentMuted: 'var(--ds-background-brand-bold)',
    onAccent: 'var(--ds-text)',

    // ─ Surfaces ─
    backgroundSurface: 'var(--ds-surface)',
    backgroundBody: 'var(--ds-surface-sunken)',
    backgroundCard: 'var(--ds-surface-raised)',
    backgroundMuted: 'var(--ds-surface-sunken)',

    // ─ Text ─
    textPrimary: 'var(--ds-text)',
    textSecondary: 'var(--ds-text-subtle)',
    textDisabled: 'var(--ds-text-subtlest)',
    textAccent: 'var(--ds-text-brand)',

    // ─ Icons ─
    iconPrimary: 'var(--ds-icon)',
    iconSecondary: 'var(--ds-icon-subtle)',
    iconDisabled: 'var(--ds-icon-subtle)',
    iconAccent: 'var(--ds-icon)',

    // ─ Borders ─
    border: 'var(--ds-border)',
    borderEmphasized: 'var(--ds-border-bold)',
    borderFocused: 'var(--ds-border-focused)',

    // ─ Status ─
    success: 'var(--ds-background-success)',
    successMuted: 'var(--ds-background-success)',
    onSuccess: 'var(--ds-text-success)',

    error: 'var(--ds-background-danger)',
    errorMuted: 'var(--ds-background-danger)',
    onError: 'var(--ds-text-danger)',

    warning: 'var(--ds-background-warning)',
    warningMuted: 'var(--ds-background-warning)',
    onWarning: 'var(--ds-text-warning)',

    information: 'var(--ds-background-information)',
    informationMuted: 'var(--ds-background-information)',
    onInformation: 'var(--ds-text-information)',
  },

  // ─ Typography ─
  typography: {
    fontFamilyBody: 'var(--font-family-body)',
    fontFamilyHeading: 'var(--font-family-heading)',
    fontFamilyCode: 'var(--font-family-code)',
  },

  // ─ Sizing & Spacing ─
  sizing: {
    borderWidth: '1px',
    radiusElement: '8px',
    radiusContainer: '12px',
  },

  spacing: {
    spacing0: '0px',
    spacing2: '8px',
    spacing4: '16px',
    spacing6: '24px',
    spacing8: '32px',
  },

  // ─ Shadows ─
  shadow: {
    low: 'var(--ds-shadow-overlay)',
    medium: 'var(--ds-shadow-overlay)',
    high: 'var(--ds-shadow-overlay)',
  },
} as const;

export type AstryxTokenMap = typeof ASTRYX_TOKEN_MAP;
