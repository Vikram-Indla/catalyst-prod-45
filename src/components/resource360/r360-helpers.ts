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
  // Fallback to name-based lookup
  return getStatusStyleFallback(item.status_name || '');
}

/** CG-05 fallback — only used when DB colors are null */
function getStatusStyleFallback(statusName: string): StatusStyle {
  switch (statusName?.toLowerCase()) {
    case 'todo':
    case 'to do':
    case 're-open':
      return { dot: '#D97706', bg: '#FFFBEB', text: '#78350F', category: 'unstarted' };
    case 'in progress':
      return { dot: '#2563EB', bg: '#EFF6FF', text: '#1E3A5F', category: 'started' };
    case 'in review':
      return { dot: '#0D9488', bg: '#F0FDFA', text: '#134E4A', category: 'started' };
    case 'done':
      return { dot: '#16A34A', bg: '#F0FDF4', text: '#14532D', category: 'completed' };
    case 'blocked':
      return { dot: '#EF4444', bg: '#FEF2F2', text: '#7F1D1D', category: 'blocked' };
    default:
      return { dot: '#94A3B8', bg: '#F8FAFC', text: '#334155', category: 'unstarted' };
  }
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
