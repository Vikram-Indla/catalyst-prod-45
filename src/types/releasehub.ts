export type ReleaseStatus = 'planning' | 'in_progress' | 'released' | 'archived' | 'todo' | 'done';
export type ChangeStatus = 'new' | 'in_qa' | 'in_uat' | 'in_beta' | 'in_production';
export type RiskLevel = 'standard' | 'high' | 'emergency';
export type ChangeSource = 'catalyst' | 'jira';
export type ReleaseSource = 'catalyst' | 'jira';
export type TestCycleStatus = 'not_started' | 'running' | 'passed' | 'failed' | 'blocked';

export interface Release {
  id: string;
  name: string;
  version: string;
  status: ReleaseStatus;
  source: ReleaseSource;
  jira_key?: string;
  target_date: string;
  owner_id: string;
  project_id: string;
  chg_count: number;
  created_at: string;
  updated_at: string;
}

export interface Change {
  id: string;
  chg_number: string;
  title: string;
  status: ChangeStatus;
  risk_level: RiskLevel;
  risk_score: number;
  source: ChangeSource;
  release_id?: string;
  category: string;
  deployment_date?: string;
  dependency?: string;
  deployment_process?: string;
  additional_commands?: string;
  additional_comments?: string;
  created_by: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChangeWorkItem {
  id: string;
  change_id: string;
  work_item_id: string;
  work_item_key: string;
  work_item_type: 'story' | 'bug' | 'task' | 'epic' | 'subtask';
  work_item_title: string;
  work_item_status: string;
  linked_at: string;
}

export interface ChangeStatusHistory {
  id: string;
  change_id: string;
  from_status: ChangeStatus;
  to_status: ChangeStatus;
  changed_by: string;
  changed_at: string;
  comment?: string;
}

export interface ChangeSignoff {
  id: string;
  change_id: string;
  stage: ChangeStatus;
  signoff_role: string;
  assigned_to: string;
  status: 'pending' | 'approved' | 'rejected';
  actioned_at?: string;
  actioned_by?: string;
  wait_started_at: string;
  comment?: string;
}

export interface FreezeWindow {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  reason?: string;
  created_by: string;
}

export interface ReleaseTestCycleLink {
  id: string;
  release_id: string;
  test_cycle_id: string;
  linked_at: string;
}

export interface ReleaseSummary extends Release {
  chg_count: number;
  test_cycle_count: number;
  test_cycle_pass_count: number;
  test_cycle_fail_count: number;
  test_cycle_running_count: number;
  days_remaining: number;
  is_overdue: boolean;
}

export interface ChangeSummary extends Change {
  release_name?: string;
  release_version?: string;
  work_item_count: number;
  work_items: ChangeWorkItem[];
  linked_test_cycle?: {
    id: string;
    name: string;
    status: TestCycleStatus;
    pass_count: number;
    total_cases: number;
  };
  pending_signoffs: number;
  oldest_pending_signoff_hours?: number;
}
