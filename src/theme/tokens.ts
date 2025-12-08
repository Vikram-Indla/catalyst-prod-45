/**
 * Catalyst Design System - Semantic Tokens
 * Atlassian-aligned with Catalyst brand identity
 * 
 * These tokens map to CSS variables in index.css and provide
 * a consistent, theme-able design system.
 */

// ============================================
// SPACING SCALE (8px base unit)
// ============================================
export const spacing = {
  none: '0',
  '0.5': '2px',   // 0.25 unit
  '1': '4px',     // 0.5 unit
  '1.5': '6px',   // 0.75 unit
  '2': '8px',     // 1 unit (base)
  '2.5': '10px',  // 1.25 units
  '3': '12px',    // 1.5 units
  '4': '16px',    // 2 units
  '5': '20px',    // 2.5 units
  '6': '24px',    // 3 units
  '7': '28px',    // 3.5 units
  '8': '32px',    // 4 units
  '9': '36px',    // 4.5 units
  '10': '40px',   // 5 units
  '12': '48px',   // 6 units
  '14': '56px',   // 7 units
  '16': '64px',   // 8 units
} as const;

// ============================================
// SURFACE TOKENS
// ============================================
export const surface = {
  // App backgrounds (FIX A: Surface hierarchy)
  app: 'hsl(var(--background))',
  sunken: 'hsl(var(--surface-sunken))',         // #F9FAFB - sunken containers
  raised: 'hsl(var(--surface-raised))',         // #FFFFFF - raised cards
  backdrop: 'hsl(var(--surface-backdrop))',     // #F3F4F6 - dense container backdrop
  overlay: 'hsl(var(--popover))',
  
  // Interactive surfaces
  hovered: 'hsl(var(--accent))',
  pressed: 'hsl(var(--accent))',
  selected: 'hsl(var(--brand-gold-pale))',
  selectedHovered: 'hsl(35 46% 60% / 0.12)',
  
  // Brand surfaces
  brandSubtle: 'hsl(35 46% 60% / 0.08)',
  brandBold: 'hsl(var(--brand-gold))',
  
  // Status surfaces
  successSubtle: 'hsl(var(--success) / 0.1)',
  warningSubtle: 'hsl(var(--warning) / 0.1)',
  dangerSubtle: 'hsl(var(--destructive) / 0.1)',
  infoSubtle: 'hsl(var(--info) / 0.1)',
} as const;

// ============================================
// TEXT TOKENS
// ============================================
export const text = {
  // Primary text colors
  primary: 'hsl(var(--foreground))',
  secondary: 'hsl(var(--text-secondary))',
  tertiary: 'hsl(var(--text-tertiary))',
  disabled: 'hsl(var(--text-muted))',
  
  // Inverse text (on dark backgrounds)
  inverse: 'hsl(var(--text-inverse))',
  
  // Brand text
  brand: 'hsl(var(--brand-gold))',
  brandHover: 'hsl(var(--brand-gold-hover))',
  
  // Link text
  link: 'hsl(var(--brand-gold))',
  linkHover: 'hsl(var(--brand-gold-hover))',
  linkPressed: 'hsl(35 46% 50%)',
  
  // Status text
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  danger: 'hsl(var(--destructive))',
  info: 'hsl(var(--info))',
} as const;

// ============================================
// BORDER TOKENS
// ============================================
export const border = {
  // Structural borders
  default: 'hsl(var(--border))',
  subtle: 'hsl(218 14% 91% / 0.5)',
  strong: 'hsl(var(--neutral-400))',
  
  // Focus borders
  focus: 'hsl(var(--ring))',
  focusInset: 'hsl(var(--background))',
  
  // Brand borders
  brand: 'hsl(var(--brand-gold))',
  brandSubtle: 'hsl(var(--brand-gold-border))',
  
  // Status borders
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  danger: 'hsl(var(--destructive))',
  info: 'hsl(var(--info))',
} as const;

// ============================================
// ELEVATION TOKENS
// ============================================
export const elevation = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  overlay: '0 8px 24px rgba(0, 0, 0, 0.12)',
  drawer: '-4px 0 20px rgba(26, 26, 26, 0.08)',
} as const;

// ============================================
// RADIUS SCALE
// ============================================
export const radius = {
  none: '0',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
} as const;

// ============================================
// TYPOGRAPHY TOKENS
// ============================================
export const typography = {
  fontFamily: {
    sans: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
  },
  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '30px',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
} as const;

