/**
 * CATALYST V5 DESIGN TOKEN SYSTEM
 * ================================
 * Single source of truth for all semantic tokens
 * 
 * RULES:
 * 1. All colors MUST be CSS variables from index.css
 * 2. NO hex, rgb, rgba values allowed
 * 3. Components MUST use these token utilities
 * 4. Dark mode is handled automatically via CSS variables
 */

// ============================================================================
// SURFACE TOKENS - Use for backgrounds
// ============================================================================
export const SURFACE = {
  app: 'var(--bg-app)',
  0: 'var(--bg-0)',
  1: 'var(--bg-1)',
  2: 'var(--bg-2)',
  3: 'var(--bg-3)',
  4: 'var(--bg-4)',
  5: 'var(--bg-5)',
  card: 'var(--bg-card)',
  sidebar: 'var(--bg-sidebar)',
  hover: 'var(--row-hover)',
  selected: 'var(--row-selected)',
  active: 'var(--row-active)',
} as const;

// ============================================================================
// TEXT TOKENS - Use for text colors
// ============================================================================
export const TEXT = {
  primary: 'var(--fg-1)',
  secondary: 'var(--fg-2)',
  muted: 'var(--fg-3)',
  disabled: 'var(--fg-4)',
  inverse: 'var(--text-inverse)',
} as const;

// ============================================================================
// BORDER TOKENS - Use for borders and dividers
// ============================================================================
export const BORDER = {
  subtle: 'var(--border-subtle)',
  default: 'var(--divider)',
  strong: 'var(--border-strong)',
  focus: 'var(--input-focus)',
} as const;

// ============================================================================
// SEMANTIC STATE TOKENS - Use for status indicators
// ============================================================================
export const STATE = {
  info: {
    fg: 'var(--info-fg)',
    bg: 'var(--info-bg)',
    border: 'var(--info-bd)',
  },
  success: {
    fg: 'var(--success-fg)',
    bg: 'var(--success-bg)',
    border: 'var(--success-bd)',
  },
  warning: {
    fg: 'var(--warning-fg)',
    bg: 'var(--warning-bg)',
    border: 'var(--warning-bd)',
  },
  danger: {
    fg: 'var(--danger-fg)',
    bg: 'var(--danger-bg)',
    border: 'var(--danger-bd)',
  },
  neutral: {
    fg: 'var(--neutral-fg)',
    bg: 'var(--neutral-bg)',
    border: 'var(--neutral-bd)',
  },
} as const;

// ============================================================================
// CHART TOKENS - Use for data visualization
// ============================================================================
export const CHART = {
  1: 'var(--chart-1)',
  2: 'var(--chart-2)',
  3: 'var(--chart-3)',
  4: 'var(--chart-4)',
  5: 'var(--chart-5)',
  6: 'var(--chart-6)',
  7: 'var(--chart-7)',
  8: 'var(--chart-8)',
} as const;

// ============================================================================
// SHADOW TOKENS - Use for elevation
// ============================================================================
export const SHADOW = {
  1: 'var(--shadow-1)',
  2: 'var(--shadow-2)',
  elev1: 'var(--shadow-elev-1)',
  elev2: 'var(--shadow-elev-2)',
  elev3: 'var(--shadow-elev-3)',
  brand: 'var(--shadow-brand)',
} as const;

// ============================================================================
// STATUS CONFIGURATION - Token-compliant status styling
// Maps status keys to semantic tokens
// ============================================================================
export type StatusType = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface StatusConfig {
  label: string;
  type: StatusType;
}

/**
 * Get Tailwind classes for status styling using semantic tokens
 */
export function getStatusClasses(type: StatusType): string {
  const classMap: Record<StatusType, string> = {
    info: 'bg-[var(--info-bg)] text-[var(--info-fg)] border-[var(--info-bd)]',
    success: 'bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success-bd)]',
    warning: 'bg-[var(--warning-bg)] text-[var(--warning-fg)] border-[var(--warning-bd)]',
    danger: 'bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger-bd)]',
    neutral: 'bg-[var(--neutral-bg)] text-[var(--neutral-fg)] border-[var(--neutral-bd)]',
  };
  return classMap[type];
}

/**
 * Get dot color class for status indicators
 */
export function getStatusDotClass(type: StatusType): string {
  const classMap: Record<StatusType, string> = {
    info: 'bg-[var(--info-fg)]',
    success: 'bg-[var(--success-fg)]',
    warning: 'bg-[var(--warning-fg)]',
    danger: 'bg-[var(--danger-fg)]',
    neutral: 'bg-[var(--neutral-fg)]',
  };
  return classMap[type];
}

