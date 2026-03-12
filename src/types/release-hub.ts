// ReleaseHub TypeScript Interfaces

export type ReleaseStatus = 'PLANNING' | 'IN_PROGRESS' | 'RELEASED' | 'ARCHIVED';

export type ChangeStatus = 'NEW' | 'IN_UAT' | 'IN_BETA' | 'IN_PRODUCTION';

export type DeploymentResult = 'SUCCESS' | 'ROLLED_BACK' | 'MONITORING' | null;

export type RiskLevel = 'STANDARD' | 'HIGH' | 'EMERGENCY';

export type ChangeSource = 'JIRA' | 'CATALYST';

export type SignOffDecision = 'APPROVED' | 'REJECTED' | 'PENDING' | 'WAITING';

export type TestCycleResult = 'PASS' | 'FAIL' | 'IN_PROGRESS' | 'NOT_STARTED';

export interface Release {
  id: string;
  key: string;
  name: string;
  description: string;
  status: ReleaseStatus;
  target_date: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Change {
  id: string;
  key: string;
  title: string;
  description: string;
  status: ChangeStatus;
  deployment_result: DeploymentResult;
  risk_level: RiskLevel;
  source: ChangeSource;
  assignee_id: string;
  planned_date: string;
  release_id: string | null;
  sign_off_template_id: string;
  created_at: string;
  updated_at: string;
}

export interface SignOffGate {
  id: string;
  change_id: string;
  gate_name: string;
  gate_order: number;
  approver_id: string;
  decision: SignOffDecision;
  comment: string | null;
  decided_at: string | null;
}

export interface TestCycleLink {
  id: string;
  change_id: string;
  cycle_name: string;
  result: TestCycleResult;
  total_cases: number;
  passed_cases: number;
  run_date: string;
  runner_id: string;
}

export interface ProductionEvent {
  id: string;
  title: string;
  event_type: 'DEPLOYMENT' | 'HOTFIX' | 'ROLLBACK';
  change_key: string;
  release_key: string | null;
  deployment_result: DeploymentResult;
  deployed_by: string;
  deployed_at: string;
  duration_minutes: number;
  notes: string | null;
}

export interface ActivityLogEntry {
  id: string;
  entity_type: 'change' | 'release';
  entity_id: string;
  actor_name: string;
  actor_initials: string;
  action: string;
  detail: string;
  is_ai: boolean;
  created_at: string;
}
