// ============================================================================
// WORKSTREAMS — Shared Constants, Types, and Utilities
// Extracted from WorkstreamsPage.tsx
// ============================================================================

// ============================================================================
// COLOR CONSTANTS — CATALYST V5 DESIGN SYSTEM
// ============================================================================

export const COLORS = {
  // Text
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textLight: '#94a3b8',

  // Surfaces
  surfaceWhite: '#ffffff',
  surfacePage: '#f8fafc',
  surfaceHover: '#f1f5f9',
  surfaceSelected: '#dbeafe',

  // Borders
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1',

  // Brand
  accent: '#2563eb',
  accentHover: '#1d4ed8',
  accentLight: '#dbeafe',
  accentLighter: '#eff6ff',

  // Status
  success: '#16a34a',
  successBg: '#f0fdf4',

  warning: '#f59e0b',
  warningText: '#b45309',
  warningBg: '#fffbeb',

  danger: '#dc2626',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
};

// ============================================================================
// ICON COLORS (Gradient backgrounds for workstream avatars)
// ============================================================================

export const ICON_COLORS = [
  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
  'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  'linear-gradient(135deg, #64748b 0%, #475569 100%)',
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
