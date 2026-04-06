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
    return { dot: '#D97706', bg: '#FFFBEB', text: '#78350F', category: 'unstarted' };
  if (lower === 'in progress' || lower === 'under implementation' || lower === 'in development')
    return { dot: '#2563EB', bg: '#EFF6FF', text: '#1E3A5F', category: 'started' };
  if (lower === 'in review' || lower === 'in qa' || lower === 'ready for qa' || lower === 'retest')
    return { dot: '#0D9488', bg: '#F0FDFA', text: '#134E4A', category: 'started' };
  if (lower === 'in uat' || lower === 'uat ready')
    return { dot: '#7C3AED', bg: '#F5F3FF', text: '#4C1D95', category: 'started' };
  if (lower === 'done' || lower === 'closed' || lower === 'resolved' || lower === 'ready for production' || lower === 'beta ready')
    return { dot: '#16A34A', bg: '#F0FDF4', text: '#14532D', category: 'completed' };
  if (lower === 'blocked')
    return { dot: '#EF4444', bg: '#FEF2F2', text: '#7F1D1D', category: 'blocked' };
  if (lower === 're-open' || lower === 'reopen')
    return { dot: '#D97706', bg: '#FFFBEB', text: '#78350F', category: 'unstarted' };
  if (lower === 'in requirements' || lower === 'awaiting info')
    return { dot: '#D97706', bg: '#FFFBEB', text: '#78350F', category: 'unstarted' };
  if (lower === 'rejected')
    return { dot: '#EF4444', bg: '#FEF2F2', text: '#7F1D1D', category: 'completed' };

  // Fallback to statusCategory if available
  if (statusCategory) {
    const catLower = statusCategory.toLowerCase();
    if (catLower === 'done' || catLower === 'complete')
      return { dot: '#16A34A', bg: '#F0FDF4', text: '#14532D', category: 'completed' };
    if (catLower === 'in progress' || catLower === 'indeterminate')
      return { dot: '#2563EB', bg: '#EFF6FF', text: '#1E3A5F', category: 'started' };
    if (catLower === 'to do' || catLower === 'new')
      return { dot: '#D97706', bg: '#FFFBEB', text: '#78350F', category: 'unstarted' };
  }

  // Default — gray for truly unknown statuses
  return { dot: '#64748B', bg: '#F1F5F9', text: '#334155', category: 'unstarted' };
}

/** @deprecated Use resolveStatusStyle instead */
export const getStatusStyle = getStatusStyleFallback;

/** Priority config */
export function getPriorityColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'critical': return '#BE123C';
    case 'highest': return '#DC2626';
    case 'high': return '#EA580C';
    case 'medium': return '#CA8A04';
    case 'low': return '#57534E';
    default: return '#64748B';
  }
}

/** Age color */
export function getAgeColor(ageDays: number): string {
  if (ageDays <= 7) return '#16A34A';
  if (ageDays <= 14) return '#D97706';
  return '#EF4444';
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
