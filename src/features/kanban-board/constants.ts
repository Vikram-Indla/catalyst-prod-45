/**
 * Kanban Board — constants. All strings, sizes, and visual maps.
 */

export const STRINGS = {
  PROJECTS: 'Projects',
  STAR_BOARD: 'Star this board',
  UNSTAR_BOARD: 'Unstar this board',
  MORE: 'More',
  SEARCH: 'Search',
  SEARCH_PLACEHOLDER: 'Search this board',
  CLEAR_SEARCH: 'Clear search',
  FILTER_EPIC: 'Epic',
  FILTER_TYPE: 'Type',
  FILTER_PRIORITY: 'Priority',
  CLEAR: 'Clear',
  GROUP_BY: 'Group',
  GROUP_NONE: 'None',
  GROUP_ASSIGNEE: 'Assignee',
  GROUP_EPIC: 'Epic',
  GROUP_SUBTASK: 'Subtask',
  GROUP_PRIORITY: 'Priority',
  ONLY_MY_ISSUES: 'Only My Issues',
  RECENTLY_UPDATED: 'Recently Updated',
  UNASSIGNED: 'Unassigned',
  ISSUE_SINGULAR: 'issue',
  ISSUE_PLURAL: 'issues',
  CREATE_ISSUE: 'Create',
  CREATE_PLACEHOLDER: 'What needs to be done?',
  NO_EPIC: 'Issues without epic',
  NO_PRIORITY: 'No priority',
  EMPTY_TITLE: 'Your board is empty',
  EMPTY_DESCRIPTION: 'Create an issue to get started',
  CHILD_PROGRESS: '{completed} of {total} done',
  ASSIGN_TO_ME: 'Assign to me',
  FLAG: 'Add flag',
  REMOVE_FLAG: 'Remove flag',
  COPY_LINK: 'Copy work item link',
  COPY_KEY: 'Copy work item key',
  ERROR_LOAD: "Couldn't load this board",
  RETRY: 'Retry',
} as const;

export const SIZES = {
  HEADER_HEIGHT: 56,
  TOOLBAR_HEIGHT: 52,
  COLUMN_WIDTH: 272,
  COLUMN_HEADER_HEIGHT: 40,
  CARD_RADIUS: 8,
  CARD_PADDING: 12,
  CARD_GAP: 12,
  CARD_FLAG_BORDER: 4,
  CARD_SUMMARY_LINES: 2,
  AVATAR_CARD: 24,
  ICON_CARD: 16,
  POINTS_HEIGHT: 20,
  POINTS_RADIUS: 10,
  LABEL_HEIGHT: 8,
  LABEL_WIDTH: 40,
  LABEL_RADIUS: 4,
  MAX_LABELS: 3,
  PROGRESS_HEIGHT: 4,
  DROP_INDICATOR_HEIGHT: 2,
  SEARCH_WIDTH: 200,
  SEARCH_WIDTH_FOCUSED: 280,
  AVATAR_TOOLBAR: 28,
  AVATAR_OVERLAP: -4,
  AVATAR_MAX_SHOWN: 5,
  QUICK_FILTER_HEIGHT: 24,
  QUICK_FILTER_RADIUS: 3,
  DROPDOWN_RADIUS: 4,
  DROPDOWN_MIN_WIDTH: 240,
  DROPDOWN_MAX_HEIGHT: 400,
  MENU_ITEM_HEIGHT: 36,
  TOOLTIP_DELAY: 300,
  SEARCH_DEBOUNCE_MS: 200,
  PAGE_PADDING_X: 20,
  Z_DROPDOWN: 400,
  Z_DRAG: 9999,
  DAYS_WARNING: 5,
  DAYS_DANGER: 14,
  RECENTLY_UPDATED_DAYS: 7,
} as const;


/**
 * Map a work item type string to an @atlaskit/icon-object glyph key.
 * Unknown types render the neutral generic 'issue' glyph (not a typed lie).
 */
export type IssueGlyphKey =
  | 'story' | 'epic' | 'bug' | 'task' | 'subtask'
  | 'new-feature' | 'improvement' | 'incident' | 'changes' | 'issue';

export function issueTypeToGlyph(issueType: string | null | undefined): IssueGlyphKey {
  const t = (issueType ?? '').trim().toLowerCase();
  switch (t) {
    case 'story': return 'story';
    case 'epic': return 'epic';
    case 'bug':
    case 'qa bug':
    case 'defect': return 'bug';
    case 'task': return 'task';
    case 'sub-task':
    case 'subtask': return 'subtask';
    case 'feature':
    case 'new feature': return 'new-feature';
    case 'improvement': return 'improvement';
    case 'production incident':
    case 'incident': return 'incident';
    case 'change request': return 'changes';
    default: return 'issue';
  }
}

/** Priority config: fresh SVG arrows (Jira parity), keyed by lowercased name. */
export interface PriorityConfig {
  /** 'up' (3 ascending bars), 'equal' (2 bars), 'down' (3 descending bars) */
  shape: 'up' | 'equal' | 'down';
  color: string;
  label: string;
}

export const PRIORITY_CONFIG: Record<string, PriorityConfig> = {
  highest: { shape: 'up', color: 'var(--ds-background-danger-bold)', label: 'Highest' },
  critical: { shape: 'up', color: 'var(--ds-background-danger-bold)', label: 'Critical' },
  high: { shape: 'up', color: 'var(--ds-background-danger-bold)', label: 'High' },
  medium: { shape: 'equal', color: 'var(--ds-background-warning-bold)', label: 'Medium' },
  low: { shape: 'down', color: 'var(--ds-background-success-bold)', label: 'Low' },
  lowest: { shape: 'down', color: 'var(--ds-link)', label: 'Lowest' },
};

export const DEFAULT_VISIBLE_FIELDS = {
  labels: false,
  workType: true,
  workItemKey: true,
  epic: true,
  dueDate: true,
  priority: true,
  assignee: true,
} as const;

export const QUICK_FILTERS = [
  { id: 'my-issues', label: STRINGS.ONLY_MY_ISSUES },
  { id: 'recently-updated', label: STRINGS.RECENTLY_UPDATED },
] as const;
