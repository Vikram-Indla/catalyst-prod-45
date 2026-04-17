/**
 * Sort utilities for SubtasksPanel.
 *
 * Mirrors Jira's Child work items / Subtasks sort menu:
 *   Created · Key · Priority · Status · Assignee
 *
 * Direction cycles asc → desc → off (off = manual rank by `position`).
 * Verified against atlassian.community + JRACLOUD-78353 (Apr 2026).
 */
import type { SubtaskRow } from './hooks/useSubtaskMutations';
import { normalisePriority, PRIORITY_MAP } from '@/components/shared/PriorityIndicator';

export type SortField = 'created' | 'key' | 'priority' | 'status' | 'assignee';
export type SortDir = 'asc' | 'desc';

export interface SortState {
  field: SortField | null;
  dir: SortDir;
}

export const SORT_FIELDS: Array<{ field: SortField; label: string }> = [
  { field: 'created', label: 'Created' },
  { field: 'key', label: 'Key' },
  { field: 'priority', label: 'Priority' },
  { field: 'status', label: 'Status' },
  { field: 'assignee', label: 'Assignee' },
];

const STATUS_CATEGORY_RANK: Record<string, number> = {
  todo: 0,
  in_progress: 1,
  indeterminate: 1,
  done: 2,
};

/** Three-click cycle for the same field. */
export function cycleSort(prev: SortState, field: SortField): SortState {
  if (prev.field !== field) return { field, dir: 'asc' };
  if (prev.dir === 'asc') return { field, dir: 'desc' };
  return { field: null, dir: 'asc' }; // back to manual rank
}

/** Natural-numeric compare for issue keys like BAU-5091 vs BAU-5420. */
function compareKey(a: string, b: string): number {
  const re = /^([A-Za-z]+)-(\d+)$/;
  const am = a.match(re);
  const bm = b.match(re);
  if (am && bm && am[1] === bm[1]) {
    return Number(am[2]) - Number(bm[2]);
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function priorityRank(raw: string | null | undefined): number {
  return PRIORITY_MAP[normalisePriority(raw)].level; // 4 critical … 1 low
}

function timestamp(s: string | null | undefined): number {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

export function sortRows(rows: SubtaskRow[], state: SortState): SubtaskRow[] {
  if (!state.field) {
    // Manual rank — preserve incoming `position` order.
    return rows;
  }

  const dir = state.dir === 'asc' ? 1 : -1;
  const out = [...rows];

  const cmp: Record<SortField, (a: SubtaskRow, b: SubtaskRow) => number> = {
    created: (a, b) => timestamp(a.jira_created_at) - timestamp(b.jira_created_at),
    key: (a, b) => compareKey(a.issue_key, b.issue_key),
    // Higher severity first when ascending — feels natural in Jira ("Critical first")
    priority: (a, b) => priorityRank(b.priority) - priorityRank(a.priority),
    status: (a, b) => (STATUS_CATEGORY_RANK[(a.status_category ?? '').toLowerCase()] ?? 0)
                    - (STATUS_CATEGORY_RANK[(b.status_category ?? '').toLowerCase()] ?? 0),
    assignee: (a, b) => {
      const an = a.assignee_display_name ?? '';
      const bn = b.assignee_display_name ?? '';
      // Unassigned always last regardless of direction
      if (!an && bn) return 1;
      if (an && !bn) return -1;
      if (!an && !bn) return 0;
      return an.localeCompare(bn, undefined, { sensitivity: 'base' });
    },
  };

  out.sort((a, b) => {
    const primary = cmp[state.field!](a, b) * dir;
    if (primary !== 0) return primary;
    // Stable tiebreaker by position
    return (a.position ?? 0) - (b.position ?? 0);
  });
  return out;
}
