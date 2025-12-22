/**
 * Catalyst Design System Tokens for Product Roadmap
 * These tokens ensure visual consistency across the roadmap module
 */

export const catalystTokens = {
  // Brand
  brand: {
    primary: '#c69c6d',
    primaryHover: '#b8894d',
  },

  // Semantic Status
  status: {
    success: {
      base: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.1)',
      text: '#15803d',
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
      base: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      text: '#1d4ed8',
    },
  },

  // Secondary Palette (Product Colors)
  secondary: {
    olive: {
      base: '#5c7c5c',
      bg: 'rgba(92, 124, 92, 0.15)',
    },
    bronze: {
      base: '#8b7355',
      bg: 'rgba(139, 115, 85, 0.15)',
    },
    champagne: {
      base: '#d4b896',
      bg: 'rgba(212, 184, 150, 0.2)',
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
      bg: '#faf7f1',
      card: '#ffffff',
      hover: '#f0f0f0',
      active: 'rgba(198, 156, 109, 0.12)',
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
      active: 'rgba(198, 156, 109, 0.2)',
    },
    border: {
      default: '#2a2a2a',
      subtle: '#1f1f1f',
      strong: '#404040',
    },
  },
} as const;

// Timeline bar colors by product
export const PRODUCT_COLORS: Record<string, string> = {
  MINI: '#c69c6d',
  SEN: '#5c7c5c',
  ENT: '#8b7355',
  UNA: '#c8ccd0',
};

// Get color for a product, with fallback
export function getProductColor(productCode: string | null): string {
  if (!productCode) return PRODUCT_COLORS.UNA;
  return PRODUCT_COLORS[productCode] || catalystTokens.brand.primary;
}

// Timeline grid colors
export const TIMELINE_COLORS = {
  gridLine: 'rgba(0, 0, 0, 0.06)',
  gridLineDark: 'rgba(255, 255, 255, 0.06)',
  todayLine: '#ef4444',
  milestoneMarker: '#c69c6d',
  barDefault: '#c69c6d',
  barHover: '#b8894d',
};
