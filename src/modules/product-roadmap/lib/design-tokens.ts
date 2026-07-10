/**
 * Catalyst Design System Tokens for Product Roadmap
 * These tokens ensure visual consistency across the roadmap module
 * V5 - Blue + Teal Professional Palette — DARK MODE ADS neutral dark mode
 */

export const catalystTokens = {
  // Brand - Catalyst V5 Blue
  brand: {
    primary: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
    primaryHover: 'var(--ds-text-brand)',
  },

  // Semantic Status
  status: {
    success: {
      base: 'var(--ds-chart-teal-bold)',
      bg: 'var(--ds-background-success)',
      text: 'var(--ds-text-success)',
    },
    warning: {
      base: 'var(--ds-text-warning)',
      bg: 'var(--ds-background-warning-bold)',
      text: 'var(--ds-background-warning-bold)',
    },
    danger: {
      base: 'var(--ds-text-danger)',
      bg: 'var(--ds-background-danger)',
      text: 'var(--ds-text-danger)',
    },
    info: {
      base: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
      bg: 'var(--ds-background-information)',
      text: 'var(--ds-background-brand-bold-hovered)',
    },
  },

  // Secondary Palette (Product Colors)
  secondary: {
    blue: {
      base: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
      bg: 'var(--ds-background-information)',
    },
    teal: {
      base: 'var(--ds-chart-teal-bold)',
      bg: 'var(--ds-background-success)',
    },
    olive: {
      base: 'var(--ds-chart-teal-bold)',
      bg: 'var(--ds-background-success)',
    },
    bronze: {
      base: 'var(--ds-text-subtlest)',
      bg: 'rgba(107, 114, 128, 0.15)', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
    },
    champagne: {
      base: 'var(--ds-text-disabled)',
      bg: 'var(--ds-text-disabled)',
    },
    grey: {
      base: 'var(--ds-border)',
      bg: 'rgba(200, 204, 208, 0.15)', // ads-scanner:ignore-line — semi-transparent overlay, no ADS token for alpha variant
    },
  },

  // Light Mode
  light: {
    text: {
      primary: 'var(--ds-surface)',
      secondary: 'var(--ds-text-subtle)',
      muted: 'var(--ds-text-subtlest)',
    },
    surface: {
      bg: 'var(--ds-surface-sunken)',
      card: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
      hover: 'var(--ds-background-neutral)',
      active: 'var(--ds-background-information)',
    },
    border: {
      default: 'var(--ds-border)',
      subtle: 'var(--ds-background-neutral)',
      strong: 'var(--ds-background-neutral-hovered)',
    },
  },

  // Dark Mode — DARK MODE ADS neutral
  dark: {
    text: {
      primary: 'var(--ds-text, var(--cp-bg-neutral))',
      secondary: 'var(--ds-text-subtlest)',
      muted: 'var(--ds-text-subtlest, var(--cp-text-secondary))',
    },
    surface: {
      bg: 'var(--ds-surface)',
      card: 'var(--ds-surface-raised, var(--cp-ink-1))',
      hover: 'var(--ds-surface-raised, var(--cp-ink-1))',
      active: 'var(--ds-background-information-bold)',
    },
    border: {
      default: 'var(--ds-surface)',
      subtle: 'var(--ds-surface)',
      strong: 'var(--ds-surface)',
    },
  },
} as const;

// Timeline bar colors by product - Catalyst V5 palette
export const PRODUCT_COLORS: Record<string, string> = {
  MINI: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',  // Primary blue
  SEN: 'var(--ds-chart-teal-bold)',   // Teal/Success
  ENT: 'var(--ds-text-subtlest)',   // Neutral gray
  UNA: 'var(--ds-text-subtle)',   // Muted gray
};

// Get color for a product, with fallback
export function getProductColor(productCode: string | null): string {
  if (!productCode) return PRODUCT_COLORS.UNA;
  return PRODUCT_COLORS[productCode] || catalystTokens.brand.primary;
}

// Timeline grid colors — DARK MODE
export const TIMELINE_COLORS = {
  gridLine: 'var(--ds-surface)',
  gridLineDark: 'var(--ds-surface)',
  todayLine: 'var(--ds-text-danger)',      // Danger red
  milestoneMarker: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', // Primary blue
  barDefault: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',      // Primary blue
  barHover: 'var(--ds-text-brand)',        // Primary hover
};
