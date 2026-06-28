// ============================================================================
// TASK DETAIL MODAL V10 — COLOR SYSTEM
// ============================================================================
// DO NOT MODIFY THESE VALUES — They are pixel-perfect specifications

export const COLORS = {
  // Text
  textPrimary: 'var(--ds-text)',
  textSecondary: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))',
  textMuted: 'var(--ds-text-subtlest)',
  textLight: 'var(--ds-text-subtlest)',
  
  // Surfaces
  surfacePage: 'var(--ds-surface-sunken)',
  surfaceCard: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
  surfaceHover: 'var(--ds-surface-sunken)',
  
  // Borders
  borderLight: 'var(--ds-border, var(--cp-bg-sunken))',
  borderDefault: 'var(--ds-text-disabled)',
  borderFocus: 'var(--ds-text-brand)',
  
  // Accent
  accent: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  accentHover: 'var(--ds-background-brand-bold-hovered)',
  accentLight: 'var(--ds-background-information)',
  
  // Warning
  warningBg: 'var(--ds-background-warning)',
  warningBorder: 'var(--ds-background-warning)',
  warningText: 'var(--ds-text-warning)',
  warningIcon: 'var(--ds-text-warning)',
  
  // File Types
  filePdfBg: 'var(--ds-background-danger)',
  filePdfIcon: 'var(--ds-text-danger)',
  fileDocBg: 'var(--ds-background-selected)',
  fileDocIcon: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  fileImgBg: 'var(--ds-background-success)',
  fileImgIcon: 'var(--ds-text-success)'
} as const;

// Status Colors — DO NOT MODIFY
export const STATUS_COLORS: Record<string, string> = {
  'Backlog': 'var(--ds-text-subtlest)',
  'Planned': 'var(--ds-text-brand)',
  'In Progress': 'var(--ds-text-warning)',
  'In Review': 'var(--ds-background-discovery-bold)',
  'Done': 'var(--ds-text-success)'
};
// Priority Colors — MEDIUM IS YELLOW #eab308
export const PRIORITY_COLORS: Record<string, string> = {
  'Critical': 'var(--ds-text-danger)',
  'High': 'var(--ds-background-warning-bold)',
  'Medium': 'var(--ds-background-warning-bold)',  // YELLOW — NOT BLUE
  'Low': 'var(--ds-text-subtlest)'
};

// Workstream Colors — MIM IS GRAY var(--ds-text-subtlest)
export const WORKSTREAM_COLORS: Record<string, string> = {
  'Catalyst': 'var(--ds-background-discovery-bold)',
  'Data & AI': 'var(--ds-background-discovery-bold)',
  'Delivery': 'var(--ds-background-accent-magenta-bolder)',
  'MIM': 'var(--ds-text-subtlest)',  // GRAY — NOT PINK
  'Senaei': 'var(--ds-background-accent-teal-bolder)'
};

// Options Arrays
export const STATUSES = ['Backlog', 'Planned', 'In Progress', 'In Review', 'Done'] as const;
export { CATALYST_PRIORITIES as PRIORITIES } from '@/lib/catalyst-priority';
export const WORKSTREAMS = ['Catalyst', 'Data & AI', 'Delivery', 'MIM', 'Senaei'] as const;

export const DEFAULT_ASSIGNEES = [
  { id: '1', name: 'Vikram Indla', initials: 'VI', color: 'var(--ds-background-discovery-bold)' },
  { id: '2', name: 'Ahmed Khan', initials: 'AK', color: 'var(--ds-text-brand)' },
  { id: '3', name: 'Sarah Johnson', initials: 'SJ', color: 'var(--ds-background-accent-magenta-bolder)' },
  { id: '4', name: 'Mohammed Ali', initials: 'MA', color: 'var(--ds-background-accent-teal-bolder)' },
  { id: '0', name: 'Unassigned', initials: '?', color: 'var(--ds-text-subtlest)' }
];
