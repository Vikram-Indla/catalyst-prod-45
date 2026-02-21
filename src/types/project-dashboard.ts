// === WORK ITEM TYPES ===
export type WorkItemType = 'story' | 'bug' | 'incident' | 'subtask';

export type WorkflowStatus =
  | 'start'
  | 'in_requirements'
  | 'in_design'
  | 'ready_for_development'
  | 'in_development'
  | 'on_hold'
  | 'in_qa'
  | 'in_uat'
  | 'in_entity_integration'
  | 'technical_validation'
  | 'in_beta'
  | 'end_to_end_testing'
  | 'production_ready'
  | 'beta_ready'
  | 'in_production';

export type StatusColor = 'gray' | 'blue' | 'green';

export type IncidentPriority = 'P1' | 'P2' | 'P3';
export type DefectSeverity = 'critical' | 'high' | 'medium' | 'low';

// === RELEASE ===
export interface Release {
  id: string;
  key: string;
  name: string;
  type: 'sprint' | 'hotfix' | 'major';
  status: 'active' | 'closed' | 'planned';
  target_date: string;
  item_count: number;
  completion_pct: number;
  project_id: string;
}

// === WORK ITEM ===
export interface WorkItem {
  id: string;
  key: string;
  title: string;
  type: WorkItemType;
  status: WorkflowStatus;
  release_id: string;
  release_key: string;
  project_id: string;
  assignee_id: string | null;
  assignee_name: string | null;
  parent_id: string | null;
  parent_key: string | null;
  parent_title: string | null;
  due_date: string | null;
  assigned_at: string | null;
  assigned_by_id: string | null;
  assigned_by_name: string | null;
  created_at: string;
  updated_at: string;
}

// === STATUS TRANSITION (for lifecycle) ===
export interface StatusTransition {
  id: string;
  work_item_id: string;
  from_status: WorkflowStatus | null;
  to_status: WorkflowStatus;
  changed_at: string;
  changed_by_id: string;
  changed_by_name: string;
  duration_days: number | null;
}

// === TIME IN STATUS (computed view) ===
export interface TimeInStatusEntry {
  work_item_id: string;
  work_item_key: string;
  work_item_type: WorkItemType;
  work_item_title: string;
  current_status: WorkflowStatus;
  release_key: string;
  statuses: {
    status: WorkflowStatus;
    entered_at: string;
    duration_days: number;
    changed_by: string;
  }[];
  total_cycle_days: number;
}

// === PRODUCTION INCIDENT (from IncidentHub) ===
export interface ProductionIncident {
  id: string;
  key: string;
  title: string;
  priority: IncidentPriority;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  release_id: string;
  release_key: string;
  days_open: number;
  reported_by_id: string;
  reported_by_name: string;
  assigned_to_id: string;
  assigned_to_name: string;
  created_at: string;
}

// === QA DEFECT ===
export interface QADefect {
  id: string;
  key: string;
  title: string;
  severity: DefectSeverity;
  status: WorkflowStatus;
  release_id: string;
  release_key: string;
  related_item_key: string | null;
  days_open: number;
  reported_by_id: string;
  reported_by_name: string;
  assigned_to_id: string;
  assigned_to_name: string;
  created_at: string;
}

// === TEAM MEMBER WORKLOAD ===
export interface TeamMemberWorkload {
  user_id: string;
  name: string;
  avatar_color: string;
  initials: string;
  total_count: number;
  story_count: number;
  subtask_count: number;
  bug_count: number;
  incident_count: number;
}

// === TEAM MEMBER ASSIGNED ITEM (drawer) ===
export interface AssignedItem {
  work_item_id: string;
  key: string;
  title: string;
  type: WorkItemType;
  status: WorkflowStatus;
  release_key: string;
  parent_key: string | null;
  parent_title: string | null;
  assigned_at: string;
  assigned_by: string;
  siblings: SiblingItem[];
}

export interface SiblingItem {
  key: string;
  title: string;
  assignee_name: string;
  status: WorkflowStatus;
}

// === ACTIVITY ===
export interface ActivityEntry {
  id: string;
  user_id: string;
  user_name: string;
  user_initials: string;
  user_color: string;
  action: string;
  item_key: string;
  item_type: WorkItemType;
  timestamp: string;
}

// === KEY MILESTONES CONFIG ===
export interface MilestoneConfig {
  id: string;
  project_id: string;
  statuses: WorkflowStatus[];
  updated_by: string;
}

// === DASHBOARD PROPS ===
export interface DashboardFilters {
  selectedReleaseIds: string[];
  projectId: string;
}

// === HELPER: Status → Color mapping ===
export const STATUS_COLOR_MAP: Record<WorkflowStatus, StatusColor> = {
  start: 'gray',
  in_requirements: 'gray',
  in_design: 'gray',
  ready_for_development: 'gray',
  in_development: 'blue',
  on_hold: 'blue',
  in_qa: 'blue',
  in_uat: 'blue',
  in_entity_integration: 'blue',
  technical_validation: 'blue',
  in_beta: 'green',
  end_to_end_testing: 'green',
  production_ready: 'green',
  beta_ready: 'green',
  in_production: 'green',
};

// === HELPER: Status display names ===
export const STATUS_DISPLAY: Record<WorkflowStatus, string> = {
  start: 'Start',
  in_requirements: 'In Requirements',
  in_design: 'In Design',
  ready_for_development: 'Ready for Dev',
  in_development: 'In Development',
  on_hold: 'On Hold',
  in_qa: 'In QA',
  in_uat: 'In UAT',
  in_entity_integration: 'In Entity Integration',
  technical_validation: 'Technical Validation',
  in_beta: 'In Beta',
  end_to_end_testing: 'End to End Testing',
  production_ready: 'Production Ready',
  beta_ready: 'Beta Ready',
  in_production: 'In Production',
};
