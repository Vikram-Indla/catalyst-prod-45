// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ UI TOKENS
// Design tokens scoped to the Task¹⁰ module
// ═══════════════════════════════════════════════════════════════════════════

export const T10_COLORS = {
  // Brand
  brand: '#0d9488',
  
  // Blue palette
  blue: '#2563eb',
  blueDark: '#1d4ed8',
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  
  // Purple palette (AI features)
  purple: '#8b5cf6',
  purpleDark: '#7c3aed',
  purple50: '#f5f3ff',
  purpleBorder: '#c4b5fd',
  
  // Semantic colors
  success: '#10b981',
  success50: '#ecfdf5',
  warning: '#f59e0b',
  warning50: '#fffbeb',
  danger: '#ef4444',
  danger50: '#fef2f2',
  
  // Neutrals
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
} as const;

export const T10_SPACING = {
  headerPadding: '16px 32px',
  containerMaxWidth: '1100px',
  cardPadding: '20px 24px',
  panelWidth: '420px',
  modalWidth: '520px',
  cardRadius: '12px',
} as const;

export const T10_TYPOGRAPHY = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontMono: "'SF Mono', Monaco, monospace",
} as const;

export const T10_SHADOWS = {
  card: '0 2px 8px rgba(0, 0, 0, 0.06)',
  cardHover: '0 4px 16px rgba(0, 0, 0, 0.1)',
  panel: '0 10px 40px rgba(0, 0, 0, 0.15)',
  modal: '0 20px 60px rgba(0, 0, 0, 0.2)',
} as const;

export const T10_TRANSITIONS = {
  default: '0.2s ease',
  fast: '0.15s ease',
  slow: '0.3s ease',
} as const;
