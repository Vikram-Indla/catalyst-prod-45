/**
 * CATALYST TESTS - TypeScript Interfaces
 * Phase 1 of 5: Database Foundation
 * 
 * These interfaces match the database schema for test management.
 * Follow Catalyst's existing TypeScript patterns for consistency.
 */

// ============================================
// ENUMS
// ============================================

export type TestType = 'manual' | 'automated' | 'bdd';

export type TestPriority = 'critical' | 'high' | 'medium' | 'low';

export type TestCaseStatus = 'draft' | 'approved' | 'deprecated';

export type TestCycleStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export type TestExecutionStatus = 'not_run' | 'passed' | 'failed' | 'blocked' | 'skipped';

export type TestStepStatus = 'passed' | 'failed' | 'blocked' | 'skipped';

export type LinkedWorkItemType = 'story' | 'feature' | 'epic' | 'task' | 'defect';

// ============================================
// TEST FOLDER INTERFACE
// ============================================

export interface TestFolder {
  id: string;
  name: string;
  parent_folder_id?: string;
  program_id?: string;
  team_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// TEST CASE INTERFACE
// ============================================

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  preconditions?: string;
  expected_result?: string;
  test_type: TestType;
  priority: TestPriority;
  status: TestCaseStatus;
  folder_id?: string;
  program_id?: string;
  linked_work_item_type?: LinkedWorkItemType;
  linked_work_item_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// TEST STEP INTERFACE
// ============================================

export interface TestStep {
  id: string;
  test_case_id: string;
  step_order: number;
  action: string;
  expected_result?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// TEST SET INTERFACE
// ============================================

export interface TestSet {
  id: string;
  name: string;
  description?: string;
  program_id?: string;
  team_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// TEST SET CASE INTERFACE
// ============================================

export interface TestSetCase {
  id: string;
  test_set_id: string;
  test_case_id: string;
  case_order?: number;
  created_at: string;
}

// ============================================
// TEST CYCLE INTERFACE
// ============================================

export interface TestCycle {
  id: string;
  name: string;
  description?: string;
  program_id?: string;
  sprint_id?: string;
  program_increment_id?: string;
  status: TestCycleStatus;
  start_date?: string;
  end_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// TEST EXECUTION INTERFACE
// ============================================

export interface TestExecution {
  id: string;
  test_case_id: string;
  test_cycle_id: string;
  program_id?: string;
  executed_by: string;
  execution_date: string;
  status: TestExecutionStatus;
  actual_result?: string;
  defect_id?: string;
  execution_time_seconds?: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// TEST EXECUTION STEP INTERFACE
// ============================================

export interface TestExecutionStep {
  id: string;
  test_execution_id: string;
  test_step_id: string;
  status: TestStepStatus;
  actual_result?: string;
  screenshot_url?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// EXTENDED INTERFACES WITH RELATIONSHIPS
// ============================================

export interface TestCaseWithSteps extends TestCase {
  steps?: TestStep[];
}

export interface TestSetWithCases extends TestSet {
  testCases?: TestCase[];
}

export interface TestExecutionWithSteps extends TestExecution {
  executionSteps?: TestExecutionStep[];
  testCase?: TestCase;
}

export interface TestCycleWithExecutions extends TestCycle {
  executions?: TestExecution[];
}

// ============================================
// STATISTICS INTERFACES
// ============================================

export interface TestCaseStatistics {
  total: number;
  draft: number;
  approved: number;
  deprecated: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: {
    manual: number;
    automated: number;
    bdd: number;
  };
}

export interface TestExecutionStatistics {
  total: number;
  notRun: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  passRate: number;
  averageExecutionTime: number;
}

export interface TestCycleStatistics {
  totalCycles: number;
  planned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}