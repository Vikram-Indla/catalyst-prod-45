/**
 * Catalyst Design System Tokens for Product Roadmap
 * These tokens ensure visual consistency across the roadmap module
 * V5 - Blue + Teal Professional Palette — DARK MODE ADS neutral dark mode
 */

export const catalystTokens = {
  // Brand - Catalyst V5 Blue
  brand: {
    primary: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))',
    primaryHover: 'var(--ds-text-brand, #3b82f6)',
  },

  // Semantic Status
  status: {
    success: {
      base: 'var(--ds-chart-teal-bold, #0d9488)',
      bg: 'var(--ds-background-success, rgba(13, 148, 136, 0.1))',
      text: 'var(--ds-text-success, #216E4E)',
    },
    warning: {
      base: 'var(--ds-text-warning, #f59e0b)',
      bg: 'var(--ds-background-warning-bold, rgba(245, 158, 11, 0.1))',
      text: 'var(--ds-background-warning-bold, #b45309)',
    },
    danger: {
      base: 'var(--ds-text-danger, #ef4444)',
      bg: 'var(--ds-background-danger, rgba(239, 68, 68, 0.1))',
      text: 'var(--ds-text-danger, #AE2A19)',
    },
    info: {
      base: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))',
      bg: 'var(--ds-background-information, rgba(37, 99, 235, 0.1))',
      text: 'var(--ds-background-brand-bold-hovered, #1d4ed8)',
    },
  },

  // Secondary Palette (Product Colors)
  secondary: {
    blue: {
      base: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))',
      bg: 'var(--ds-background-information, rgba(37, 99, 235, 0.15))',
    },
    teal: {
      base: 'var(--ds-chart-teal-bold, #0d9488)',
      bg: 'var(--ds-background-success, rgba(13, 148, 136, 0.15))',
    },
    olive: {
      base: 'var(--ds-chart-teal-bold, #0d9488)',
      bg: 'var(--ds-background-success, rgba(13, 148, 136, 0.15))',
    },
    bronze: {
      base: 'var(--ds-text-subtlest, #626F86)',
      bg: 'rgba(107, 114, 128, 0.15)', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
    },
    champagne: {
      base: 'var(--ds-text-disabled, #8590A2)',
      bg: 'var(--ds-text-disabled, rgba(156, 163, 175, 0.2))',
    },
    grey: {
      base: 'var(--ds-border, #DFE1E6)',
      bg: 'rgba(200, 204, 208, 0.15)', // ads-scanner:ignore-line — semi-transparent overlay, no ADS token for alpha variant
    },
  },

  // Light Mode
  light: {
    text: {
      primary: 'var(--ds-surface, #0a0a0a)',
      secondary: 'var(--ds-text-subtle, #44546F)',
      muted: 'var(--ds-text-subtlest, #626F86)',
    },
    surface: {
      bg: 'var(--ds-surface-sunken, #FAFAFA)',
      card: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
      hover: 'var(--ds-background-neutral, #F0F0F0)',
      active: 'var(--ds-background-information, rgba(37, 99, 235, 0.12))',
    },
    border: {
      default: 'var(--ds-border, #DFE1E6)',
      subtle: 'var(--ds-background-neutral, #F0F0F0)',
      strong: 'var(--ds-background-neutral-hovered, #D4D4D4)',
    },
  },

  // Dark Mode — DARK MODE ADS neutral
  dark: {
    text: {
      primary: 'var(--ds-text, var(--cp-bg-neutral, #EDEDED))',
      secondary: 'var(--ds-text-subtlest, #A1A1A1)',
      muted: 'var(--ds-text-subtlest, var(--cp-text-secondary, #878787))',
    },
    surface: {
      bg: 'var(--ds-surface, #0A0A0A)',
      card: 'var(--ds-surface-raised, var(--cp-ink-1, #1A1A1A))',
      hover: 'var(--ds-surface-raised, var(--cp-ink-1, #1A1A1A))',
      active: 'var(--ds-background-information-bold, rgba(59, 130, 246, 0.2))',
    },
    border: {
      default: 'var(--ds-surface, rgba(255, 255, 255, 0.08))',
      subtle: 'var(--ds-surface, rgba(255, 255, 255, 0.05))',
      strong: 'var(--ds-surface, rgba(255, 255, 255, 0.12))',
    },
  },
} as const;

// Timeline bar colors by product - Catalyst V5 palette
export const PRODUCT_COLORS: Record<string, string> = {
  MINI: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))',  // Primary blue
  SEN: 'var(--ds-chart-teal-bold, #0d9488)',   // Teal/Success
  ENT: 'var(--ds-text-subtlest, #626F86)',   // Neutral gray
  UNA: 'var(--ds-text-subtle, #44546F)',   // Muted gray
};

// Get color for a product, with fallback
export function getProductColor(productCode: string | null): string {
  if (!productCode) return PRODUCT_COLORS.UNA;
  return PRODUCT_COLORS[productCode] || catalystTokens.brand.primary;
}

// Timeline grid colors — DARK MODE
export const TIMELINE_COLORS = {
  gridLine: 'var(--ds-surface, rgba(255, 255, 255, 0.05))',
  gridLineDark: 'var(--ds-surface, rgba(255, 255, 255, 0.05))',
  todayLine: 'var(--ds-text-danger, #ef4444)',      // Danger red
  milestoneMarker: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))', // Primary blue
  barDefault: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))',      // Primary blue
  barHover: 'var(--ds-text-brand, #3b82f6)',        // Primary hover
};
