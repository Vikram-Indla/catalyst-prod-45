/**
 * Column configuration for the Kanban board.
 *
 * Default columns mirror the BAU status taxonomy (data-derived bucketing of
 * `ph_issues.status` into board columns). When a project has a configured board
 * (`board_columns` + `board_status_mappings`), those override these defaults.
 */
import type { KanbanColumn, StatusCategory } from '../types';

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  {
    id: 'col-requirements',
    name: 'In requirements',
    category: 'todo',
    max: null,
    statuses: ['In Requirements', 'In Design', 'Awaiting Info', 'Demand Intake', 'New', 'Demand Validation'],
  },
  {
    id: 'col-ready-dev',
    name: 'Ready for dev',
    category: 'todo',
    max: null,
    statuses: ['Ready for Development', 'Backlog', 'ToDo', 'To Do'],
  },
  {
    id: 'col-dev',
    name: 'In development',
    category: 'in_progress',
    max: null,
    statuses: ['In Development', 'In Progress', 'Under Implementation'],
  },
  {
    id: 'col-testing',
    name: 'In testing',
    category: 'in_progress',
    max: null,
    statuses: ['In QA', 'Ready for QA', 'Retest', 'Internal QA', 'Staging/QA', 'In Testing'],
  },
  {
    id: 'col-uat',
    name: 'In UAT',
    category: 'in_progress',
    max: null,
    statuses: ['In UAT', 'UAT Ready', 'BETA READY', 'In BETA', 'In Integration', 'Pending UAT/BETA'],
  },
  {
    id: 'col-done',
    name: 'Done',
    category: 'done',
    max: null,
    statuses: ['Done', 'Closed', 'Resolved', 'In Production', 'ready for production', 'Rejected', 'Re-Open', 'Blocked', 'On Hold', 'Canceled'],
  },
];

export interface ColumnIndex {
  columns: KanbanColumn[];
  /** lowercased status -> column id */
  statusToColId: Map<string, string>;
  /** column id -> primary status (first in list) */
  colPrimaryStatus: Record<string, string>;
  columnIdSet: Set<string>;
  /** first column id per category, for unmapped-status fallback */
  firstColByCategory: Record<StatusCategory, string | undefined>;
}

export function indexColumns(columns: KanbanColumn[]): ColumnIndex {
  const statusToColId = new Map<string, string>();
  const colPrimaryStatus: Record<string, string> = {};
  const firstColByCategory: Record<StatusCategory, string | undefined> = {
    todo: undefined, in_progress: undefined, done: undefined,
  };
  for (const col of columns) {
    if (col.statuses.length > 0) colPrimaryStatus[col.id] = col.statuses[0];
    for (const s of col.statuses) statusToColId.set(s.toLowerCase(), col.id);
    if (!firstColByCategory[col.category]) firstColByCategory[col.category] = col.id;
  }
  return {
    columns,
    statusToColId,
    colPrimaryStatus,
    columnIdSet: new Set(columns.map((c) => c.id)),
    firstColByCategory,
  };
}

/**
 * Resolve which column an issue belongs in.
 * 1. exact status match → its column.
 * 2. unmapped status → first column whose category matches the issue's
 *    status_category (never a lie: it's the issue's own reported category).
 * 3. no category info → null (issue not placed).
 */
export function resolveColumnId(
  issue: { status: string; statusCategory: string },
  idx: ColumnIndex,
): string | null {
  const direct = idx.statusToColId.get((issue.status ?? '').toLowerCase());
  if (direct) return direct;
  const cat = (issue.statusCategory ?? '').toLowerCase();
  if (cat === 'done' || cat === 'in_progress' || cat === 'todo') {
    return idx.firstColByCategory[cat as StatusCategory] ?? null;
  }
  // Jira status_category strings: "To Do" / "In Progress" / "Done"
  if (cat === 'to do') return idx.firstColByCategory.todo ?? null;
  return null;
}
