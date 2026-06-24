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
  textSecondary: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, #334155)))',
  textMuted: 'var(--ds-text-subtlest, #64748b)',
  textLight: 'var(--ds-text-subtlest, #94a3b8)',

  // Surfaces
  surfaceWhite: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
  surfacePage: 'var(--ds-surface-sunken, #f8fafc)',
  surfaceHover: 'var(--ds-surface-sunken, #f1f5f9)',
  surfaceSelected: 'var(--ds-background-information, #E9F2FF)',

  // Borders
  borderLight: 'var(--ds-border, var(--cp-bg-sunken, #e2e8f0))',
  borderDefault: 'var(--ds-text-disabled, #cbd5e1)',

  // Brand
  accent: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))',
  accentHover: 'var(--ds-background-brand-bold-hovered, #1d4ed8)',
  accentLight: 'var(--ds-background-information, #E9F2FF)',
  accentLighter: 'var(--ds-background-selected, #eff6ff)',

  // Status
  success: 'var(--ds-text-success, #16a34a)',
  successBg: 'var(--ds-background-success, #DFFCF0)',

  warning: 'var(--ds-text-warning, #f59e0b)',
  warningText: 'var(--ds-background-warning-bold, #b45309)',
  warningBg: 'var(--ds-background-warning, #FFF7D6)',

  danger: 'var(--ds-text-danger, #dc2626)',
  dangerBg: 'var(--ds-background-danger, #fef2f2)',
  dangerBorder: 'var(--ds-background-danger, #FFECEB)',
};

// ============================================================================
// ICON COLORS (Gradient backgrounds for workstream avatars)
// ============================================================================

export const ICON_COLORS = [
  'linear-gradient(135deg, var(--ds-text-brand, #3b82f6) 0%, var(--ds-background-brand-bold-hovered, #1d4ed8) 100%)',
  'linear-gradient(135deg, var(--ds-background-discovery-bold, #6E5DC6) 0%, var(--ds-background-discovery-bold, #6d28d9) 100%)',
  'linear-gradient(135deg, var(--ds-icon-information, #1D7AFC) 0%, var(--ds-icon-information, #1D7AFC) 100%)',
  'linear-gradient(135deg, var(--ds-background-warning-bold, #E2B203) 0%, var(--ds-background-warning-bold, #E2B203) 100%)',
  'linear-gradient(135deg, var(--ds-background-accent-magenta-bolder, #BE185D) 0%, var(--ds-background-accent-magenta-bolder, #BE185D) 100%)',
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
