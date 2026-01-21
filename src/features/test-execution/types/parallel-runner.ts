/**
 * Module 3B-1: Parallel Test Runner Types
 */

// Worker Status
export type WorkerStatus = 'idle' | 'running' | 'paused' | 'error' | 'terminated';

// Queue Priority
export type QueuePriority = 'critical' | 'high' | 'medium' | 'low';

// Priority Mode
export type PriorityMode = 'fifo' | 'priority' | 'random';

// Queue Item Status
export type QueueItemStatus = 'queued' | 'claimed' | 'running' | 'completed' | 'failed' | 'skipped';

// Parallel Run Config
export interface ParallelRunConfig {
  id: string;
  run_id: string;
  max_workers: number;
  priority_mode: PriorityMode;
  retry_failed: boolean;
  max_retries: number;
  timeout_seconds: number;
}

// Worker State
export interface WorkerState {
  id: string;
  worker_number: number;
  status: WorkerStatus;
  current_test: {
    id: string;
    case_number: string;
    title: string;
  } | null;
  claimed_at: string | null;
  last_heartbeat: string;
  completed_count: number;
  failed_count: number;
  total_execution_time: number;
  is_healthy: boolean;
}

// Queue Item
export interface QueueItem {
  id: string;
  run_id: string;
  test_case_id: string;
  execution_result_id: string;
  priority: number;
  position: number;
  status: QueueItemStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  retry_count: number;
  error_message: string | null;
  test_case?: {
    id: string;
    case_number: string;
    title: string;
    priority: QueuePriority;
  };
}

// Claim Result
export interface ClaimResult {
  success?: boolean;
  empty?: boolean;
  queue_item_id?: string;
  test_case?: {
    id: string;
    case_number: string;
    title: string;
    priority: string;
  };
  execution_id?: string;
  error?: string;
}

// Run Progress
export interface ParallelRunProgress {
  run_id: string;
  max_workers: number;
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  skipped: number;
  progress_percentage: number;
  estimated_remaining_seconds: number | null;
}

// Worker Assignment (for UI)
export interface WorkerAssignment {
  workerId: string;
  testCaseId: string;
  executionId: string;
  progress: number;
  startedAt: number;
}

// Execution Event
export interface ExecutionEvent {
  type: 'test_claimed' | 'test_completed' | 'test_failed' | 'worker_idle' | 'worker_error';
  workerId: string;
  workerNumber?: number;
  testCaseId?: string;
  testTitle?: string;
  result?: string;
  timestamp: number;
}

// Runner State
export interface ParallelRunnerState {
  isRunning: boolean;
  isPaused: boolean;
  workers: WorkerState[];
  queue: QueueItem[];
  progress: ParallelRunProgress | null;
  events: ExecutionEvent[];
}

// Create Run Input
export interface CreateParallelRunInput {
  runId: string;
  maxWorkers?: number;
  priorityMode?: PriorityMode;
}

// Worker Pool Config
export interface WorkerPoolConfig {
  minWorkers: number;
  maxWorkers: number;
  heartbeatInterval: number; // milliseconds
  claimTimeout: number; // milliseconds
  abandonedTimeout: number; // seconds
}

// Default Worker Pool Config
export const DEFAULT_WORKER_POOL_CONFIG: WorkerPoolConfig = {
  minWorkers: 1,
  maxWorkers: 5,
  heartbeatInterval: 30000, // 30 seconds
  claimTimeout: 5000, // 5 seconds
  abandonedTimeout: 300, // 5 minutes
};

// Worker status colors (Catalyst V5)
export const WORKER_STATUS_STYLES: Record<WorkerStatus, { bg: string; text: string; border: string }> = {
  idle: { bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-border' },
  running: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/50' },
  paused: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/50' },
  error: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/50' },
  terminated: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
};

// Queue status styles
export const QUEUE_STATUS_STYLES: Record<QueueItemStatus, { bg: string; text: string }> = {
  queued: { bg: 'bg-muted/50', text: 'text-muted-foreground' },
  claimed: { bg: 'bg-primary/10', text: 'text-primary' },
  running: { bg: 'bg-info/10', text: 'text-info' },
  completed: { bg: 'bg-success/10', text: 'text-success' },
  failed: { bg: 'bg-destructive/10', text: 'text-destructive' },
  skipped: { bg: 'bg-warning/10', text: 'text-warning' },
};
