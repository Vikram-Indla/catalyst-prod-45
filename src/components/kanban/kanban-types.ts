/**
 * Kanban Board — Core types
 */

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
  fixVersion: string | null;
  isFlagged: boolean;
  updatedAt: string | null;
  createdAt: string | null;
  /**
   * Optional hub-scoped source indicator (e.g., 'catalyst' | 'jira').
   * When set, hub-scoped renderers (ProductHub kanban) render a SourceBadge.
   * Other hubs simply ignore it.
   */
  sourceTag?: 'catalyst' | 'jira' | null;
}

export type GroupByMode = 'none' | 'assignee' | 'epic' | 'priority' | 'fixVersion';

/**
 * Issue types treated as subtasks in the BAU project.
 * Jira parity: subtasks are hidden from the kanban board by default
 * (both in normal and swimlane/grouped modes). They appear only when the
 * user explicitly adds them via Advanced Filter → Issue Types.
 */
export const BOARD_SUBTASK_TYPES = new Set([
  'Sub-task', 'sub-task', 'subtask',
  'Backend', 'Frontend', 'Integration', 'Figma', 'Entity Figma',
]);

export interface GroupBucket {
  groupKey: string;
  groupLabel: string;
  issueIds: string[];
}

export type ColMap = Record<string, string[]>;
