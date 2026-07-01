/**
 * Kanban Board (kanban-board feature) — type definitions.
 *
 * Brand-new feature. ONLY the data source (Supabase tables) is shared with the
 * rest of Catalyst. No Catalyst UI types are imported here.
 */

export type StatusCategory = 'todo' | 'in_progress' | 'done';

export type GroupByMode = 'none' | 'assignee' | 'epic' | 'subtask' | 'priority';

export type WipState = 'normal' | 'warning' | 'exceeded';

/** A single work item rendered on a card. Mapped from a `ph_issues` row. */
export interface BoardIssue {
  id: string;
  issueKey: string;
  summary: string;
  issueType: string;
  priority: string;
  status: string;
  statusCategory: string;
  assigneeName: string | null;
  labels: string[];
  sprintName: string | null;
  storyPoints: number | null;
  parentKey: string | null;
  parentSummary: string | null;
  sprintRelease: string | null;
  isFlagged: boolean;
  /** Card cover — raw CSS background value (hex, linear-gradient(), url()). */
  cover: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  statusChangedAt: string | null;
  dueDate: string | null;
}

/** A board column, derived from `board_columns` + `board_status_mappings`. */
export interface KanbanColumn {
  id: string;
  name: string;
  statuses: string[];
  category: StatusCategory;
  /** Optional WIP limit (max issues). null = no limit. */
  max: number | null;
}

/** Resolved board configuration for a project. */
export interface BoardConfig {
  boardId: string | null;
  boardName: string;
  columns: KanbanColumn[];
  /** lowercased status name -> column id */
  statusToColId: Map<string, string>;
  /** column id -> primary (first) status name, used when moving cards */
  colPrimaryStatus: Record<string, string>;
  columnIdSet: Set<string>;
}

/** Board option in the board switcher. */
export interface BoardOption {
  id: string;
  name: string;
}

/** Card field visibility (View settings). */
export interface CardVisibleFields {
  labels: boolean;
  priority: boolean;
  estimate: boolean;
  assignee: boolean;
  daysInColumn: boolean;
  childProgress: boolean;
}

/** A swimlane group (group-by != none). */
export interface SwimlaneGroup {
  groupKey: string;
  groupLabel: string;
  avatarUrl?: string | null;
  issueIds: string[];
}

/** Pending status transition awaiting confirmation (drop into a Done column). */
export interface PendingTransition {
  issueId: string;
  issueKey: string;
  targetStatus: string;
  targetColumnId: string;
}
