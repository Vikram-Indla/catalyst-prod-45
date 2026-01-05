// Test Management Dashboard Types

export interface TMCaseTrendData {
  date: string;
  created: number;
  edited: number;
}

export interface TMExecutionTrendData {
  date: string;
  passed: number;
  failed: number;
  blocked: number;
  total: number;
}

export interface TMDashboardSummary {
  total_cases: number;
  total_cycles: number;
  total_runs: number;
  total_defects: number;
  pass_rate: number;
  active_cycles: number;
  cases_by_status: {
    draft: number;
    review: number;
    approved: number;
    deprecated: number;
  };
  defects_by_severity: {
    critical: number;
    major: number;
    minor: number;
    trivial: number;
  };
}

export interface TMTesterPerformance {
  user_id: string;
  user_name: string;
  avatar_url?: string;
  executed: number;
  passed: number;
  failed: number;
  pass_rate: number;
  avg_duration_seconds: number;
  defects_filed: number;
}

export interface TMCoverageData {
  feature_id: string;
  feature_name: string;
  total_cases: number;
  executed_cases: number;
  passed_cases: number;
  coverage_percentage: number;
}
