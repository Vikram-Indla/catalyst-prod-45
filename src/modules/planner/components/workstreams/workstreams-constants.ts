// ============================================================================
// WORKSTREAMS — Shared Constants, Types, and Utilities
// Extracted from WorkstreamsPage.tsx
// ============================================================================

// ============================================================================
// COLOR CONSTANTS — CATALYST V5 DESIGN SYSTEM
// ============================================================================

export const COLORS = {
  // Text
  textPrimary: 'var(--ds-text, #0f172a)',
  textSecondary: 'var(--ds-text-subtle, #334155)',
  textMuted: 'var(--ds-text-subtlest, #64748b)',
  textLight: 'var(--ds-text-subtlest, #94a3b8)',

  // Surfaces
  surfaceWhite: 'var(--ds-surface, #ffffff)',
  surfacePage: 'var(--ds-surface-sunken, #f8fafc)',
  surfaceHover: 'var(--ds-surface-sunken, #f1f5f9)',
  surfaceSelected: '#dbeafe',

  // Borders
  borderLight: 'var(--ds-border, #e2e8f0)',
  borderDefault: 'var(--ds-text-disabled, #cbd5e1)',

  // Brand
  accent: 'var(--ds-text-brand, #2563eb)',
  accentHover: 'var(--ds-background-brand-bold-hovered, #1d4ed8)',
  accentLight: '#dbeafe',
  accentLighter: 'var(--ds-background-selected, #eff6ff)',

  // Status
  success: 'var(--ds-text-success, #16a34a)',
  successBg: '#f0fdf4',

  warning: 'var(--ds-text-warning, #f59e0b)',
  warningText: '#b45309',
  warningBg: '#fffbeb',

  danger: 'var(--ds-text-danger, #dc2626)',
  dangerBg: 'var(--ds-background-danger, #fef2f2)',
  dangerBorder: '#fecaca',
};

// ============================================================================
// ICON COLORS (Gradient backgrounds for workstream avatars)
// ============================================================================

export const ICON_COLORS = [
  'linear-gradient(135deg, var(--ds-text-brand, #3b82f6) 0%, var(--ds-background-brand-bold-hovered, #1d4ed8) 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
  'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  'linear-gradient(135deg, var(--ds-text-success, #22c55e) 0%, var(--ds-text-success, #16a34a) 100%)',
  'linear-gradient(135deg, var(--ds-text-subtlest, #64748b) 0%, var(--ds-text-subtle, #475569) 100%)',
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getInitials = (name: string): string => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const getIconColor = (index: number): string => {
  return ICON_COLORS[index % ICON_COLORS.length];
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ============================================================================
// TYPES
// ============================================================================

export interface TeamMember {
  id: string;
  profile_id: string | null;
  name: string;
  initials: string;
  role: string;
  avatarColor: string;
}
