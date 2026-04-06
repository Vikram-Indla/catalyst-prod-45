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
  backlog:    { label: 'Backlog',    color: 'rgba(237,237,237,0.40)', bg: '#1A1A1A' },
  ready:      { label: 'Ready',     color: '#2563EB', bg: 'rgba(59,130,246,0.06)' },
  in_dev:     { label: 'In Dev',    color: '#2563EB', bg: 'rgba(59,130,246,0.06)' },
  in_qa:      { label: 'In QA',     color: '#D97706', bg: '#FFFBEB' },
  in_uat:     { label: 'In UAT',    color: '#D97706', bg: '#FFFBEB' },
  in_beta:    { label: 'In Beta',   color: '#0D9488', bg: '#F0FDFA' },
  prod_ready: { label: 'Prod Ready',color: '#16A34A', bg: '#DCFCE7' },
  production: { label: 'Production',color: '#16A34A', bg: '#DCFCE7' },
  on_hold:    { label: 'On Hold',   color: '#EF4444', bg: 'rgba(248,113,113,0.06)' },
};

/** Priority display config */
export const PRIORITY_CONFIG: Record<IssuePriority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: '#DC2626' },
  high:   { label: 'High',   color: '#D97706' },
  medium: { label: 'Medium', color: '#2563EB' },
  low:    { label: 'Low',    color: 'rgba(237,237,237,0.40)' },
};

/** Issue type icon config */
export const ISSUE_TYPE_CONFIG: Record<IssueType, { icon: string; color: string; label: string }> = {
  epic:    { icon: '◆', color: '#7C3AED', label: 'Epic' },
  feature: { icon: '▲', color: '#2563EB', label: 'Feature' },
  story:   { icon: '●', color: '#0D9488', label: 'Story' },
  bug:     { icon: '⬡', color: '#DC2626', label: 'Bug' },
  task:    { icon: '■', color: '#D97706', label: 'Task' },
  subtask: { icon: '○', color: 'rgba(237,237,237,0.40)', label: 'Subtask' },
};

/** Default board columns */
export const DEFAULT_BOARD_COLUMNS: BoardColumn[] = [
  { name: 'Backlog',     statuses: ['backlog'],              color: 'rgba(237,237,237,0.40)', wip_limit: 0 },
  { name: 'Ready',       statuses: ['ready'],                color: '#2563EB', wip_limit: 10 },
  { name: 'In Progress', statuses: ['in_dev'],               color: '#2563EB', wip_limit: 8 },
  { name: 'In QA',       statuses: ['in_qa'],                color: '#D97706', wip_limit: 5 },
  { name: 'UAT',         statuses: ['in_uat', 'in_beta'],    color: '#0D9488', wip_limit: 5 },
  { name: 'Done',        statuses: ['prod_ready', 'production'], color: '#16A34A', wip_limit: 0 },
];
