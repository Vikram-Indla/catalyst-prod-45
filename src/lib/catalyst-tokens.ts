/**
 * CATALYST V5 NEUTRAL AUTHORITY — DESIGN TOKEN SYSTEM
 * =====================================================
 * 
 * ALL EXPRESSIVE COLORS BANNED:
 * - No purple, green, red, yellow
 * - No success/warning/danger color fills
 * - Status expressed by text labels, position, grouping
 * 
 * ONLY ALLOWED:
 * - Neutral grayscale for all UI
 * - Catalyst Gold ONLY for critical attention
 * 
 * All colors MUST be CSS variables from index.css
 */

// ============================================================================
// SURFACE TOKENS - Neutral elevation ladder
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
// TEXT TOKENS - Neutral foreground ladder
// ============================================================================
export const TEXT = {
  primary: 'var(--fg-1)',
  secondary: 'var(--fg-2)',
  muted: 'var(--fg-3)',
  disabled: 'var(--fg-4)',
  inverse: 'var(--text-inverse)',
} as const;

// ============================================================================
// BORDER TOKENS - Subtle neutral borders
// ============================================================================
export const BORDER = {
  subtle: 'var(--border-subtle)',
  default: 'var(--divider)',
  strong: 'var(--border-strong)',
  focus: 'var(--gold-fg)',  // Gold focus ring
} as const;

// ============================================================================
// NEUTRAL STATE TOKENS - No expressive colors
// All states use neutral grayscale. Gold for critical ONLY.
// ============================================================================
export const STATE = {
  // All mapped to neutral
  info: {
    fg: 'var(--neutral-fg)',
    bg: 'var(--neutral-bg)',
    border: 'var(--neutral-bd)',
  },
  success: {
    fg: 'var(--neutral-fg)',
    bg: 'var(--neutral-bg)',
    border: 'var(--neutral-bd)',
  },
  warning: {
    fg: 'var(--neutral-fg)',
    bg: 'var(--neutral-bg)',
    border: 'var(--neutral-bd)',
  },
  danger: {
    fg: 'var(--neutral-fg)',
    bg: 'var(--neutral-bg)',
    border: 'var(--neutral-bd)',
  },
  neutral: {
    fg: 'var(--neutral-fg)',
    bg: 'var(--neutral-bg)',
    border: 'var(--neutral-bd)',
  },
  // Catalyst Gold - ONLY for critical attention
  critical: {
    fg: 'var(--gold-fg)',
    bg: 'var(--gold-bg)',
    border: 'var(--gold-bd)',
  },
} as const;

