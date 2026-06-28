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
  highest: 'var(--ds-text-danger)',
  critical: 'var(--ds-text-danger)',
  high:     'var(--ds-background-warning-bold)',
  medium:   'var(--ds-background-warning)',
  low:      'var(--ds-background-success-bold)',
  lowest:   'var(--ds-background-success)',
};

export const CARD_COLOR_BY_TYPE: Record<string, string> = {
  epic:             'var(--ds-background-discovery-bold)',
  feature:          'var(--ds-background-warning-bold)',
  story:            'var(--ds-background-success)',
  improvement:      'var(--ds-background-success)',
  task:             'var(--ds-background-information-bold)',
  bug:              'var(--ds-text-danger)',
  defect:           'var(--ds-text-danger)',
  'qa bug':         'var(--ds-text-danger)',
  'production incident': 'var(--ds-background-danger-bold)',
  incident:         'var(--ds-background-danger-bold)',
  'business gap':   'var(--ds-background-discovery)',
  'business request': 'var(--ds-background-warning)',
  'change request': 'var(--ds-background-warning)',
};
