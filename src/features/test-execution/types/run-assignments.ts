/**
 * Module 4C-1: Run Case Assignments Types
 */

// Assignment status
export type AssignmentStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'passed' 
  | 'failed' 
  | 'blocked' 
  | 'skipped';

// Schedule type
export type ScheduleType = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';

// Run case assignment
export interface RunCaseAssignment {
  id: string;
  test_case_id: string;
  case_key: string;
  case_title: string;
  case_priority: string | null;
  assigned_tester_id: string | null;
  assigned_tester_name: string | null;
  priority: number;
  status: AssignmentStatus;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
}

// Assignment summary
export interface AssignmentSummary {
  total: number;
  pending: number;
  in_progress: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
}

// Run template
export interface RunTemplate {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  environment: string;
  configuration: Record<string, any>;
  test_case_filter: TestCaseFilter;
  default_testers: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Test case filter for templates
export interface TestCaseFilter {
  folder_id?: string;
  priority?: string;
  type?: string;
  tags?: string[];
}

// Create template input
export interface CreateTemplateInput {
  project_id: string;
  name: string;
  description?: string;
  environment?: string;
  configuration?: Record<string, any>;
  test_case_filter?: TestCaseFilter;
  default_testers?: string[];
}

// Scheduled run
export interface ScheduledRun {
  id: string;
  project_id: string;
  template_id: string | null;
  name: string;
  schedule_type: ScheduleType;
  schedule_config: ScheduleConfig;
  next_run_at: string | null;
  last_run_at: string | null;
  last_run_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Schedule configuration
export interface ScheduleConfig {
  time?: string; // HH:mm format
  days_of_week?: number[]; // 0-6 for weekly
  day_of_month?: number; // 1-31 for monthly
  cron_expression?: string; // For custom
  timezone?: string;
}

// Status configuration for UI
export const ASSIGNMENT_STATUS_CONFIG: Record<AssignmentStatus, { 
  label: string; 
  bgClass: string; 
  textClass: string;
  icon: string;
}> = {
  pending: { 
    label: 'Pending', 
    bgClass: 'bg-muted', 
    textClass: 'text-muted-foreground',
    icon: '○'
  },
  in_progress: { 
    label: 'In Progress', 
    bgClass: 'bg-blue-100 dark:bg-blue-900/30', 
    textClass: 'text-blue-700 dark:text-blue-300',
    icon: '◐'
  },
  passed: { 
    label: 'Passed', 
    bgClass: 'bg-green-100 dark:bg-green-900/30', 
    textClass: 'text-green-700 dark:text-green-300',
    icon: '✓'
  },
  failed: { 
    label: 'Failed', 
    bgClass: 'bg-red-100 dark:bg-red-900/30', 
    textClass: 'text-red-700 dark:text-red-300',
    icon: '✗'
  },
  blocked: { 
    label: 'Blocked', 
    bgClass: 'bg-amber-100 dark:bg-amber-900/30', 
    textClass: 'text-amber-700 dark:text-amber-300',
    icon: '⊘'
  },
  skipped: { 
    label: 'Skipped', 
    bgClass: 'bg-gray-100 dark:bg-gray-800', 
    textClass: 'text-gray-600 dark:text-gray-400',
    icon: '↷'
  },
};

export const SCHEDULE_TYPE_CONFIG: Record<ScheduleType, { label: string; description: string }> = {
  once: { label: 'One Time', description: 'Run once at a specific date/time' },
  daily: { label: 'Daily', description: 'Run every day at a specific time' },
  weekly: { label: 'Weekly', description: 'Run on selected days of the week' },
  monthly: { label: 'Monthly', description: 'Run on a specific day each month' },
  custom: { label: 'Custom', description: 'Use a cron expression' },
};