// ============================================================================
// CHART TOKENS - Neutral grayscale + Gold accent
// ============================================================================
export const CHART = {
  neutral1: 'var(--chart-neutral-1)',
  neutral2: 'var(--chart-neutral-2)',
  neutral3: 'var(--chart-neutral-3)',
  neutral4: 'var(--chart-neutral-4)',
  neutral5: 'var(--chart-neutral-5)',
  neutral6: 'var(--chart-neutral-6)',
  gold: 'var(--chart-gold)',
  goldMuted: 'var(--chart-gold-muted)',
  // Legacy aliases
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
// SHADOW TOKENS - Neutral elevation
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
// STATUS CONFIGURATION - Neutral-only status styling
// Status meaning comes from LABELS and POSITION, not color
// ============================================================================
export type StatusType = 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'critical';

export interface StatusConfig {
  label: string;
  type: StatusType;
}

/**
 * Get Tailwind classes for status styling - ALL NEUTRAL
 * Only 'critical' uses Catalyst Gold
 */
export function getStatusClasses(type: StatusType): string {
  if (type === 'critical') {
    return 'bg-[var(--gold-bg)] text-[var(--gold-fg)] border-[var(--gold-bd)]';
  }
  return 'bg-[var(--neutral-bg)] text-[var(--neutral-fg)] border-[var(--neutral-bd)]';
}

/**
 * Get dot color class for status indicators - NEUTRAL
 * Only 'critical' uses Gold dot
 */
export function getStatusDotClass(type: StatusType): string {
  if (type === 'critical') {
    return 'bg-[var(--gold-fg)]';
  }
  return 'bg-[var(--fg-3)]';
}

// ============================================================================
// PROCESS STEP STATUS MAPPING - All neutral
// ============================================================================
export const PROCESS_STATUS_MAP: Record<string, StatusConfig> = {
  // All statuses map to neutral - meaning comes from labels
  new: { label: 'New', type: 'neutral' },
  new_request: { label: 'New Request', type: 'neutral' },
  new_demand: { label: 'New Demand', type: 'neutral' },
  'in-progress': { label: 'In Progress', type: 'neutral' },
  in_progress: { label: 'In Progress', type: 'neutral' },
  implement: { label: 'Implement', type: 'neutral' },
  implementing: { label: 'Implementing', type: 'neutral' },
  funnel: { label: 'Funnel', type: 'neutral' },
  scored: { label: 'Scored', type: 'neutral' },
  in_review: { label: 'In Review', type: 'neutral' },
  'ea-review': { label: 'EA Review', type: 'neutral' },
  ea_review: { label: 'EA Review', type: 'neutral' },
  analyse: { label: 'Analyse', type: 'neutral' },
  analysis: { label: 'Analysis', type: 'neutral' },
  budget_review: { label: 'Budget Review', type: 'neutral' },
  on_hold: { label: 'On Hold', type: 'neutral' },
  'on-hold': { label: 'On Hold', type: 'neutral' },
  ready: { label: 'Ready', type: 'neutral' },
  ready_to_implement: { label: 'Ready to Implement', type: 'neutral' },
  approved: { label: 'Approved', type: 'neutral' },
  completed: { label: 'Completed', type: 'neutral' },
  closed: { label: 'Closed', type: 'neutral' },
  done: { label: 'Done', type: 'neutral' },
  // Only blocked uses critical (Gold) - requires attention
  blocked: { label: 'Blocked', type: 'critical' },
  rejected: { label: 'Rejected', type: 'neutral' },
  cancelled: { label: 'Cancelled', type: 'neutral' },
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
// KR/MILESTONE STATUS TOKENS - Neutral Authority
// ============================================================================
export const KR_STATUS = {
  complete: {
    label: 'Complete',
    fg: 'var(--fg-2)',
    bg: 'var(--neutral-bg)',
    filled: false,
  },
  'on-track': {
    label: 'On Track',
    fg: 'var(--fg-2)',
    bg: 'var(--neutral-bg)',
    filled: false,
  },
  current: {
    label: 'Current',
    fg: 'var(--fg-1)',
    bg: 'var(--bg-3)',
    filled: false,
  },
  'in-progress': {
    label: 'In Progress',
    fg: 'var(--fg-2)',
    bg: 'var(--bg-0)',
    filled: false,
  },
  pending: {
    label: 'Pending',
    fg: 'var(--fg-3)',
    bg: 'var(--bg-0)',
    filled: false,
  },
  planned: {
    label: 'Planned',
    fg: 'var(--fg-3)',
    bg: 'var(--bg-0)',
    filled: false,
  },
  'not-started': {
    label: 'Not Started',
    fg: 'var(--fg-4)',
    bg: 'var(--bg-0)',
    filled: false,
  },
  // Critical states use Gold
  overdue: {
    label: 'Overdue',
    fg: 'var(--gold-fg)',
    bg: 'var(--gold-bg)',
    filled: true,
  },
  blocked: {
    label: 'Blocked',
    fg: 'var(--gold-fg)',
    bg: 'var(--gold-bg)',
    filled: true,
  },
  'at-risk': {
    label: 'At Risk',
    fg: 'var(--gold-fg)',
    bg: 'var(--gold-bg)',
    filled: true,
  },
} as const;

// Brand accent - Catalyst Gold ONLY
export const BRAND = {
  gold: 'var(--gold-fg)',
  goldBg: 'var(--gold-bg)',
  goldBorder: 'var(--gold-bd)',
  goldHover: 'var(--brand-gold-hover)',
} as const;

// Indicators - Neutral
export const INDICATOR = {
  todayLine: 'var(--fg-3)',
  progressBar: 'var(--fg-3)',
  goldAccent: 'var(--gold-fg)',
} as const;
