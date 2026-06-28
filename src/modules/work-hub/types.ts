// Work Hub Types - Catalyst Project Space
// Based on Jira Cloud Work Hub design

export type WorkItemType = 'FEATURE' | 'STORY' | 'SUBTASK' | 'INCIDENT' | 'TASK' | 'DEFECT';

export type StatusCategory = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type Priority = 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST' | 'NONE';

export type WorkHubView = 'summary' | 'list' | 'all-work' | 'releases';

export type SearchMode = 'basic' | 'jql';

export type ReleaseStatus = 'RELEASED' | 'UNRELEASED' | 'ARCHIVED';

export interface WorkItem {
  id: string;
  key: string;
  type: WorkItemType;
  summary: string;
  description?: string;
  status: string;
  statusCategory: StatusCategory;
  priority: Priority;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  reporterId?: string;
  reporterName?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  labels?: string[];
  sprintRelease?: string[];
  parentId?: string;
  parentKey?: string;
  parentSummary?: string;
  isArchived?: boolean;
  children?: WorkItem[];
  hasChildren?: boolean;
  level?: number;
}

export interface ReleaseVersion {
  id: string;
  name: string;
  status: ReleaseStatus;
  startDate?: string;
  releaseDate?: string;
  description?: string;
  doneCount: number;
  inProgressCount: number;
  todoCount: number;
  warningCount: number;
  totalCount: number;
  driverName?: string;
  driverAvatar?: string;
  contributors?: { id: string; name: string; avatar?: string }[];
  approvers?: { id: string; name: string; avatar?: string }[];
}

export interface WorkHubFilters {
  search: string;
  project?: string;
  types: WorkItemType[];
  statuses: string[];
  priorities: Priority[];
  assignees: string[];
  epic?: string;
  statusCategory?: string;
  warnings?: boolean;
}

export interface SummaryMetrics {
  completed: number;
  updated: number;
  created: number;
  dueSoon: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  color: string;
}

export interface PriorityBreakdown {
  priority: Priority;
  count: number;
}

export interface TypeBreakdown {
  type: WorkItemType;
  label: string;
  count: number;
  percentage: number;
}

export interface TeamWorkload {
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar?: string;
  workDistribution: number;
  itemCount: number;
}

export interface EpicProgress {
  id: string;
  key: string;
  name: string;
  donePercent: number;
  inProgressPercent: number;
  todoPercent: number;
}

export interface ActivityItem {
  id: string;
  type: 'comment' | 'status_change' | 'assignee_change' | 'created';
  userId: string;
  userName: string;
  userAvatar?: string;
  workItemId: string;
  workItemKey: string;
  workItemSummary: string;
  workItemStatus?: string;
  details?: string;
  timestamp: string;
}

// Export menu items
export const EXPORT_MENU_ITEMS = [
  'Print list',
  'Print details',
  'Export XML',
  'Export RSS',
  'Export RSS (with comments)',
  'Export Word',
  'Export HTML report (all fields)',
  'Export HTML report (my defaults)',
  'Export CSV (all fields)',
  'Export CSV (my defaults)',
  'Export Excel CSV (all fields)',
  'Export Excel CSV (my defaults)',
  'Create dashboard gadget',
] as const;

// More menu items for All work view
export const MORE_MENU_ITEMS = [
  { id: 'chart', label: 'View work items as a chart', type: 'button' },
  { id: 'format', label: 'Format rules', type: 'button' },
  { id: 'hide-done', label: 'Hide done work items', type: 'toggle' },
  { id: 'hierarchy', label: 'Show hierarchy', type: 'toggle' },
  { id: 'bulk-change', label: 'Bulk change work items', type: 'button' },
  { id: 'import-csv', label: 'Import work items from CSV', type: 'button' },
  { id: 'all-items', label: 'Go to all work items', type: 'button' },
  { id: 'feedback', label: 'Give feedback', type: 'button' },
] as const;

// Type icons and colors
export const WORK_ITEM_TYPE_CONFIG: Record<WorkItemType, { label: string; color: string }> = {
  FEATURE: { label: 'Epic', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  STORY: { label: 'Story', color: 'var(--ds-text-success)' },
  SUBTASK: { label: 'Subtask', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  DEFECT: { label: 'Bug', color: 'var(--ds-text-danger)' },
  INCIDENT: { label: 'Production Incident', color: 'var(--ds-text-warning)' },
  TASK: { label: 'Task', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
};

// Priority config
export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: string }> = {
  HIGHEST: { label: 'Highest', color: 'var(--ds-background-danger-bold)', icon: 'chevrons-up' },
  HIGH: { label: 'High', color: 'var(--ds-background-danger-bold)', icon: 'chevron-up' },
  MEDIUM: { label: 'Medium', color: 'var(--ds-background-warning-bold)', icon: 'minus' },
  LOW: { label: 'Low', color: 'var(--ds-background-success-bold)', icon: 'chevron-down' },
  LOWEST: { label: 'Lowest', color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', icon: 'chevrons-down' },
  NONE: { label: 'None', color: 'var(--ds-text-disabled)', icon: 'minus' },
};

// Status colors
export const STATUS_COLORS: Record<string, string> = {
  'TODO': 'var(--ds-border)',
  'IN PROGRESS': 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  'DONE': 'var(--ds-text-success)',
  'READY FOR QA': 'var(--ds-text-warning)',
  'READY FOR PRODUCTION': 'var(--ds-text-success)',
  'CLOSED': 'var(--ds-text-success)',
};
