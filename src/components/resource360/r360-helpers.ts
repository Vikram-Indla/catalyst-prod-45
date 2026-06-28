// ═══════════════════════════════════════════════════════════
// Resource 360° — Shared helpers (ring-fenced)
// Status colors: DB-first, fallback to CG-05 constants
// ═══════════════════════════════════════════════════════════

/** "Adnan Ali" → "adnan-ali" */
export function slugify(name: string | null): string {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/** "Adnan Ali" → "AA" */
export function initials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Status style resolved from DB fields, with CG-05 fallback */
export interface StatusStyle {
  dot: string;
  bg: string;
  text: string;
  category: string;
}

/**
 * Resolve status colors.
 * PRIORITY: Use DB values (status_dot_color, status_bg_color, status_color) if present.
 * FALLBACK: CG-05 Mental Model constants if DB values are null.
 */
export function resolveStatusStyle(item: {
  status_name?: string;
  status?: string;
  status_color?: string;
  status_bg_color?: string;
  status_dot_color?: string;
  status_category?: string;
}): StatusStyle {
  // If DB colors exist, use them directly
  if (item.status_dot_color && item.status_bg_color && item.status_color) {
    return {
      dot: item.status_dot_color,
      bg: item.status_bg_color,
      text: item.status_color,
      category: item.status_category || 'unstarted',
    };
  }
  // Fallback to name-based lookup — check both status_name and status
  const statusStr = item.status_name || item.status || '';
  return getStatusStyleFallback(statusStr, item.status_category);
}

/** CG-05 fallback — only used when DB colors are null */
function getStatusStyleFallback(statusName: string, statusCategory?: string): StatusStyle {
  const lower = statusName?.toLowerCase() || '';

  // First try exact match
  if (lower === 'todo' || lower === 'to do')
    return { dot: 'var(--ds-text-warning, var(--cp-warning))', bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', category: 'unstarted' };
  if (lower === 'in progress' || lower === 'under implementation' || lower === 'in development')
    return { dot: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', bg: 'var(--ds-background-selected)', text: 'var(--ds-text)', category: 'started' };
  if (lower === 'in review' || lower === 'in qa' || lower === 'ready for qa' || lower === 'retest')
    return { dot: 'var(--cp-teal-60)', bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)', category: 'started' };
  if (lower === 'in uat' || lower === 'uat ready')
    return { dot: 'var(--cp-purple-60)', bg: 'var(--ds-background-discovery)', text: '#4C1D95', category: 'started' };
  if (lower === 'done' || lower === 'closed' || lower === 'resolved' || lower === 'ready for production' || lower === 'beta ready')
    return { dot: 'var(--ds-text-success, var(--cp-success))', bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)', category: 'completed' };
  if (lower === 'blocked')
    return { dot: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)', category: 'blocked' };
  if (lower === 're-open' || lower === 'reopen')
    return { dot: 'var(--ds-text-warning, var(--cp-warning))', bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', category: 'unstarted' };
  if (lower === 'in requirements' || lower === 'awaiting info')
    return { dot: 'var(--ds-text-warning, var(--cp-warning))', bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', category: 'unstarted' };
  if (lower === 'rejected')
    return { dot: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)', category: 'completed' };

  // Fallback to statusCategory if available
  if (statusCategory) {
    const catLower = statusCategory.toLowerCase();
    if (catLower === 'done' || catLower === 'complete')
      return { dot: 'var(--ds-text-success, var(--cp-success))', bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)', category: 'completed' };
    if (catLower === 'in progress' || catLower === 'indeterminate')
      return { dot: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', bg: 'var(--ds-background-selected)', text: 'var(--ds-text)', category: 'started' };
    if (catLower === 'to do' || catLower === 'new')
      return { dot: 'var(--ds-text-warning, var(--cp-warning))', bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', category: 'unstarted' };
  }

  // Default — gray for truly unknown statuses
  return { dot: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))', category: 'unstarted' };
}

/** @deprecated Use resolveStatusStyle instead */
export const getStatusStyle = getStatusStyleFallback;

/** Priority config */
export function getPriorityColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'critical': return 'var(--ds-text-danger)';
    case 'highest': return 'var(--ds-text-danger, var(--cp-danger))';
    case 'high': return 'var(--ds-background-warning-bold)';
    case 'medium': return 'var(--ds-text-warning)';
    case 'low': return 'var(--ds-text-subtle)';
    default: return 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))';
  }
}

/** Age color */
export function getAgeColor(ageDays: number): string {
  if (ageDays <= 7) return 'var(--ds-text-success, var(--cp-success))';
  if (ageDays <= 14) return 'var(--ds-text-warning, var(--cp-warning))';
  return 'var(--ds-text-danger)';
}

export function getAgeLabel(ageDays: number): string {
  if (ageDays === 0) return 'Today';
  if (ageDays === 1) return '1d ago';
  return `${ageDays}d ago`;
}

/** Group items by date_label */
export function groupByDate<T extends { date_label?: string; group_date?: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.date_label || item.group_date || 'Unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}
