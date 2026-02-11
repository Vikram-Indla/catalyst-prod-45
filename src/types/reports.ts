export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface ExecutionMetrics {
  total_executed: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  not_run: number;
  pass_rate: number;
  execution_rate: number;
  avg_execution_time: number;
}

export interface TrendDataPoint {
  period: string;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  pass_rate: number;
}

export interface CoverageMetrics {
  total_tests: number;
  executed_tests: number;
  execution_coverage: number;
  automated_tests: number;
  automation_coverage: number;
  manual_tests: number;
}

export interface FolderMetrics {
  folder_id: string | null;
  folder_name: string | null;
  total: number;
  passed: number;
  failed: number;
  pass_rate: number;
}

export interface TesterPerformance {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_executed: number;
  passed: number;
  failed: number;
  pass_rate: number;
  avg_time_seconds: number;
}

export interface DefectMetrics {
  total: number;
  open: number;
  closed: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  new_this_period: number;
  closed_this_period: number;
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string | null;
  report_type: string;
  config: any;
  project_id: string | null;
  created_by: string | null;
  is_public: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportSchedule {
  id: string;
  report_id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  day_of_week: number | null;
  day_of_month: number | null;
  time_of_day: string;
  timezone: string;
  recipients: Array<{ email: string; name?: string }>;
  export_format: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
}
