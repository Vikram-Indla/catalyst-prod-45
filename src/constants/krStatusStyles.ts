/**
 * KR Status Style Map - Single source of truth for all KR milestone styling
 * Used by both legend and roadmap markers
 * 
 * AUTHORITATIVE COLOR MAPPING:
 * - Complete/On Track: Olive #5c7c5c (filled)
 * - Current/In Progress: Green #5c7c5c (outline + white fill)
 * - Pending/Planned: Champagne #d4b896 (outline)
 * - Overdue/Blocked: Terracotta #c75a4a (filled)
 * - Not Started: Grey #c8ccd0 (muted)
 * - At Risk/Today Line: Bronze #8b7355 (solid line)
 */

export const KR_STATUS_STYLES = {
  // Complete / On Track - Olive filled
  complete: {
    label: 'Complete',
    color: '#5c7c5c',
    filled: true,
  },
  'on-track': {
    label: 'Complete',
    color: '#5c7c5c',
    filled: true,
  },
  
  // Current / In Progress - Green outline + white fill
  current: {
    label: 'Current',
    color: '#5c7c5c',
    filled: false,
    fillColor: '#ffffff',
  },
  'in-progress': {
    label: 'Current',
    color: '#5c7c5c',
    filled: false,
    fillColor: '#ffffff',
  },
  
  // Pending / Planned - Champagne outline
  pending: {
    label: 'Pending',
    color: '#d4b896',
    filled: false,
    fillColor: '#ffffff',
  },
  planned: {
    label: 'Pending',
    color: '#d4b896',
    filled: false,
    fillColor: '#ffffff',
  },
  
  // Not Started - Grey muted
  'not-started': {
    label: 'Pending',
    color: '#d4b896',
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
  
  // At Risk - Bronze (for indicators)
  'at-risk': {
    label: 'At Risk',
    color: '#8b7355',
    filled: true,
  },
} as const;

// Today line color - Bronze
export const TODAY_LINE_COLOR = '#8b7355';

// Progress bar color - Gold
export const PROGRESS_BAR_COLOR = '#c69c6d';

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
