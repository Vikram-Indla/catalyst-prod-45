/**
 * KR Status Style Map - Token-compliant single source of truth
 * Uses Catalyst V5 semantic tokens for guaranteed dark/light mode compliance
 * 
 * IMPORTANT: All colors are CSS variables, not hex values
 */

import { KR_STATUS, INDICATOR } from '@/lib/catalyst-tokens';

export const KR_STATUS_STYLES = {
  // Complete / On Track - Success semantic
  complete: {
    label: 'Complete',
    color: 'var(--success-fg)',
    filled: true,
  },
  'on-track': {
    label: 'On Track',
    color: 'var(--success-fg)',
    filled: true,
  },
  
  // Current / In Progress - Success outline
  current: {
    label: 'Current',
    color: 'var(--success-fg)',
    filled: false,
    fillColor: 'var(--bg-0)',
  },
  'in-progress': {
    label: 'In Progress',
    color: 'var(--success-fg)',
    filled: false,
    fillColor: 'var(--bg-0)',
  },
  
  // Pending / Planned - Neutral outline
  pending: {
    label: 'Pending',
    color: 'var(--neutral-fg)',
    filled: false,
    fillColor: 'var(--bg-0)',
  },
  planned: {
    label: 'Planned',
    color: 'var(--neutral-fg)',
    filled: false,
    fillColor: 'var(--bg-0)',
  },
  
  // Not Started - Neutral muted
  'not-started': {
    label: 'Not Started',
    color: 'var(--neutral-fg)',
    filled: false,
    fillColor: 'var(--bg-0)',
  },
  
  // Overdue / Blocked - Danger semantic
  overdue: {
    label: 'Overdue',
    color: 'var(--danger-fg)',
    filled: true,
  },
  blocked: {
    label: 'Blocked',
    color: 'var(--danger-fg)',
    filled: true,
  },
  
  // At Risk - Warning semantic
  'at-risk': {
    label: 'At Risk',
    color: 'var(--warning-fg)',
    filled: true,
  },
} as const;

// Today line color - Info semantic token
export const TODAY_LINE_COLOR = 'var(--info-fg)';

// Progress bar color - Info semantic token
export const PROGRESS_BAR_COLOR = 'var(--info-fg)';

// Normalize status strings to canonical keys
export function normalizeKRStatus(status: string): keyof typeof KR_STATUS_STYLES {
  if (!status) return 'not-started';
  
  const normalized = status.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
  
  // Direct match
  if (normalized in KR_STATUS_STYLES) {
    return normalized as keyof typeof KR_STATUS_STYLES;
  }
  
  // Alias mappings
  const aliasMap: Record<string, keyof typeof KR_STATUS_STYLES> = {
    'on-track': 'complete',
    'done': 'complete',
    'completed': 'complete',
    'active': 'current',
    'ongoing': 'in-progress',
    'todo': 'not-started',
    'backlog': 'not-started',
    'late': 'overdue',
    'delayed': 'overdue',
  };
  
  if (normalized in aliasMap) {
    return aliasMap[normalized];
  }
  
  return 'not-started';
}

// Get style for a given status
export function getKRStatusStyle(status: string) {
  const key = normalizeKRStatus(status);
  return KR_STATUS_STYLES[key] || KR_STATUS_STYLES['not-started'];
}

// Legend items in display order (unique statuses only)
export const KR_LEGEND_ITEMS = [
  { key: 'complete', ...KR_STATUS_STYLES.complete },
  { key: 'current', ...KR_STATUS_STYLES.current },
  { key: 'pending', ...KR_STATUS_STYLES.pending },
  { key: 'overdue', ...KR_STATUS_STYLES.overdue },
];
