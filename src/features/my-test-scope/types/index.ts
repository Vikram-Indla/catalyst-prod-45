/**
 * My Test Scope - Type Definitions
 */

export type TestStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';
export type DefectSeverity = 'blocker' | 'critical' | 'major' | 'minor' | 'trivial';
export type DefectStatus = 'open' | 'in_progress' | 'in_review' | 'blocked' | 'resolved' | 'closed';
export type IncidentPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type IncidentStatus = 'investigating' | 'identified' | 'mitigated' | 'resolved' | 'closed';
export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';
export type CoverageStatus = 'not_run' | 'passed' | 'failed' | 'partial';

export interface TestScopeItem {
  id: string;
  test_case_id: string;
  key: string;
  title: string;
  description?: string;
  score: number;
  status: TestStatus;
  due_date: string | null;
  is_overdue: boolean;
  cycle_id: string;
  cycle_name: string;
  estimated_minutes: number;
  last_executed_at: string | null;
  has_defects: boolean;
  defect_count: number;
  has_incidents: boolean;
  incident_count: number;
}

export interface AIRecommendation {
  id: string;
  test_case_id: string;
  key: string;
  title: string;
  score: number;
  due_date: string | null;
  is_overdue: boolean;
  cycle_name: string;
  estimated_minutes: number;
  linked_defects_count: number;
  linked_incidents_count: number;
  reasons: Array<{
    type: 'overdue' | 'defects' | 'incidents';
    message: string;
  }>;
}

export interface LinkedDefect {
  id: string;
  key: string;
  title: string;
  description?: string;
  severity: DefectSeverity;
  status: DefectStatus;
  affected_tests_count: number;
}

export interface LinkedIncident {
  id: string;
  key: string;
  title: string;
  description?: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  module: string;
  reported_at: string;
  affected_tests_count: number;
}

export interface Requirement {
  id: string;
  key: string;
  title: string;
  priority: RequirementPriority;
  coverage_percentage: number;
  tests: Array<{
    key: string;
    title: string;
    status: TestStatus;
  }>;
}

export interface TraceabilityData {
  total_requirements: number;
  covered: number;
  partial: number;
  uncovered: number;
  requirements: Requirement[];
}

export interface WorkloadData {
  hours_remaining: number;
  tests_remaining: number;
  next_deadline: string | null;
  days_until_deadline: number | null;
  burndown: Array<{
    date: string;
    remaining: number;
  }>;
}

export interface TestScopeSummary {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  not_run: number;
  in_progress: number;
  overdue: number;
  due_today: number;
}

export interface MyTestScopeData {
  summary: TestScopeSummary;
  ai_recommendation: AIRecommendation | null;
  tests: TestScopeItem[];
  defects: LinkedDefect[];
  incidents: LinkedIncident[];
  traceability: TraceabilityData;
  workload: WorkloadData;
  fetched_at: string;
}

// Filter types
export interface TestScopeFilters {
  status: TestStatus | 'all';
  priority: 'all' | 'critical' | 'high' | 'medium' | 'low';
  search: string;
  alert: 'overdue' | 'due_today' | 'defects' | 'incidents' | null;
}

export type SortOption = 'score' | 'due' | 'status' | 'title';

export type TabId = 'tests' | 'defects' | 'incidents' | 'traceability' | 'workload';