// ============================================
// LAYOUT MEASUREMENTS (FIX B: Unified heights)
// ============================================
export const layout = {
  // Header (FIX B: Single source of truth = 56px)
  headerHeight: '56px',
  pageHeaderHeight: '56px',                      // NOT 72px - use var(--pagehdr-h)
  headerHeightCompact: '48px',
  
  // Sidebar
  sidebarWidthExpanded: '240px',
  sidebarWidthCollapsed: '56px',
  sidebarWidthNarrow: '200px',
  
  // Nav items
  navItemHeight: '32px',
  navItemHeightCompact: '28px',
  
  // Drawer widths
  drawerWidthNarrow: '360px',
  drawerWidthMedium: '480px',
  drawerWidthWide: '640px',
  drawerWidthXl: '800px',
  
  // Modal widths
  modalWidthSm: '384px',
  modalWidthMd: '512px',
  modalWidthLg: '640px',
  modalWidthXl: '768px',
  
  // Content
  contentMaxWidth: '1280px',
  contentPadding: '24px',
  contentPaddingMobile: '16px',
  
  // Table (FIX C: 40px row height)
  tableRowHeight: '40px',
  tableRowHeightCompact: '32px',
  tableHeaderHeight: '40px',
  
  // Toolbar
  toolbarHeight: '48px',
  
  // Button heights (FIX D)
  buttonHeightDefault: '36px',
  buttonHeightSm: '32px',
  buttonHeightLg: '40px',
  buttonHeightIcon: '32px',
} as const;

// ============================================
// TRANSITIONS
// ============================================
export const transitions = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  
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
  drawer: '200',
  modal: '250',
  popover: '300',
  tooltip: '400',
  toast: '500',
} as const;

// ============================================
// INTERACTIVE STATES
// ============================================
export const interactive = {
  // Default state
  default: {
    bg: 'transparent',
    text: 'hsl(var(--foreground))',
    border: 'hsl(var(--border))',
  },
  
  // Hover state
  hover: {
    bg: 'hsl(var(--accent))',
    text: 'hsl(var(--foreground))',
    border: 'hsl(var(--neutral-400))',
  },
  
  // Pressed/active state
  pressed: {
    bg: 'hsl(var(--accent))',
    text: 'hsl(var(--foreground))',
    border: 'hsl(var(--neutral-500))',
  },
  
  // Selected state
  selected: {
    bg: 'hsl(var(--brand-gold-pale))',
    text: 'hsl(var(--foreground))',
    border: 'hsl(var(--brand-gold))',
    indicator: 'hsl(var(--brand-gold))',
  },
  
  // Disabled state
  disabled: {
    bg: 'transparent',
    text: 'hsl(var(--text-muted))',
    border: 'hsl(var(--border))',
    opacity: '0.5',
  },
  
  // Focus state
  focus: {
    ring: 'hsl(var(--ring))',
    ringWidth: '2px',
    ringOffset: '2px',
    outline: 'none',
  },
} as const;

// ============================================
// STATUS COLORS (Atlassian-aligned)
// ============================================
export const status = {
  success: {
    bg: 'hsl(var(--success) / 0.1)',
    text: 'hsl(var(--success))',
    border: 'hsl(var(--success) / 0.3)',
    icon: 'hsl(var(--success))',
  },
  warning: {
    bg: 'hsl(var(--warning) / 0.1)',
    text: 'hsl(var(--warning))',
    border: 'hsl(var(--warning) / 0.3)',
    icon: 'hsl(var(--warning))',
  },
  danger: {
    bg: 'hsl(var(--destructive) / 0.1)',
    text: 'hsl(var(--destructive))',
    border: 'hsl(var(--destructive) / 0.3)',
    icon: 'hsl(var(--destructive))',
  },
  info: {
    bg: 'hsl(var(--info) / 0.1)',
    text: 'hsl(var(--info))',
    border: 'hsl(var(--info) / 0.3)',
    icon: 'hsl(var(--info))',
  },
  neutral: {
    bg: 'hsl(var(--neutral-100))',
    text: 'hsl(var(--neutral-600))',
    border: 'hsl(var(--neutral-200))',
    icon: 'hsl(var(--neutral-500))',
  },
} as const;

// ============================================
// GOLDEN HOUR CHART PALETTE
// ============================================
export const chartPalette = {
  expert: '#5c7c5c',      // Olive green - Level 5
  advanced: '#8b7355',    // Bronze/brown - Level 4
  intermediate: '#c69c6d', // Catalyst gold - Level 3
  beginner: '#d4b896',    // Light champagne - Level 2
  none: '#c8ccd0',        // Cool grey - Level 1
} as const;

// ============================================
// EXPORT ALL TOKENS
// ============================================
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
  status,
  chartPalette,
} as const;

export default tokens;
