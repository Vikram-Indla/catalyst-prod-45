/**
 * Module 3A-5: Timer & Metrics Types
 */

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerState {
  status: TimerStatus;
  startedAt: string | null;
  pausedAt: string | null;
  totalPausedSeconds: number;
  elapsedSeconds: number;
}

export interface StepMetrics {
  step_id: string;
  step_number: number;
  actual_duration: number | null;
  estimated_duration: number;
  result: string | null;
  is_timer_running: boolean;
}

export interface CaseMetrics {
  execution_id: string;
  test_case_id: string;
  case_number: string;
  started_at: string | null;
  completed_at: string | null;
  estimated_duration: number;
  total_steps: number;
  completed_steps: number;
  passed_steps: number;
  failed_steps: number;
  total_actual_time: number;
  total_estimated_time: number;
  completion_percentage: number;
}

export interface RunMetrics {
  run_id: string;
  run_number: number;
  started_at: string;
  total_cases: number;
  completed_cases: number;
  remaining_cases: number;
  passed_cases: number;
  failed_cases: number;
  blocked_cases: number;
  skipped_cases: number;
  pass_rate: number;
  total_execution_time: number;
  avg_case_duration: number;
  velocity_per_hour: number;
  estimated_remaining_seconds: number | null;
  estimated_completion_time: string | null;
}

export type SpeedLevel = 'fast' | 'on_track' | 'slow' | 'behind';

export interface SpeedIndicator {
  level: SpeedLevel;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

export interface TimeEstimate {
  id: string;
  test_case_id?: string;
  step_id?: string;
  estimated_seconds: number;
  source: 'manual' | 'historical' | 'ai';
  confidence: number;
  sample_size: number;
}

export interface TrendPoint {
  index: number;
  value: number;
  timestamp?: string;
}

export interface UseTimerReturn {
  seconds: number;
  status: TimerStatus;
  formattedTime: string;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  stop: () => number;
}

export const SPEED_INDICATORS: Record<SpeedLevel, SpeedIndicator> = {
  fast: {
    level: 'fast',
    label: 'Fast',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    icon: '⚡',
  },
  on_track: {
    level: 'on_track',
    label: 'On Track',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: '✓',
  },
  slow: {
    level: 'slow',
    label: 'Slow',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: '⏱',
  },
  behind: {
    level: 'behind',
    label: 'Behind',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: '⚠',
  },
};
