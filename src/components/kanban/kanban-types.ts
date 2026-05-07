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

export type GroupByMode = 'none' | 'assignee' | 'epic' | 'priority' | 'fixVersion' | 'queries';

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

/* ── Card color maps (Jira parity: Board config → Card colors) ── */

export const CARD_COLOR_BY_PRIORITY: Record<string, string> = {
  highest: '#E5493A',
  critical: '#E5493A',
  high:     '#E97F33',
  medium:   '#FFAB00',
  low:      '#2D8738',
  lowest:   '#57A55A',
};

export const CARD_COLOR_BY_TYPE: Record<string, string> = {
  epic:             '#9B51E0',
  feature:          '#FF7452',
  story:            '#36B37E',
  improvement:      '#36B37E',
  task:             '#4BADE8',
  bug:              '#E5493A',
  defect:           '#E5493A',
  'qa bug':         '#E5493A',
  'production incident': '#FF5630',
  incident:         '#FF5630',
  'business gap':   '#FFAB00',
  'business request': '#FFAB00',
  'change request': '#FFAB00',
};
