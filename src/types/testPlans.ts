export type PlanStatus = 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ScopeType = 'folder' | 'test_case';
export type ScopeAction = 'include' | 'exclude';

export interface TestPlan {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  status: PlanStatus;
  project_id: string;
  release_id: string | null;
  created_by: string;
  objectives: string | null;
  scope_description: string | null;
  risks_assumptions: string | null;
  entry_criteria: string | null;
  exit_criteria: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  environments: Array<{ name: string; url?: string }>;
  is_template: boolean;
  template_name: string | null;
  template_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  // Joined
  creator?: { id: string; full_name: string; avatar_url: string | null };
  release?: { id: string; name: string };
}

export interface PlanScope {
  id: string;
  plan_id: string;
  scope_type: ScopeType;
  entity_id: string;
  action: ScopeAction;
  added_at: string;
  folder?: { id: string; name: string } | null;
  test_case?: { id: string; case_key: string; title: string } | null;
}

export interface PlanTeamMember {
  id: string;
  plan_id: string;
  user_id: string;
  role: string;
  assigned_at: string;
  user?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface PlanMilestone {
  id: string;
  plan_id: string;
  name: string;
  description: string | null;
  target_date: string;
  completed_date: string | null;
  is_completed: boolean;
  sort_order: number;
}

export interface PlanApproval {
  id: string;
  plan_id: string;
  approver_id: string;
  status: ApprovalStatus;
  comments: string | null;
  decided_at: string | null;
  requested_at: string;
  approver?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface PlanProgress {
  total_tests: number;
  executed: number;
  passed: number;
  failed: number;
  remaining: number;
  progress_percent: number;
  pass_rate: number;
}

export interface PlanFilters {
  status?: PlanStatus[];
  releaseId?: string;
  search?: string;
}
