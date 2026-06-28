// ============================================================================
// WORKSTREAMS — Shared Constants, Types, and Utilities
// Extracted from WorkstreamsPage.tsx
// ============================================================================

// ============================================================================
// COLOR CONSTANTS — CATALYST V5 DESIGN SYSTEM
// ============================================================================

export const COLORS = {
  // Text
  textPrimary: 'var(--ds-text)',
  textSecondary: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))',
  textMuted: 'var(--ds-text-subtlest)',
  textLight: 'var(--ds-text-subtlest)',

  // Surfaces
  surfaceWhite: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
  surfacePage: 'var(--ds-surface-sunken)',
  surfaceHover: 'var(--ds-surface-sunken)',
  surfaceSelected: 'var(--ds-background-information)',

  // Borders
  borderLight: 'var(--ds-border, var(--cp-bg-sunken))',
  borderDefault: 'var(--ds-text-disabled)',

  // Brand
  accent: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  accentHover: 'var(--ds-background-brand-bold-hovered)',
  accentLight: 'var(--ds-background-information)',
  accentLighter: 'var(--ds-background-selected)',

  // Status
  success: 'var(--ds-text-success)',
  successBg: 'var(--ds-background-success)',

  warning: 'var(--ds-text-warning)',
  warningText: 'var(--ds-background-warning-bold)',
  warningBg: 'var(--ds-background-warning)',

  danger: 'var(--ds-text-danger)',
  dangerBg: 'var(--ds-background-danger)',
  dangerBorder: 'var(--ds-background-danger)',
};

// ============================================================================
// ICON COLORS (Gradient backgrounds for workstream avatars)
// ============================================================================

export const ICON_COLORS = [
  'linear-gradient(135deg, var(--ds-text-brand) 0%, var(--ds-background-brand-bold-hovered) 100%)',
  'linear-gradient(135deg, var(--ds-background-discovery-bold) 0%, var(--ds-background-discovery-bold) 100%)',
  'linear-gradient(135deg, var(--ds-icon-information) 0%, var(--ds-icon-information) 100%)',
  'linear-gradient(135deg, var(--ds-background-warning-bold) 0%, var(--ds-background-warning-bold) 100%)',
  'linear-gradient(135deg, var(--ds-background-accent-magenta-bolder) 0%, var(--ds-background-accent-magenta-bolder) 100%)',
  'linear-gradient(135deg, var(--ds-text-success) 0%, var(--ds-text-success) 100%)',
  'linear-gradient(135deg, var(--ds-text-subtlest) 0%, var(--ds-text-subtle) 100%)',
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
