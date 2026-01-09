export type CaseStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'DEPRECATED';

export type CycleStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type RunStatus = 'NOT_RUN' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';

export type DefectStatus = 'OPEN' | 'IN_PROGRESS' | 'FIXED' | 'VERIFIED' | 'CLOSED' | 'WONT_FIX' | 'DUPLICATE';

export type DefectSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'TRIVIAL';

export interface TMProject {
  id: string;
  name: string;
  key: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TMFolder {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  path: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: TMFolder[];
  case_count?: number;
}

export interface TMCasePriority {
  id: string;
  project_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_default: boolean;
}

export interface TMCaseType {
  id: string;
  project_id: string;
  name: string;
  icon?: string;
  sort_order: number;
  is_default: boolean;
}

export interface TMLabel {
  id: string;
  project_id: string;
  name: string;
  color: string;
}

export interface TMCaseStep {
  id: string;
  case_id: string;
  step_number: number;
  action: string;
  test_data?: string;
  expected_result: string;
  created_at: string;
  updated_at: string;
}

export interface TMTestCase {
  id: string;
  project_id: string;
  folder_id: string | null;
  key: string;
  title: string;
  objective?: string;
  preconditions?: string;
  status: CaseStatus;
  priority_id: string | null;
  type_id: string | null;
  version: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  priority?: TMCasePriority;
  type?: TMCaseType;
  folder?: TMFolder;
  steps?: TMCaseStep[];
  labels?: TMLabel[];
  created_by_user?: { id: string; full_name: string; avatar_url?: string };
  updated_by_user?: { id: string; full_name: string; avatar_url?: string };
}

export interface TMCycle {
  id: string;
  project_id: string;
  key: string;
  name: string;
  description?: string;
  status: CycleStatus;
  environment?: string;
  build_version?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  total_cases?: number;
  passed_count?: number;
  failed_count?: number;
  blocked_count?: number;
  not_run_count?: number;
  pass_rate?: number;
}

export interface TMRun {
  id: string;
  cycle_id: string;
  scope_id: string;
  case_id: string;
  run_number: number;
  status: RunStatus;
  executed_by: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  notes?: string;
  environment?: string;
  test_case?: TMTestCase;
  executor?: { id: string; full_name: string; avatar_url?: string };
  step_results?: TMStepResult[];
}

export interface TMCycleScope {
  id: string;
  cycle_id: string;
  case_id: string;
  assigned_to: string | null;
  status: RunStatus;
  last_run_id: string | null;
  last_run_at: string | null;
  created_at: string;
  test_case?: TMTestCase;
  assignee?: { id: string; full_name: string; avatar_url?: string };
  last_run?: TMRun;
}

export interface TMStepResult {
  id: string;
  run_id: string;
  step_id: string;
  step_number: number;
  status: RunStatus;
  actual_result?: string;
  executed_at?: string;
  defect_id?: string;
  step?: TMCaseStep;
  defect?: TMDefect;
}

export interface TMDefect {
  id: string;
  project_id: string;
  key: string;
  title: string;
  description?: string;
  severity: DefectSeverity;
  status: DefectStatus;
  assigned_to: string | null;
  reported_by: string;
  case_id?: string;
  run_id?: string;
  step_id?: string;
  external_id?: string;
  external_url?: string;
  created_at: string;
  updated_at: string;
  test_case?: TMTestCase;
  run?: TMRun;
  assignee?: { id: string; full_name: string; avatar_url?: string };
  reporter?: { id: string; full_name: string; avatar_url?: string };
  comments?: TMDefectComment[];
  attachments?: TMAttachment[];
}

export interface TMDefectComment {
  id: string;
  defect_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: { id: string; full_name: string; avatar_url?: string };
}

export interface TMAttachment {
  id: string;
  entity_type: 'defect' | 'run' | 'step_result';
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export interface TMCaseLabel {
  case_id: string;
  label_id: string;
}

export interface CaseFilters {
  folder_id?: string | null;
  status?: CaseStatus | CaseStatus[];
  priority_id?: string;
  type_id?: string;
  label_ids?: string[];
  search?: string;
  page?: number;
  per_page?: number;
}

export interface CycleFilters {
  status?: CycleStatus | CycleStatus[];
  environment?: string;
  search?: string;
}

export interface DefectFilters {
  status?: DefectStatus | DefectStatus[];
  severity?: DefectSeverity | DefectSeverity[];
  assigned_to?: string;
  cycle_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface ScopeFilters {
  status?: RunStatus | RunStatus[];
  assigned_to?: string;
  search?: string;
}

export interface CreateCaseInput {
  title: string;
  objective?: string;
  preconditions?: string;
  status?: CaseStatus;
  folder_id?: string;
  priority_id?: string;
  type_id?: string;
  label_ids?: string[];
  steps?: CreateStepInput[];
  is_ai_generated?: boolean;
  ai_generation_prompt?: string;
  ai_model?: string;
}

export interface UpdateCaseInput extends Partial<CreateCaseInput> {
  id: string;
}

export interface CreateStepInput {
  action: string;
  test_data?: string;
  expected_result: string;
}

export interface CreateCycleInput {
  name: string;
  description?: string;
  environment?: string;
  build_version?: string;
  planned_start_date?: string;
  planned_end_date?: string;
}

export interface UpdateCycleInput extends Partial<CreateCycleInput> {
  id: string;
  status?: CycleStatus;
}

export interface CreateDefectInput {
  title: string;
  description?: string;
  severity: DefectSeverity;
  assigned_to?: string;
  case_id?: string;
  run_id?: string;
  step_id?: string;
  external_id?: string;
  external_url?: string;
}

export interface UpdateDefectInput extends Partial<CreateDefectInput> {
  id: string;
  status?: DefectStatus;
}

export interface ReportSummary {
  total_cases: number;
  total_cycles: number;
  total_runs: number;
  total_defects: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  not_run_count: number;
  pass_rate: number;
  defects_by_severity: Record<DefectSeverity, number>;
  defects_by_status: Record<DefectStatus, number>;
}

export interface ExecutionTrend {
  date: string;
  passed: number;
  failed: number;
  blocked: number;
  total: number;
}

export interface TesterPerformance {
  user_id: string;
  user_name: string;
  avatar_url?: string;
  executed: number;
  passed: number;
  failed: number;
  pass_rate: number;
  avg_duration: number;
  defects_filed: number;
}

// ============================================================
// DASHBOARD VIEW TYPES
// ============================================================
export interface TMDashboardKPIs {
  totalAssigned: number;
  notRun: number;
  inProgress: number;
  passedToday: number;
  failedToday: number;
  coverage: number;
  coverageGaps: number;
  passRate: number;
  passRateTrend: number;
  openDefects: number;
  criticalDefects: number;
  majorDefects: number;
  minorDefects: number;
  blockers: number;
}

export interface TMCycleSummary {
  id: string;
  key: string;
  name: string;
  status: CycleStatus;
  daysLeft: number | null;
  isOverdue: boolean;
  progress: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    inProgress: number;
    notRun: number;
  };
  percentage: number;
}

export interface TMActivityItem {
  id: string;
  userName: string;
  userAvatar: string | null;
  actionType: string;
  entityType: string;
  entityKey: string;
  entityTitle: string | null;
  createdAt: string;
  isLive: boolean;
}

export interface TMMyWorkItem {
  id: string;
  key: string;
  title: string;
  status: CaseStatus;
  statusColor: 'success' | 'warning' | 'danger' | 'default';
  priority: string | null;
  cycleKey: string | null;
  updatedAt: string;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
export function getCaseStatusColor(status: CaseStatus): 'success' | 'warning' | 'danger' | 'default' {
  const map: Record<CaseStatus, 'success' | 'warning' | 'danger' | 'default'> = {
    APPROVED: 'success',
    REVIEW: 'warning',
    DEPRECATED: 'danger',
    DRAFT: 'default',
  };
  return map[status] ?? 'default';
}

export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function getExecutionStatusColor(status: RunStatus): string {
  const map: Record<RunStatus, string> = {
    PASSED: 'text-success',
    FAILED: 'text-danger',
    BLOCKED: 'text-warning',
    IN_PROGRESS: 'text-info',
    NOT_RUN: 'text-muted-foreground',
    SKIPPED: 'text-muted-foreground',
  };
  return map[status] ?? 'text-muted-foreground';
}

export function getSeverityColor(severity: DefectSeverity): string {
  const map: Record<DefectSeverity, string> = {
    CRITICAL: 'text-danger',
    MAJOR: 'text-warning',
    MINOR: 'text-info',
    TRIVIAL: 'text-muted-foreground',
  };
  return map[severity] ?? 'text-muted-foreground';
}
