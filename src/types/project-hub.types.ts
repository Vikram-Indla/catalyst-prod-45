/**
 * ProjectHub SDLC Types
 * Core interfaces for the ProjectHub module
 */

export type IssueType = 'epic' | 'feature' | 'story' | 'task' | 'bug' | 'subtask';
export type IssueStatus = 'backlog' | 'ready' | 'in_dev' | 'in_qa' | 'in_uat' | 'in_beta' | 'prod_ready' | 'production' | 'on_hold';
export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low';
export type IssueSource = 'jira' | 'catalyst';

export interface ProjectIssue {
  id: string;
  key: string;
  title: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  assignee_id: string | null;
  release_id: string | null;
  due_date: string | null;
  overdue_days: number;
  source: IssueSource;
  jira_key: string | null;
  parent_id: string | null;
  children: string[];
  created_at: string;
  updated_at: string;
}

export interface BoardConfig {
  id: string;
  name: string;
  columns: BoardColumn[];
}

export interface BoardColumn {
  name: string;
  statuses: IssueStatus[];
  color: string;
  wip_limit: number;
}

export interface CardFieldConfig {
  type: boolean;
  key: boolean;
  title: boolean;
  priority: boolean;
  assignee: boolean;
  due: boolean;
  source: boolean;
  overdue: boolean;
}

export type ProjectView = 'backlog' | 'board' | 'list' | 'timeline';

/** Status display config */
export const STATUS_CONFIG: Record<IssueStatus, { label: string; color: string; bg: string }> = {
  backlog:    { label: 'Backlog',    color: 'var(--cp-ink-3, var(--cp-text-secondary))', bg: 'var(--cp-bg-sunken, var(--cp-bg-sunken))' },
  ready:      { label: 'Ready',     color: 'var(--cp-workstream-catalyst-primary)', bg: 'var(--ds-background-information)' },
  in_dev:     { label: 'In Dev',    color: 'var(--cp-workstream-catalyst-primary)', bg: 'var(--ds-background-information)' },
  in_qa:      { label: 'In QA',     color: 'var(--cp-warning)', bg: 'var(--ds-background-warning)' },
  in_uat:     { label: 'In UAT',    color: 'var(--cp-warning)', bg: 'var(--ds-background-warning)' },
  in_beta:    { label: 'In Beta',   color: 'var(--cp-teal-60)', bg: 'var(--ds-background-success)' },
  prod_ready: { label: 'Prod Ready',color: 'var(--cp-success)', bg: 'var(--ds-background-success)' },
  production: { label: 'Production',color: 'var(--cp-success)', bg: 'var(--ds-background-success)' },
  on_hold:    { label: 'On Hold',   color: 'var(--ds-background-danger-bold)', bg: 'var(--ds-background-danger)' },
};

/** Priority display config */
export const PRIORITY_CONFIG: Record<IssuePriority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'var(--cp-danger)' },
  high:   { label: 'High',   color: 'var(--cp-warning)' },
  medium: { label: 'Medium', color: 'var(--cp-workstream-catalyst-primary)' },
  low:    { label: 'Low',    color: 'var(--cp-ink-3, var(--cp-text-secondary))' },
};

/** Issue type icon config */
export const ISSUE_TYPE_CONFIG: Record<IssueType, { icon: string; color: string; label: string }> = {
  epic:    { icon: '◆', color: 'var(--cp-purple-60)', label: 'Epic' },
  feature: { icon: '▲', color: 'var(--cp-workstream-catalyst-primary)', label: 'Feature' },
  story:   { icon: '●', color: 'var(--cp-teal-60)', label: 'Story' },
  bug:     { icon: '⬡', color: 'var(--cp-danger)', label: 'Bug' },
  task:    { icon: '■', color: 'var(--cp-warning)', label: 'Task' },
  subtask: { icon: '○', color: 'var(--cp-ink-4, var(--cp-border-neutral-light))', label: 'Subtask' },
};

/** Default board columns */
export const DEFAULT_BOARD_COLUMNS: BoardColumn[] = [
  { name: 'Backlog',     statuses: ['backlog'],              color: 'var(--cp-ink-3, var(--cp-text-secondary))', wip_limit: 0 },
  { name: 'Ready',       statuses: ['ready'],                color: 'var(--cp-workstream-catalyst-primary)', wip_limit: 10 },
  { name: 'In Progress', statuses: ['in_dev'],               color: 'var(--cp-workstream-catalyst-primary)', wip_limit: 8 },
  { name: 'In QA',       statuses: ['in_qa'],                color: 'var(--cp-warning)', wip_limit: 5 },
  { name: 'UAT',         statuses: ['in_uat', 'in_beta'],    color: 'var(--cp-teal-60)', wip_limit: 5 },
  { name: 'Done',        statuses: ['prod_ready', 'production'], color: 'var(--cp-success)', wip_limit: 0 },
];
