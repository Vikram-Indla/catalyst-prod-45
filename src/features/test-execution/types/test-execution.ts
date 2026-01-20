/**
 * Module 3A-1: Execution Session Manager Types
 * Type definitions for test execution runs and results
 */

// Run Status Enum
export type RunStatus = 
  | 'draft' 
  | 'in_progress' 
  | 'paused' 
  | 'completed' 
  | 'aborted';

// Environment Types
export type ExecutionEnvironment = 
  | 'development' 
  | 'staging' 
  | 'production' 
  | 'custom';

// Browser Types
export type BrowserType = 
  | 'chrome' 
  | 'firefox' 
  | 'safari' 
  | 'edge' 
  | 'mobile_ios' 
  | 'mobile_android';

// Run Configuration
export interface RunConfiguration {
  browser?: BrowserType;
  browser_version?: string;
  operating_system?: string;
  screen_resolution?: string;
  custom_variables?: Record<string, string>;
  notifications?: {
    on_completion?: boolean;
    on_failure?: boolean;
    slack_channel?: string;
    email_recipients?: string[];
  };
}

// User Reference (lightweight)
export interface UserRef {
  id: string;
  name: string;
  avatar?: string | null;
}

// Run Progress Statistics
export interface RunProgress {
  total_cases: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  in_progress: number;
  not_run: number;
  completion_percentage: number;
  pass_rate: number;
  avg_execution_time?: number;
  total_execution_time?: number;
}

// Execution Run (full model)
export interface ExecutionRun {
  id: string;
  project_id: string;
  project_name?: string;
  run_number: number;
  name: string;
  description?: string | null;
  environment: ExecutionEnvironment;
  configuration: RunConfiguration;
  status: RunStatus;
  scheduled_start?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_by: UserRef;
  assigned_testers: UserRef[];
  progress: RunProgress;
  created_at: string;
  updated_at: string;
}

// Create Run Input
export interface CreateRunInput {
  project_id: string;
  name: string;
  description?: string;
  environment?: ExecutionEnvironment;
  configuration?: RunConfiguration;
  scheduled_start?: string;
  assigned_testers?: string[];
}

// Update Run Input
export interface UpdateRunInput {
  name?: string;
  description?: string;
  environment?: ExecutionEnvironment;
  configuration?: RunConfiguration;
  status?: RunStatus;
  assigned_testers?: string[];
}

// Run List Filters
export interface RunListFilters {
  project_id?: string;
  status?: RunStatus[];
  environment?: ExecutionEnvironment[];
  created_by?: string;
  assigned_tester?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Session Manager State
export interface SessionManagerState {
  selectedRunId: string | null;
  isCreating: boolean;
  isConfiguring: boolean;
  filters: RunListFilters;
  sortBy: 'created_at' | 'run_number' | 'name' | 'status';
  sortOrder: 'asc' | 'desc';
}

// Status Configuration (for UI)
export const RUN_STATUS_CONFIG: Record<RunStatus, { label: string; bgClass: string; textClass: string }> = {
  draft: { label: 'Draft', bgClass: 'bg-muted', textClass: 'text-muted-foreground' },
  in_progress: { label: 'In Progress', bgClass: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-700 dark:text-blue-300' },
  paused: { label: 'Paused', bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-700 dark:text-amber-300' },
  completed: { label: 'Completed', bgClass: 'bg-green-100 dark:bg-green-900/30', textClass: 'text-green-700 dark:text-green-300' },
  aborted: { label: 'Aborted', bgClass: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-700 dark:text-red-300' },
};

// Environment Configuration (for UI)
export const ENVIRONMENT_CONFIG: Record<ExecutionEnvironment, { label: string; bgClass: string; textClass: string }> = {
  development: { label: 'Development', bgClass: 'bg-purple-100 dark:bg-purple-900/30', textClass: 'text-purple-700 dark:text-purple-300' },
  staging: { label: 'Staging', bgClass: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-700 dark:text-blue-300' },
  production: { label: 'Production', bgClass: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-700 dark:text-red-300' },
  custom: { label: 'Custom', bgClass: 'bg-gray-100 dark:bg-gray-800', textClass: 'text-gray-700 dark:text-gray-300' },
};

// Default progress object
export const DEFAULT_PROGRESS: RunProgress = {
  total_cases: 0,
  passed: 0,
  failed: 0,
  blocked: 0,
  skipped: 0,
  in_progress: 0,
  not_run: 0,
  completion_percentage: 0,
  pass_rate: 0,
};
