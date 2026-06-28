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
    return { dot: 'var(--ds-text-warning, var(--cp-warning, #D97706))', bg: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-text-warning, #974F0C)', category: 'unstarted' };
  if (lower === 'in progress' || lower === 'under implementation' || lower === 'in development')
    return { dot: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', bg: 'var(--ds-background-selected, #EFF6FF)', text: 'var(--ds-text, #172B4D)', category: 'started' };
  if (lower === 'in review' || lower === 'in qa' || lower === 'ready for qa' || lower === 'retest')
    return { dot: 'var(--cp-teal-60, #0D9488)', bg: 'var(--ds-background-success, #DFFCF0)', text: 'var(--ds-text-success, #216E4E)', category: 'started' };
  if (lower === 'in uat' || lower === 'uat ready')
// TODO: ads-unmapped — #4C1D95 context unclear
    return { dot: 'var(--cp-purple-60, #7C3AED)', bg: 'var(--ds-background-discovery, #F3F0FF)', text: '#4C1D95', category: 'started' };
  if (lower === 'done' || lower === 'closed' || lower === 'resolved' || lower === 'ready for production' || lower === 'beta ready')
    return { dot: 'var(--ds-text-success, var(--cp-success, #16A34A))', bg: 'var(--ds-background-success, #DFFCF0)', text: 'var(--ds-text-success, #216E4E)', category: 'completed' };
  if (lower === 'blocked')
    return { dot: 'var(--ds-text-danger, #EF4444)', bg: 'var(--ds-background-danger, #FEF2F2)', text: 'var(--ds-text-danger, #AE2A19)', category: 'blocked' };
  if (lower === 're-open' || lower === 'reopen')
    return { dot: 'var(--ds-text-warning, var(--cp-warning, #D97706))', bg: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-text-warning, #974F0C)', category: 'unstarted' };
  if (lower === 'in requirements' || lower === 'awaiting info')
    return { dot: 'var(--ds-text-warning, var(--cp-warning, #D97706))', bg: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-text-warning, #974F0C)', category: 'unstarted' };
  if (lower === 'rejected')
    return { dot: 'var(--ds-text-danger, #EF4444)', bg: 'var(--ds-background-danger, #FEF2F2)', text: 'var(--ds-text-danger, #AE2A19)', category: 'completed' };

  // Fallback to statusCategory if available
  if (statusCategory) {
    const catLower = statusCategory.toLowerCase();
    if (catLower === 'done' || catLower === 'complete')
      return { dot: 'var(--ds-text-success, var(--cp-success, #16A34A))', bg: 'var(--ds-background-success, #DFFCF0)', text: 'var(--ds-text-success, #216E4E)', category: 'completed' };
    if (catLower === 'in progress' || catLower === 'indeterminate')
      return { dot: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', bg: 'var(--ds-background-selected, #EFF6FF)', text: 'var(--ds-text, #172B4D)', category: 'started' };
    if (catLower === 'to do' || catLower === 'new')
      return { dot: 'var(--ds-text-warning, var(--cp-warning, #D97706))', bg: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-text-warning, #974F0C)', category: 'unstarted' };
  }

  // Default — gray for truly unknown statuses
  return { dot: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))', bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken, #F1F5F9)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, #334155)))', category: 'unstarted' };
}

/** @deprecated Use resolveStatusStyle instead */
export const getStatusStyle = getStatusStyleFallback;

/** Priority config */
export function getPriorityColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'critical': return 'var(--ds-text-danger, #BE123C)';
    case 'highest': return 'var(--ds-text-danger, var(--cp-danger, #DC2626))';
    case 'high': return 'var(--ds-background-warning-bold, #E2B203)';
    case 'medium': return 'var(--ds-text-warning, #974F0C)';
    case 'low': return 'var(--ds-text-subtle, #57534E)';
    default: return 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))';
  }
}

/** Age color */
export function getAgeColor(ageDays: number): string {
  if (ageDays <= 7) return 'var(--ds-text-success, var(--cp-success, #16A34A))';
  if (ageDays <= 14) return 'var(--ds-text-warning, var(--cp-warning, #D97706))';
  return 'var(--ds-text-danger, #EF4444)';
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
