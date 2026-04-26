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

export interface GroupBucket {
  groupKey: string;
  groupLabel: string;
  issueIds: string[];
}

export type ColMap = Record<string, string[]>;