// ============================================================================
// PROCESS STEP STATUS MAPPING - Maps status strings to semantic types
// ============================================================================
export const PROCESS_STATUS_MAP: Record<string, StatusConfig> = {
  // Info/Blue - New, In Progress
  new: { label: 'New', type: 'info' },
  new_request: { label: 'New Request', type: 'info' },
  new_demand: { label: 'New Demand', type: 'info' },
  'in-progress': { label: 'In Progress', type: 'info' },
  in_progress: { label: 'In Progress', type: 'info' },
  implement: { label: 'Implement', type: 'info' },
  implementing: { label: 'Implementing', type: 'info' },
  funnel: { label: 'Funnel', type: 'info' },
  
  // Warning/Amber - Review, On Hold
  scored: { label: 'Scored', type: 'warning' },
  in_review: { label: 'In Review', type: 'warning' },
  'ea-review': { label: 'EA Review', type: 'warning' },
  ea_review: { label: 'EA Review', type: 'warning' },
  analyse: { label: 'Analyse', type: 'warning' },
  analysis: { label: 'Analysis', type: 'warning' },
  budget_review: { label: 'Budget Review', type: 'warning' },
  on_hold: { label: 'On Hold', type: 'warning' },
  'on-hold': { label: 'On Hold', type: 'warning' },
  
  // Success/Teal - Ready, Approved, Completed
  ready: { label: 'Ready', type: 'success' },
  ready_to_implement: { label: 'Ready to Implement', type: 'success' },
  approved: { label: 'Approved', type: 'success' },
  completed: { label: 'Completed', type: 'success' },
  closed: { label: 'Closed', type: 'success' },
  done: { label: 'Done', type: 'success' },
  
  // Danger/Red - Blocked, Rejected
  blocked: { label: 'Blocked', type: 'danger' },
  rejected: { label: 'Rejected', type: 'danger' },
  cancelled: { label: 'Cancelled', type: 'danger' },
  
  // Neutral/Gray - Draft, Backlog
  backlog: { label: 'Backlog', type: 'neutral' },
  draft: { label: 'Draft', type: 'neutral' },
};

/**
 * Get status configuration from a status string
 */
export function getStatusConfig(status: string): StatusConfig {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_') || 'new';
  return PROCESS_STATUS_MAP[normalizedStatus] || PROCESS_STATUS_MAP[status?.toLowerCase()] || { label: status, type: 'neutral' };
}

// ============================================================================
// KR/MILESTONE STATUS TOKENS - For roadmap and OKR views
// ============================================================================
export const KR_STATUS = {
  complete: {
    label: 'Complete',
    fg: 'var(--success-fg)',
    bg: 'var(--success-bg)',
    filled: true,
  },
  'on-track': {
    label: 'On Track',
    fg: 'var(--success-fg)',
    bg: 'var(--success-bg)',
    filled: true,
  },
  current: {
    label: 'Current',
    fg: 'var(--success-fg)',
    bg: 'var(--bg-0)',
    filled: false,
  },
  'in-progress': {
    label: 'In Progress',
    fg: 'var(--success-fg)',
    bg: 'var(--bg-0)',
    filled: false,
  },
  pending: {
    label: 'Pending',
    fg: 'var(--neutral-fg)',
    bg: 'var(--bg-0)',
    filled: false,
  },
  planned: {
    label: 'Planned',
    fg: 'var(--neutral-fg)',
    bg: 'var(--bg-0)',
    filled: false,
  },
  'not-started': {
    label: 'Not Started',
    fg: 'var(--neutral-fg)',
    bg: 'var(--bg-0)',
    filled: false,
  },
  overdue: {
    label: 'Overdue',
    fg: 'var(--danger-fg)',
    bg: 'var(--danger-bg)',
    filled: true,
  },
  blocked: {
    label: 'Blocked',
    fg: 'var(--danger-fg)',
    bg: 'var(--danger-bg)',
    filled: true,
  },
  'at-risk': {
    label: 'At Risk',
    fg: 'var(--warning-fg)',
    bg: 'var(--warning-bg)',
    filled: true,
  },
} as const;

// Brand accent colors (use sparingly)
export const BRAND = {
  primary: 'var(--brand-primary-hex)',
  primaryHover: 'var(--brand-primary-hover-hex)',
  gold: 'var(--brand-gold)',
  goldHover: 'var(--brand-gold-hover)',
} as const;

// Today line and progress indicators
export const INDICATOR = {
  todayLine: 'var(--info-fg)',
  progressBar: 'var(--info-fg)',
} as const;
