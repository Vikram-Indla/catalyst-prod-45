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

export type GroupByMode = 'none' | 'assignee' | 'epic' | 'feature' | 'priority' | 'fixVersion' | 'queries';

/**
 * Issue types treated as subtasks in the BAU project.
 * Jira parity: subtasks are hidden from the kanban board by default
 * (both in normal and swimlane/grouped modes). They appear only when the
 * user explicitly adds them via Advanced Filter → Issue Types.
 */
export const BOARD_SUBTASK_TYPES = new Set([
  'Sub-task', 'sub-task', 'subtask',
  'Backend', 'Frontend', 'Integration', 'Figma', 'Entity Figma',
  'API Requirement', 'BRD Task',
]);

/**
 * The three work-item types that appear on the Kanban board.
 * All other types (Bug, Task, CR, PI, Business Gap, etc.) are excluded
 * to keep the board focused on plannable units of work.
 *
 * In group-by-none (flat) mode only Stories are shown — Epics and Features
 * act as swimlane metadata only. In all other group-by modes all three types
 * are visible so swimlane headers can be populated with Epics / Features.
 */
export const KANBAN_BOARD_TYPES = new Set(['Epic', 'Story', 'Feature']);
export const KANBAN_STORY_TYPES = new Set(['Story']);

export interface GroupBucket {
  groupKey: string;
  groupLabel: string;
  issueIds: string[];
}

export type ColMap = Record<string, string[]>;

/* ── Card color maps (Jira parity: Board config → Card colors) ── */

export const CARD_COLOR_BY_PRIORITY: Record<string, string> = {
  highest: 'var(--ds-text-danger, #E5493A)',
  critical: 'var(--ds-text-danger, #E5493A)',
  high:     'var(--ds-background-warning-bold, #E97F33)',
  medium:   'var(--ds-background-warning, #FFAB00)',
  low:      'var(--ds-background-success-bold, #2D8738)',
  lowest:   'var(--ds-background-success, #57A55A)',
};

export const CARD_COLOR_BY_TYPE: Record<string, string> = {
  epic:             'var(--ds-background-discovery-bold, #9B51E0)',
  feature:          'var(--ds-background-warning-bold, #FF7452)',
  story:            'var(--ds-background-success, #36B37E)',
  improvement:      'var(--ds-background-success, #36B37E)',
  task:             'var(--ds-background-information-bold, #4BADE8)',
  bug:              'var(--ds-text-danger, #E5493A)',
  defect:           'var(--ds-text-danger, #E5493A)',
  'qa bug':         'var(--ds-text-danger, #E5493A)',
  'production incident': 'var(--ds-background-danger-bold, #FF5630)',
  incident:         'var(--ds-background-danger-bold, #FF5630)',
  'business gap':   'var(--ds-background-warning, #FFAB00)',
  'business request': 'var(--ds-background-warning, #FFAB00)',
  'change request': 'var(--ds-background-warning, #FFAB00)',
};
