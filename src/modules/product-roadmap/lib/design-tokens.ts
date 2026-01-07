/**
 * Catalyst Design System Tokens for Product Roadmap
 * These tokens ensure visual consistency across the roadmap module
 * V5 - Blue + Teal Professional Palette
 */

export const catalystTokens = {
  // Brand - Neutral authority
  brand: {
    primary: 'hsl(var(--foreground))',
    primaryHover: 'hsl(var(--muted-foreground))',
  },

  // Semantic Status
  status: {
    success: {
      base: '#0d9488',
      bg: 'rgba(13, 148, 136, 0.1)',
      text: '#115e59',
    },
    warning: {
      base: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
      text: '#b45309',
    },
    danger: {
      base: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      text: '#b91c1c',
    },
    info: {
      base: '#2563eb',
      bg: 'rgba(37, 99, 235, 0.1)',
      text: '#1d4ed8',
    },
  },

  // Secondary Palette (Product Colors)
  secondary: {
    blue: {
      base: '#2563eb',
      bg: 'rgba(37, 99, 235, 0.15)',
    },
    teal: {
      base: '#0d9488',
      bg: 'rgba(13, 148, 136, 0.15)',
    },
    olive: {
      base: '#0d9488',
      bg: 'rgba(13, 148, 136, 0.15)',
    },
    bronze: {
      base: '#6b7280',
      bg: 'rgba(107, 114, 128, 0.15)',
    },
    champagne: {
      base: '#9ca3af',
      bg: 'rgba(156, 163, 175, 0.2)',
    },
    grey: {
      base: '#c8ccd0',
      bg: 'rgba(200, 204, 208, 0.15)',
    },
  },

  // Light Mode
  light: {
    text: {
      primary: '#0a0a0a',
      secondary: '#525252',
      muted: '#737373',
    },
    surface: {
      bg: '#fafafa',
      card: '#ffffff',
      hover: '#f0f0f0',
      active: 'rgba(37, 99, 235, 0.12)',
    },
    border: {
      default: '#e5e5e5',
      subtle: '#f0f0f0',
      strong: '#d4d4d4',
    },
  },

  // Dark Mode
  dark: {
    text: {
      primary: '#fafafa',
      secondary: '#a3a3a3',
      muted: '#737373',
    },
    surface: {
      bg: '#0a0a0a',
      card: '#171717',
      hover: '#2a2a2a',
      active: 'rgba(59, 130, 246, 0.2)',
    },
    border: {
      default: '#2a2a2a',
      subtle: '#1f1f1f',
      strong: '#404040',
    },
  },
} as const;

// Timeline bar colors by product - Neutral grayscale
export const PRODUCT_COLORS: Record<string, string> = {
  MINI: 'hsl(var(--foreground))',
  SEN: 'hsl(var(--muted-foreground))',
  ENT: 'hsl(var(--muted-foreground) / 0.7)',
  UNA: 'hsl(var(--muted-foreground) / 0.4)',
};

// Get color for a product, with fallback
export function getProductColor(productCode: string | null): string {
  if (!productCode) return PRODUCT_COLORS.UNA;
  return PRODUCT_COLORS[productCode] || catalystTokens.brand.primary;
}

// Timeline grid colors - Neutral
export const TIMELINE_COLORS = {
  gridLine: 'hsl(var(--border) / 0.5)',
  gridLineDark: 'hsl(var(--border) / 0.5)',
  todayLine: 'hsl(var(--foreground))',
  milestoneMarker: 'hsl(var(--foreground))',
  barDefault: 'hsl(var(--foreground))',
  barHover: 'hsl(var(--muted-foreground))',
};
