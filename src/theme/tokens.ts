/**
 * Catalyst Design Tokens - Atlassian-aligned semantic system
 * 
 * This file defines the semantic token layer that maps to CSS variables.
 * Use these tokens for consistent styling across all components.
 */

// ============================================
// SPACING SCALE (8px base)
// ============================================
export const spacing = {
  none: '0',
  '0.5': '2px',    // 0.25 unit
  '1': '4px',      // 0.5 unit
  '1.5': '6px',    // 0.75 unit
  '2': '8px',      // 1 unit (base)
  '2.5': '10px',   // 1.25 units
  '3': '12px',     // 1.5 units
  '4': '16px',     // 2 units
  '5': '20px',     // 2.5 units
  '6': '24px',     // 3 units
  '8': '32px',     // 4 units
  '10': '40px',    // 5 units
  '12': '48px',    // 6 units
  '16': '64px',    // 8 units
} as const;

// ============================================
// SURFACE TOKENS
// ============================================
export const surface = {
  // App-level surfaces
  app: 'hsl(var(--background))',           // Main app background
  sunken: 'hsl(var(--neutral-50))',        // Recessed areas
  raised: 'hsl(var(--card))',              // Cards, panels
  overlay: 'hsl(var(--popover))',          // Modals, popovers, drawers
  
  // Interactive surfaces
  hovered: 'hsl(var(--accent))',
  pressed: 'hsl(var(--accent))',
  selected: 'hsl(var(--brand-gold-pale))', // Selected state background
  
  // Brand surfaces
  brandSubtle: 'hsl(var(--brand-gold-pale))',
  brand: 'hsl(var(--brand-gold))',
} as const;

// ============================================
// TEXT TOKENS
// ============================================
export const text = {
  // Primary text hierarchy
  primary: 'hsl(var(--text-primary))',     // Main body text
  secondary: 'hsl(var(--text-secondary))', // Secondary info
  tertiary: 'hsl(var(--text-tertiary))',   // Placeholders, hints
  muted: 'hsl(var(--text-muted))',         // Disabled, very subtle
  
  // Inverse (on dark backgrounds)
  inverse: 'hsl(var(--text-inverse))',
  
  // Brand text
  brand: 'hsl(var(--brand-gold))',
  brandHover: 'hsl(var(--brand-gold-hover))',
  
  // Link text
  link: 'hsl(var(--brand-gold))',
  linkHover: 'hsl(var(--brand-gold-hover))',
} as const;

// ============================================
// BORDER TOKENS
// ============================================
export const border = {
  // Structural borders
  default: 'hsl(var(--border))',
  subtle: 'hsl(var(--neutral-100))',
  strong: 'hsl(var(--neutral-300))',
  
  // Focus ring
  focus: 'hsl(var(--ring))',
  
  // Brand borders
  brand: 'hsl(var(--brand-gold-border))',
  brandSolid: 'hsl(var(--brand-gold))',
} as const;

// ============================================
// ELEVATION (SHADOWS)
// ============================================
export const elevation = {
  none: 'none',
  sm: 'var(--shadow-sm)',                  // Subtle lift
  md: 'var(--shadow-md)',                  // Cards, raised surfaces
  lg: 'var(--shadow-lg)',                  // Dropdowns, popovers
  xl: 'var(--shadow-xl)',                  // Modals, drawers
  overlay: '0 0 0 1px hsl(var(--border)), var(--shadow-xl)', // Overlay components
} as const;

// ============================================
// RADIUS SCALE
// ============================================
export const radius = {
  none: '0',
  xs: '2px',
  sm: '4px',       // Small elements, inputs
  md: '6px',       // Cards, buttons
  lg: '8px',       // Large panels
  xl: '12px',      // Modals, drawers
  full: '9999px',  // Pills, avatars
} as const;

// ============================================
// TYPOGRAPHY
// ============================================
export const typography = {
  // Font families
  fontFamily: {
    sans: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  },
  
  // Font sizes
  fontSize: {
    xs: '11px',      // Helpers, badges
    sm: '12px',      // Grid cells, secondary
    base: '13px',    // Default body
    md: '14px',      // Row titles
    lg: '16px',      // Page titles
    xl: '18px',      // Section headers
    '2xl': '20px',   // Main headings
    '3xl': '24px',   // Hero headings
  },
  
  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Line heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
  },
} as const;

// ============================================
// LAYOUT MEASUREMENTS
// ============================================
export const layout = {
  // Header/Nav
  headerHeight: '56px',
  pageHeaderHeight: '56px',
  
  // Sidebar
  sidebarWidthCollapsed: '56px',
  sidebarWidthExpanded: '240px',
  
  // Navigation
  navItemHeight: '32px',
  navItemHeightCompact: '28px',
  
  // Grid/Table
  gridRowHeight: '32px',
  gridHeaderHeight: '40px',
  
  // Modal/Drawer widths
  drawerWidthNarrow: '360px',
  drawerWidthMedium: '480px',
  drawerWidthWide: '640px',
  
  modalWidthSm: '384px',
  modalWidthMd: '512px',
  modalWidthLg: '640px',
  modalWidthXl: '768px',
  
  // Content
  contentMaxWidth: '1200px',
  contentPadding: '24px',
} as const;

// ============================================
// TRANSITIONS
// ============================================
export const transitions = {
  fast: '100ms',
  normal: '150ms',
  slow: '200ms',
  slower: '300ms',
  
  // Easing
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ============================================
// Z-INDEX SCALE
// ============================================
export const zIndex = {
  base: '0',
  dropdown: '50',
  sticky: '100',
  fixed: '150',
  overlay: '200',
  modal: '250',
  popover: '300',
  tooltip: '400',
  notification: '500',
} as const;

// ============================================
// INTERACTIVE STATES
// ============================================
export const interactive = {
  // Default state
  default: {
    background: 'transparent',
    text: 'hsl(var(--foreground))',
    border: 'hsl(var(--border))',
  },
  
  // Hover state
  hovered: {
    background: 'hsl(var(--accent))',
    text: 'hsl(var(--accent-foreground))',
  },
  
  // Pressed/Active state
  pressed: {
    background: 'hsl(var(--accent))',
    text: 'hsl(var(--accent-foreground))',
  },
  
  // Selected state
  selected: {
    background: 'hsl(var(--brand-gold-pale))',
    text: 'hsl(var(--brand-gold))',
    border: 'hsl(var(--brand-gold))',
  },
  
  // Disabled state
  disabled: {
    background: 'transparent',
    text: 'hsl(var(--text-muted))',
    opacity: '0.5',
  },
  
  // Focus state
  focus: {
    ring: '0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring))',
    ringInset: 'inset 0 0 0 2px hsl(var(--ring))',
  },
} as const;

// Export all tokens
export const tokens = {
  spacing,
  surface,
  text,
  border,
  elevation,
  radius,
  typography,
  layout,
  transitions,
  zIndex,
  interactive,
} as const;

export default tokens;
