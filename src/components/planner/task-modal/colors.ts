// ============================================================================
// TASK DETAIL MODAL V10 — COLOR SYSTEM
// ============================================================================
// DO NOT MODIFY THESE VALUES — They are pixel-perfect specifications

export const COLORS = {
  // Text
  textPrimary: 'var(--ds-text, #0f172a)',
  textSecondary: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, #334155)))',
  textMuted: 'var(--ds-text-subtlest, #64748b)',
  textLight: 'var(--ds-text-subtlest, #94a3b8)',
  
  // Surfaces
  surfacePage: 'var(--ds-surface-sunken, #f8fafc)',
  surfaceCard: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
  surfaceHover: 'var(--ds-surface-sunken, #f1f5f9)',
  
  // Borders
  borderLight: 'var(--ds-border, var(--cp-bg-sunken, #e2e8f0))',
  borderDefault: 'var(--ds-text-disabled, #cbd5e1)',
  borderFocus: 'var(--ds-text-brand, #3b82f6)',
  
  // Accent
  accent: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))',
  accentHover: 'var(--ds-background-brand-bold-hovered, #1d4ed8)',
  accentLight: 'var(--ds-background-information, #E9F2FF)',
  
  // Warning
  warningBg: 'var(--ds-background-warning, #FFF7D6)',
  warningBorder: 'var(--ds-background-warning, #FFF7D6)',
  warningText: 'var(--ds-text-warning, #974F0C)',
  warningIcon: 'var(--ds-text-warning, #d97706)',
  
  // File Types
  filePdfBg: 'var(--ds-background-danger, #fef2f2)',
  filePdfIcon: 'var(--ds-text-danger, #dc2626)',
  fileDocBg: 'var(--ds-background-selected, #eff6ff)',
  fileDocIcon: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563eb))',
  fileImgBg: 'var(--ds-background-success, #DFFCF0)',
  fileImgIcon: 'var(--ds-text-success, #16a34a)'
} as const;

// Status Colors — DO NOT MODIFY
export const STATUS_COLORS: Record<string, string> = {
  'Backlog': 'var(--ds-text-subtlest, #94a3b8)',
  'Planned': 'var(--ds-text-brand, #3b82f6)',
  'In Progress': 'var(--ds-text-warning, #f59e0b)',
  'In Review': 'var(--ds-background-discovery-bold, #8b5cf6)',
  'Done': 'var(--ds-text-success, #16a34a)'
};

// TODO: ads-unmapped — #EAB308 context unclear
// Priority Colors — MEDIUM IS YELLOW #eab308
export const PRIORITY_COLORS: Record<string, string> = {
  'Critical': 'var(--ds-text-danger, #dc2626)',
  'High': 'var(--ds-background-warning-bold, #f97316)',
  'Medium': 'var(--ds-background-warning-bold, #E2B203)',  // YELLOW — NOT BLUE
  'Low': 'var(--ds-text-subtlest, #94a3b8)'
};

// Workstream Colors — MIM IS GRAY var(--ds-text-subtlest, #64748b)
export const WORKSTREAM_COLORS: Record<string, string> = {
  'Catalyst': 'var(--ds-background-discovery-bold, #6366f1)',
  'Data & AI': 'var(--ds-background-discovery-bold, #8b5cf6)',
  'Delivery': 'var(--ds-background-accent-magenta-bolder, #ec4899)',
  'MIM': 'var(--ds-text-subtlest, #64748b)',  // GRAY — NOT PINK
  'Senaei': 'var(--ds-background-accent-teal-bolder, #14b8a6)'
};

// Options Arrays
export const STATUSES = ['Backlog', 'Planned', 'In Progress', 'In Review', 'Done'] as const;
export { CATALYST_PRIORITIES as PRIORITIES } from '@/lib/catalyst-priority';
export const WORKSTREAMS = ['Catalyst', 'Data & AI', 'Delivery', 'MIM', 'Senaei'] as const;

export const DEFAULT_ASSIGNEES = [
  { id: '1', name: 'Vikram Indla', initials: 'VI', color: 'var(--ds-background-discovery-bold, #8b5cf6)' },
  { id: '2', name: 'Ahmed Khan', initials: 'AK', color: 'var(--ds-text-brand, #3b82f6)' },
  { id: '3', name: 'Sarah Johnson', initials: 'SJ', color: 'var(--ds-background-accent-magenta-bolder, #ec4899)' },
  { id: '4', name: 'Mohammed Ali', initials: 'MA', color: 'var(--ds-background-accent-teal-bolder, #14b8a6)' },
  { id: '0', name: 'Unassigned', initials: '?', color: 'var(--ds-text-subtlest, #94a3b8)' }
];
