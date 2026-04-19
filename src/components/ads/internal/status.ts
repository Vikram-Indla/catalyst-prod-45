/**
 * Status bucket — canonical three-way category every Catalyst status must
 * map to (CLAUDE.md §5). Shared between Lozenge, StatusPopover, and any
 * future status-bearing primitive.
 *
 * Kept in a separate file so the Lozenge module stays "only exports
 * components" — Vite's React Fast Refresh requires that.
 */

export type StatusCategory = 'todo' | 'inProgress' | 'done';

/**
 * toStatusCategory — map a raw Jira/Catalyst status string to the canonical
 * three-bucket category. Unknown statuses fall through to 'todo' rather
 * than throwing — UI must never crash on an unexpected status string.
 */
export function toStatusCategory(raw: string | null | undefined): StatusCategory {
  const v = (raw ?? '').trim().toLowerCase();
  if (!v) return 'todo';
  if (['done', 'closed', 'resolved', 'released', 'approved', 'completed', 'archived'].includes(v)) {
    return 'done';
  }
  if (
    [
      'in progress',
      'in review',
      'active',
      'in_progress',
      'inprogress',
      'doing',
      'working',
      'selected for development',
    ].includes(v)
  ) {
    return 'inProgress';
  }
  return 'todo';
}
