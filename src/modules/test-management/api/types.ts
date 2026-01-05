/**
 * Test Management API Types
 */

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common enums
export type CaseStatus = 'draft' | 'ready' | 'approved' | 'needs_update' | 'deprecated';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type ExecutionStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';
export type CycleStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type ScopeStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked';
export type DefectSeverity = 'critical' | 'major' | 'minor' | 'trivial';
export type DefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';

// Test Case
export interface TestCase {
  id: string;
  project_id: string;
  folder_id?: string;
  case_key: string;
  title: string;
  description?: string;
  preconditions?: string;
  priority_id?: string;
  type_id?: string;
  status: CaseStatus;
  owner_id?: string;
  owner_name?: string;
  estimated_time_minutes?: number;
  is_template: boolean;
  template_id?: string;
  tags?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  steps?: TestStep[];
  priority?: CasePriority;
  case_type?: CaseType;
  folder?: Folder;
  labels?: Label[];
  _stepCount?: number;
  _lastRunStatus?: ExecutionStatus;
}

export interface TestStep {
  id: string;
  case_id: string;
  step_number: number;
  action: string;
  expected_result: string;
  test_data?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTestCaseInput {
  project_id: string;
  folder_id?: string;
  title: string;
  description?: string;
  preconditions?: string;
  priority_id?: string;
  type_id?: string;
  status?: CaseStatus;
  owner_id?: string;
  estimated_time_minutes?: number;
  is_template?: boolean;
  template_id?: string;
  tags?: string[];
  steps?: Omit<TestStep, 'id' | 'case_id' | 'created_at' | 'updated_at'>[];
}

export interface UpdateTestCaseInput extends Partial<CreateTestCaseInput> {
  id: string;
}

// Folder
export interface Folder {
  id: string;
  project_id: string;
  parent_id?: string;
  name: string;
  description?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: Folder[];
  case_count?: number;
}

export interface CreateFolderInput {
  project_id: string;
  parent_id?: string;
  name: string;
  description?: string;
}

// Test Cycle
export interface TestCycle {
  id: string;
  project_id: string;
  cycle_key: string;
  title: string;
  description?: string;
  environment_id?: string;
  status: CycleStatus;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  environment?: Environment;
  statistics?: CycleStatistics;
  scope?: CycleScope[];
}

export interface CycleStatistics {
  total_cases: number;
  not_run_count: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
}

export interface CycleScope {
  id: string;
  cycle_id: string;
  case_id: string;
  assigned_to?: string;
  current_status: ScopeStatus;
  latest_run_id?: string;
  created_at: string;
  updated_at: string;
  test_case?: TestCase;
  assigned_user?: { id: string; full_name?: string; avatar_url?: string };
}

export interface CreateCycleInput {
  project_id: string;
  title: string;
  description?: string;
  environment_id?: string;
  planned_start?: string;
  planned_end?: string;
  case_ids: string[];
  assignments?: { case_id: string; assigned_to: string }[];
}

export interface UpdateCycleInput extends Partial<Omit<CreateCycleInput, 'project_id'>> {
  id: string;
  status?: CycleStatus;
}

// Test Run
export interface TestRun {
  id: string;
  scope_id: string;
  run_number: number;
  status: ExecutionStatus;
  executed_by?: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  scope?: CycleScope;
  executed_by_user?: { id: string; full_name?: string; avatar_url?: string };
  step_results?: StepResult[];
}

export interface StepResult {
  id: string;
  run_id: string;
  step_id: string;
  step_number: number;
  status: ExecutionStatus;
  actual_result?: string;
  executed_at?: string;
  executed_by?: string;
  duration_seconds?: number;
  created_at: string;
  updated_at: string;
  step?: TestStep;
}

export interface CreateRunInput {
  scope_id: string;
}

export interface UpdateStepResultInput {
  status: ExecutionStatus;
  actual_result?: string;
  duration_seconds?: number;
}

export interface BulkUpdateStepsInput {
  updates: Array<{
    step_id: string;
    status: ExecutionStatus;
    actual_result?: string;
    duration_seconds?: number;
  }>;
}

export interface CompleteRunInput {
  notes?: string;
  override_status?: ExecutionStatus;
}

// Defects
export interface Defect {
  id: string;
  project_id: string;
  defect_key: string;
  title: string;
  description?: string;
  severity: DefectSeverity;
  status: DefectStatus;
  linked_run_id?: string;
  linked_step_id?: string;
  assigned_to?: string;
  reporter_id?: string;
  external_tracker_url?: string;
  external_tracker_id?: string;
  created_at: string;
  updated_at: string;
  run?: TestRun;
  step?: TestStep;
  assigned_user?: { id: string; full_name?: string; avatar_url?: string };
  reporter?: { id: string; full_name?: string; avatar_url?: string };
}

export interface CreateDefectInput {
  project_id: string;
  title: string;
  description?: string;
  severity: DefectSeverity;
  linked_run_id?: string;
  linked_step_id?: string;
  assigned_to?: string;
  external_tracker_url?: string;
  external_tracker_id?: string;
}

export interface UpdateDefectInput extends Partial<Omit<CreateDefectInput, 'project_id'>> {
  id: string;
  status?: DefectStatus;
}

// Admin Settings
export interface CasePriority {
  id: string;
  project_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaseType {
  id: string;
  project_id: string;
  name: string;
  icon?: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Environment {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  url?: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

// AI
export interface AIGenerateStepsInput {
  title: string;
  description?: string;
  context?: string;
}

export interface AIGenerateStepsResponse {
  steps: Array<{
    step_number: number;
    action: string;
    expected_result: string;
    test_data?: string;
  }>;
}

export interface AISuggestCasesInput {
  requirement: string;
  context?: string;
}

export interface AISuggestCasesResponse {
  suggestions: Array<{
    title: string;
    description: string;
    priority: Priority;
    type: string;
    steps: Array<{
      action: string;
      expected_result: string;
    }>;
  }>;
}

// My Work
export interface MyWorkItem {
  id: string;
  type: 'case' | 'cycle' | 'run';
  title: string;
  key: string;
  status: string;
  priority?: Priority;
  due_date?: string;
  cycle_title?: string;
  project_name?: string;
}

// Audit Log
export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id?: string;
  actor_name?: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORTS & ANALYTICS TYPES
// ══════════════════════════════════════════════════════════════════════════════

// Enums
export type ReportType = 
  | 'execution_summary'
  | 'coverage_report'
  | 'defect_analysis'
  | 'trend_analysis'
  | 'cycle_comparison'
  | 'custom';

export type ReportFormat = 'pdf' | 'xlsx' | 'csv' | 'json';

export type WidgetType = 
  | 'kpi_card'
  | 'bar_chart'
  | 'line_chart'
  | 'donut_chart'
  | 'table'
  | 'heatmap'
  | 'progress_bar'
  | 'trend_sparkline';

export type DateRangePreset = 
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_14_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_week'
  | 'this_month'
  | 'this_quarter'
  | 'custom';

export type TrendGrouping = 'day' | 'week' | 'month';

// KPI Metrics
export interface KPIMetric {
  id: string;
  label: string;
  value: number;
  format: 'number' | 'percentage' | 'duration';
  trend: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  color: 'blue' | 'teal' | 'orange' | 'red' | 'purple';
  icon: string;
}

export interface ExecutionSummary {
  total_executions: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  pass_rate: number;
  total_duration_seconds: number;
  defects_found: number;
  unique_cases_executed: number;
}

export interface TrendDataPoint {
  period_start: string;
  total_executions: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  pass_rate: number;
}

export interface CoverageStats {
  total_requirements: number;
  covered_requirements: number;
  requirements_coverage_pct: number;
  total_test_cases: number;
  executed_test_cases: number;
  execution_coverage_pct: number;
  automated_test_cases: number;
  automation_rate_pct: number;
}

export interface CycleComparison {
  id: string;
  key: string;
  name: string;
  status: string;
  test_case_count: number;
  pass_rate: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  defect_count: number;
  duration_hours: number;
  trend_vs_previous: number;
}

// Report Configuration
export interface ReportConfig {
  date_range: {
    type: DateRangePreset;
    start?: string;
    end?: string;
  };
  cycles?: string[];
  metrics?: string[];
  filters?: {
    status?: string[];
    priority?: string[];
    severity?: string[];
    assigned_to?: string;
  };
  grouping?: TrendGrouping;
  chart_types?: string[];
  include_sections?: string[];
}

export interface ReportConfiguration {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  report_type: ReportType;
  config: ReportConfig;
  schedule_enabled: boolean;
  schedule_cron: string | null;
  schedule_recipients: string[];
  last_generated_at: string | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedReport {
  id: string;
  project_id: string;
  report_config_id: string | null;
  name: string;
  report_type: ReportType;
  format: ReportFormat;
  file_url: string | null;
  file_size_bytes: number | null;
  snapshot_data: Record<string, unknown> | null;
  parameters: ReportConfig;
  generated_by: string | null;
  generated_at: string;
  expires_at: string | null;
}

export interface WidgetConfig {
  metric?: string;
  date_range?: DateRangePreset;
  cycles?: string[];
  comparison?: 'previous_period' | 'previous_cycle' | 'none';
  chart_options?: Record<string, unknown>;
  limit?: number;
}

export interface DashboardWidget {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  widget_type: WidgetType;
  grid_x: number;
  grid_y: number;
  grid_w: number;
  grid_h: number;
  config: WidgetConfig;
  created_at: string;
  updated_at: string;
}
