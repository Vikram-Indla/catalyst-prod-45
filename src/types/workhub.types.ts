/**
 * WorkHub Type Definitions
 * All core types for releases, themes, work items, resources, and KPIs
 */

export type WorkItemType = 'Epic' | 'Story' | 'Subtask' | 'Bug' | 'Task' | 'Incident';
export type WorkItemStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Blocked' | 'Cancelled';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type ReleaseStatus = 'Planned' | 'Active' | 'At Risk' | 'Completed' | 'Cancelled';
export type ThemeStatus = 'Active' | 'Completed' | 'On Hold';
export type SyncSource = 'jira' | 'catalyst' | 'manual';
export type Department = 'Engineering' | 'Design' | 'QA' | 'Platform' | 'Data' | 'Security' | 'Product' | 'DevOps' | 'Management';

export interface JiraProject {
  id: string;
  jira_project_id: string;
  project_key: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  last_synced_at?: string;
}

export interface Release {
  id: string;
  name: string;
  title: string;
  description?: string;
  status: ReleaseStatus;
  start_date?: string;
  target_date: string;
  actual_date?: string;
  owner_user_id?: string;
  color: string;
}

export interface Theme {
  id: string;
  name: string;
  description?: string;
  color: string;
  owner_user_id?: string;
  start_date?: string;
  end_date?: string;
  progress: number;
  status: ThemeStatus;
}

export interface WorkItem {
  id: string;
  jira_issue_id?: string;
  item_key: string;
  item_type: WorkItemType;
  summary: string;
  description?: string;
  status: WorkItemStatus;
  priority: Priority;
  parent_id?: string;
  depth: number;
  jira_project_id?: string;
  release_id?: string;
  theme_id?: string;
  assignee_user_id?: string;
  team_id?: string;
  due_date?: string;
  start_date?: string;
  last_synced_at?: string;
  jira_url?: string;
  sync_source: SyncSource;
  is_jira_locked: boolean;
  story_points?: number;
  estimated_hours?: number;
  actual_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkItemFull extends WorkItem {
  project_key?: string;
  project_name?: string;
  project_color?: string;
  release_name?: string;
  release_title?: string;
  release_status?: ReleaseStatus;
  release_color?: string;
  theme_name?: string;
  theme_color?: string;
  assignee_name?: string;
  assignee_role?: string;
  assignee_department?: string;
  assignee_color?: string;
  parent_key?: string;
  parent_summary?: string;
  children_count: number;
  comment_count: number;
}

export interface Resource {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  role?: string;
  department?: string;
  skills?: string[];
  color: string;
  avatar_url?: string;
  capacity_hours_per_week: number;
  is_active: boolean;
}

export interface ResourceUtilization extends Resource {
  jira_account_id?: string;
  total_items: number;
  active_items: number;
  completed_items: number;
  in_progress_items: number;
  blocked_items: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  utilization_percent: number;
  release_count: number;
  theme_count: number;
  next_due_date?: string;
}

export interface ReleaseProgress extends Release {
  total_items: number;
  done_items: number;
  in_progress_items: number;
  in_review_items: number;
  blocked_items: number;
  todo_items: number;
  completion_percent: number;
  unique_assignees: number;
  project_count: number;
  earliest_due?: string;
  latest_due?: string;
}

export interface ThemeProgress extends Theme {
  total_items: number;
  done_items: number;
  epic_count: number;
  story_count: number;
  subtask_count: number;
  completion_percent: number;
}

export interface CalendarEvent {
  entity_id: string;
  event_type: 'release' | 'theme' | 'workitem';
  event_title: string;
  event_date: string;
  event_start?: string;
  event_end?: string;
  event_status: string;
  assignee_user_id?: string;
  assignee_name?: string;
  event_color: string;
}

export interface DashboardKPIs {
  active_releases: number;
  at_risk_releases: number;
  active_themes: number;
  total_resources: number;
  blocked_items: number;
  total_work_items: number;
  done_work_items: number;
  overall_completion_percent: number;
  overdue_items: number;
  due_this_week: number;
}

export interface SyncLogEntry {
  id: string;
  jira_project_id?: string;
  sync_type: 'full' | 'incremental' | 'manual';
  status: 'running' | 'completed' | 'failed';
  items_created: number;
  items_updated: number;
  items_unchanged: number;
  errors: any[];
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  triggered_by?: string;
}
