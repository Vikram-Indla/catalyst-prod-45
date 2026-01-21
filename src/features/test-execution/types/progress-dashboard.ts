/**
 * Module 3B-3: Progress Dashboard Types
 */

// Run Status
export type RunStatus = 'pending' | 'running' | 'paused' | 'completed' | 'aborted';

// Result Status
export type ResultStatus = 'passed' | 'failed' | 'blocked' | 'skipped';

// Progress Summary
export interface ProgressSummary {
  run_id: string;
  run_number: number;
  name: string;
  environment: string;
  status: RunStatus;
  started_at: string;
  completed_at: string | null;
  total: number;
  completed: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  running: number;
  queued: number;
  completion_percentage: number;
  pass_rate: number;
  elapsed_seconds: number;
  velocity_per_hour: number;
  eta_seconds: number | null;
}

// Status Item
export interface StatusItem {
  status: string;
  count: number;
  percentage: number;
}

// Status Breakdown
export interface StatusBreakdown {
  total: number;
  statuses: StatusItem[];
}

// Worker Activity
export interface WorkerActivity {
  id: string;
  worker_number: number;
  status: 'idle' | 'running' | 'paused' | 'error';
  current_test: {
    id: string;
    case_number: string;
    title: string;
  } | null;
  progress: number;
  claimed_at: string | null;
  last_heartbeat: string;
  completed_count: number;
  failed_count: number;
  is_healthy: boolean;
}

// Recent Result
export interface RecentResult {
  id: string;
  test_case_id: string;
  case_number: string;
  title: string;
  result: ResultStatus;
  duration_seconds: number;
  completed_at: string;
  executed_by: {
    id: string;
    name: string;
  };
}

// Trend Data Point
export interface TrendDataPoint {
  timestamp: string;
  pass_rate: number;
  completed: number;
}

// Trend Data
export interface TrendData {
  data_points: TrendDataPoint[];
}

// Dashboard State
export interface DashboardState {
  summary: ProgressSummary | null;
  statusBreakdown: StatusBreakdown | null;
  workers: WorkerActivity[];
  recentResults: RecentResult[];
  trendData: TrendData | null;
  isLive: boolean;
  lastUpdated: number;
}

// Refresh Config
export interface RefreshConfig {
  summaryInterval: number; // ms
  workersInterval: number; // ms
  resultsInterval: number; // ms
  trendsInterval: number; // ms
}

// Default Refresh Config
export const DEFAULT_REFRESH_CONFIG: RefreshConfig = {
  summaryInterval: 2000,
  workersInterval: 1000,
  resultsInterval: 2000,
  trendsInterval: 30000,
};

// Status Config for UI
export interface StatusConfig {
  key: string;
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
}

// Status configurations using semantic tokens
export const STATUS_CONFIGS: Record<string, StatusConfig> = {
  passed: { 
    key: 'passed', 
    label: 'Passed', 
    color: 'hsl(var(--success))',
    bgClass: 'bg-success', 
    textClass: 'text-success-foreground' 
  },
  failed: { 
    key: 'failed', 
    label: 'Failed', 
    color: 'hsl(var(--destructive))',
    bgClass: 'bg-destructive', 
    textClass: 'text-destructive-foreground' 
  },
  blocked: { 
    key: 'blocked', 
    label: 'Blocked', 
    color: 'hsl(var(--warning))',
    bgClass: 'bg-warning', 
    textClass: 'text-warning-foreground' 
  },
  skipped: { 
    key: 'skipped', 
    label: 'Skipped', 
    color: 'hsl(var(--muted))',
    bgClass: 'bg-muted', 
    textClass: 'text-muted-foreground' 
  },
  running: { 
    key: 'running', 
    label: 'Running', 
    color: 'hsl(var(--primary))',
    bgClass: 'bg-primary', 
    textClass: 'text-primary-foreground' 
  },
  queued: { 
    key: 'queued', 
    label: 'Queued', 
    color: 'hsl(var(--secondary))',
    bgClass: 'bg-secondary', 
    textClass: 'text-secondary-foreground' 
  },
};
