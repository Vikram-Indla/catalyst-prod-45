/**
 * KR Status Style Map - Single source of truth for all KR milestone styling
 * Used by both legend and roadmap markers
 * 
 * AUTHORITATIVE COLOR MAPPING:
 * - Complete/On Track: Teal #0d9488 (filled)
 * - Current/In Progress: Teal #0d9488 (outline + white fill)
 * - Pending/Planned: Gray #9ca3af (outline)
 * - Overdue/Blocked: Red #ef4444 (filled)
 * - Not Started: Grey #c8ccd0 (muted)
 * - At Risk/Today Line: Amber #f59e0b (solid line)
 */

export const KR_STATUS_STYLES = {
  // Complete / On Track - Teal filled
  complete: {
    label: 'Complete',
    color: '#0d9488',
    filled: true,
  },
  'on-track': {
    label: 'Complete',
    color: '#0d9488',
    filled: true,
  },
  
  // Current / In Progress - Teal outline + white fill
  current: {
    label: 'Current',
    color: '#0d9488',
    filled: false,
    fillColor: '#ffffff',
  },
  'in-progress': {
    label: 'Current',
    color: '#0d9488',
    filled: false,
    fillColor: '#ffffff',
  },
  
  // Pending / Planned - Gray outline
  pending: {
    label: 'Pending',
    color: '#9ca3af',
    filled: false,
    fillColor: '#ffffff',
  },
  planned: {
    label: 'Pending',
    color: '#9ca3af',
    filled: false,
    fillColor: '#ffffff',
  },
  
  // Not Started - Grey muted
  'not-started': {
    label: 'Pending',
    color: '#9ca3af',
    filled: false,
    fillColor: '#ffffff',
  },
  
  // Overdue / Blocked - Terracotta filled
  overdue: {
    label: 'Overdue',
    color: '#c75a4a',
    filled: true,
  },
  blocked: {
    label: 'Overdue',
    color: '#c75a4a',
    filled: true,
  },
  
  // At Risk - Amber (for indicators)
  'at-risk': {
    label: 'At Risk',
    color: '#f59e0b',
    filled: true,
  },
} as const;

// Today line color - Blue
export const TODAY_LINE_COLOR = '#2563eb';

// Progress bar color - Blue
export const PROGRESS_BAR_COLOR = '#2563eb';

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
