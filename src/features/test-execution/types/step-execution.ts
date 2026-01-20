/**
 * Module 3A-2: Step-by-Step Runner Types
 */

export type StepResult = 'passed' | 'failed' | 'blocked' | 'skipped';
export type ExecutionResult = 'passed' | 'failed' | 'blocked';
export type EvidenceType = 'screenshot' | 'video' | 'file' | 'log';

export interface StepEvidence {
  id: string;
  type: EvidenceType;
  filename: string;
  url: string;
}

export interface ExecutionStep {
  id: string;
  step_number: number;
  action: string;
  expected_result: string;
  test_data?: string;
  result: StepResult | null;
  actual_result?: string;
  notes?: string;
  duration?: number;
  evidence: StepEvidence[];
}

export interface RunContext {
  id: string;
  run_number: number;
  name: string;
  environment: string;
  configuration: Record<string, unknown>;
}

export interface ExecutionContext {
  id: string;
  execution_order: number;
  overall_result: ExecutionResult | null;
  started_at?: string;
  completed_at?: string;
  total_duration?: number;
}

export interface ExecutionTestCase {
  id: string;
  case_number: string;
  title: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suite_name: string;
  preconditions: string;
  steps: ExecutionStep[];
  execution: ExecutionContext;
  run: RunContext;
}

export interface StepNavigationState {
  currentStepIndex: number;
  totalSteps: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export interface ExecutionProgress {
  completed: number;
  total: number;
  percentage: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
}

export interface RunnerSettings {
  autoAdvance: boolean;
  showKeyboardHints: boolean;
  timerEnabled: boolean;
  confirmOnExit: boolean;
}

export interface StepResultInput {
  step_id: string;
  result: StepResult;
  notes?: string;
  actual_result?: string;
  duration_seconds?: number;
}

export interface CompleteExecutionInput {
  overall_result: ExecutionResult;
  notes?: string;
}

export const RESULT_BUTTON_CONFIG: Record<StepResult, { label: string; hotkey: string; bgClass: string; hoverClass: string }> = {
  passed: { label: 'Pass', hotkey: 'P', bgClass: 'bg-green-600', hoverClass: 'hover:bg-green-700' },
  failed: { label: 'Fail', hotkey: 'F', bgClass: 'bg-red-600', hoverClass: 'hover:bg-red-700' },
  blocked: { label: 'Block', hotkey: 'B', bgClass: 'bg-amber-600', hoverClass: 'hover:bg-amber-700' },
  skipped: { label: 'Skip', hotkey: 'S', bgClass: 'bg-gray-500', hoverClass: 'hover:bg-gray-600' },
};
