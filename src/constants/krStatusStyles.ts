/**
 * KR Status Style Map - Single source of truth for all KR milestone styling
 * Used by both legend and roadmap markers
 */

export const KR_STATUS_STYLES = {
  complete: {
    label: 'Complete',
    color: '#5c7c5c', // Olive green
    filled: true,
  },
  'in-progress': {
    label: 'Current',
    color: '#c69c6d', // Gold
    filled: false, // Gold outline + white fill
  },
  current: {
    label: 'Current',
    color: '#c69c6d', // Gold
    filled: false,
  },
  'not-started': {
    label: 'Pending',
    color: '#d4b896', // Champagne
    filled: false,
  },
  pending: {
    label: 'Pending',
    color: '#d4b896', // Champagne
    filled: false,
  },
  overdue: {
    label: 'Overdue',
    color: '#c75a4a', // Terracotta
    filled: true,
  },
  blocked: {
    label: 'Overdue',
    color: '#c75a4a', // Terracotta
    filled: true,
  },
} as const;

// Normalize status strings to canonical keys
export function normalizeKRStatus(status: string): keyof typeof KR_STATUS_STYLES {
  const normalized = status.toLowerCase().replace(/_/g, '-');
  if (normalized in KR_STATUS_STYLES) {
    return normalized as keyof typeof KR_STATUS_STYLES;
  }
  // Fallback mappings
  if (normalized === 'on-track' || normalized === 'on_track') return 'complete';
  if (normalized === 'at-risk' || normalized === 'at_risk') return 'in-progress';
  return 'not-started';
}

// Get style for a given status
export function getKRStatusStyle(status: string) {
  const key = normalizeKRStatus(status);
  return KR_STATUS_STYLES[key] || KR_STATUS_STYLES['not-started'];
}

// Legend items in display order
export const KR_LEGEND_ITEMS = [
  { key: 'complete', ...KR_STATUS_STYLES.complete },
  { key: 'in-progress', ...KR_STATUS_STYLES['in-progress'] },
  { key: 'not-started', ...KR_STATUS_STYLES['not-started'] },
  { key: 'overdue', ...KR_STATUS_STYLES.overdue },
];
