/**
 * CATALYST TESTS - Cycle Type Definitions
 * Complete type system for test cycles and executions
 */

export interface TestCycle {
  id: string;
  key: string; // CYC-001
  name: string;
  objective: string;
  folder_id: string | null;
  program_id: string | null;
  owner_id: string | null;
  status: 'not_started' | 'active' | 'completed' | 'on_hold';
  start_date: string;
  end_date: string;
  environment: string;
  is_adhoc: boolean;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface CycleExecution {
  id: string;
  cycle_id: string;
  case_id: string;
  case_version: number;
  assigned_to: string | null;
  status: 'not_executed' | 'passed' | 'failed' | 'blocked' | 'skipped';
  executed_at: string | null;
  executed_by: string | null;
  effort_minutes: number | null;
  comments: string;
  created_at: string;
}

export interface CycleExecutionWithCase extends CycleExecution {
  case_key: string;
  case_title: string;
  assigned_to_name: string | null;
  defects: {
    id: string;
    key: string;
    title: string;
    status: string;
  }[];
}

export interface CreateCycleRequest {
  name: string;
  objective?: string;
  folder_id?: string | null;
  owner_id?: string;
  start_date: string;
  end_date: string;
  environment?: string;
  program_id?: string | null;
  cases?: {
    case_id: string;
    version: number;
    assigned_to?: string | null;
  }[];
  sets?: string[]; // set IDs to include all cases from
}

export interface BulkAssignRequest {
  cycle_id: string;
  execution_ids: string[];
  assigned_to: string;
}

export interface ExecutionStats {
  total: number;
  not_executed: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
}

export interface CycleWithStats extends TestCycle {
  execution_stats: ExecutionStats;
  my_stats: ExecutionStats;
  days_left: number;
}

export const EXECUTION_STATUS_COLORS = {
  not_executed: '#6b7280',
  passed: '#10b981',
  failed: '#ef4444',
  blocked: '#f59e0b',
  skipped: '#3b82f6',
} as const;

export const CYCLE_STATUS_MAP = {
  not_started: { label: 'Not Started', className: 'bg-gray-500/10 text-gray-500' },
  active: { label: 'Active', className: 'bg-green-500/10 text-green-500' },
  completed: { label: 'Completed', className: 'bg-blue-500/10 text-blue-500' },
  on_hold: { label: 'On Hold', className: 'bg-orange-500/10 text-orange-500' },
} as const;
