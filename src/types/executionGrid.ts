/**
 * Execution Grid Types - Core QA UI
 */

export type ExecutionStatus = 'not_executed' | 'passed' | 'failed' | 'blocked' | 'skipped' | 'in_progress';

export interface ExecutionGridCell {
  executionId: string | null;
  caseId: string;
  testerId: string | null;
  runNumber: number;
  datasetId: string | null;
  status: ExecutionStatus;
  statusOverride: boolean;
  manualStatus: ExecutionStatus | null;
  evidenceCount: number;
  defectCount: number;
  inProgress: boolean;
  lockedBy: string | null;
  lockedAt: string | null;
  executedBy: string | null;
  executionDate: string | null;
  actualResult: string | null;
}

export interface ExecutionGridRow {
  caseId: string;
  caseKey: string;
  caseTitle: string;
  priority: string;
  caseStatus: string;
  cells: ExecutionGridCell[];
}

export interface ExecutionGridColumn {
  id: string;
  type: 'tester' | 'dataset';
  testerId?: string;
  testerName?: string;
  datasetId?: string;
  datasetName?: string;
  runNumber: number;
}

export interface ExecutionGridData {
  cycleId: string;
  cycleName: string;
  cycleStatus: string;
  rows: ExecutionGridRow[];
  columns: ExecutionGridColumn[];
  runs: ExecutionRun[];
  datasets: ExecutionDataset[];
  testers: ExecutionTester[];
  totalCases: number;
  executedCases: number;
  passedCases: number;
  failedCases: number;
  blockedCases: number;
  skippedCases: number;
  progressPercentage: number;
  passRate: number;
}

export interface ExecutionRun {
  id: string;
  cycleId: string;
  runNumber: number;
  runName: string;
  createdAt: string;
  createdBy: string | null;
  copiedFromRunId: string | null;
}

export interface ExecutionDataset {
  id: string;
  cycleId: string;
  name: string;
  parameters: Record<string, any>;
  createdAt: string;
  createdBy: string | null;
}

export interface ExecutionTester {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  assignedCases: number;
  executedCases: number;
  passRate: number;
}

export interface BulkExecuteRequest {
  cycleId: string;
  cells: Array<{
    caseId: string;
    testerId: string | null;
    runNumber: number;
    datasetId: string | null;
  }>;
  status: ExecutionStatus;
  comment?: string;
}

export interface AssignCasesRequest {
  cycleId: string;
  assignments: Array<{
    caseId: string;
    testerId: string;
    runNumber: number;
  }>;
}

export interface AddRunRequest {
  cycleId: string;
  runName?: string;
  copyFromRunId?: string;
  copyAssignments?: boolean;
  copyResults?: boolean;
}

export interface AddDatasetRequest {
  cycleId: string;
  name: string;
  parameters: Record<string, any>;
}

export interface CloseCycleRequest {
  cycleId: string;
  reason: 'completed' | 'cancelled';
  comments?: string;
  sendNotifications?: boolean;
  archiveCycle?: boolean;
}

export interface ExecutionFilter {
  status?: ExecutionStatus[];
  assigneeId?: string;
  priority?: string[];
  dateFrom?: string;
  dateTo?: string;
  hasDefects?: boolean;
  hasEvidence?: boolean;
}

export const EXECUTION_STATUS_COLORS: Record<ExecutionStatus, string> = {
  not_executed: '#6b7280', // gray
  passed: '#10b981', // green
  failed: '#ef4444', // red
  blocked: '#f59e0b', // orange
  skipped: '#3b82f6', // blue
  in_progress: '#eab308', // yellow
};

export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  not_executed: 'Not Executed',
  passed: 'Passed',
  failed: 'Failed',
  blocked: 'Blocked',
  skipped: 'Skipped',
  in_progress: 'In Progress',
};

export const EXECUTION_STATUS_ICONS: Record<ExecutionStatus, string> = {
  not_executed: '-',
  passed: '✓',
  failed: '✗',
  blocked: '⊘',
  skipped: '⊖',
  in_progress: '⊙',
};

/**
 * Status percolation: calculates case status from step statuses
 */
export function calculateCaseStatus(stepStatuses: ExecutionStatus[]): ExecutionStatus {
  if (stepStatuses.length === 0) return 'not_executed';
  
  const hasNotExecuted = stepStatuses.includes('not_executed');
  const hasFailed = stepStatuses.includes('failed');
  const hasBlocked = stepStatuses.includes('blocked');
  const hasInProgress = stepStatuses.includes('in_progress');
  const allPassed = stepStatuses.every(s => s === 'passed');
  const allSkipped = stepStatuses.every(s => s === 'skipped');
  const allPassedOrSkipped = stepStatuses.every(s => s === 'passed' || s === 'skipped');
  
  if (hasFailed) return 'failed';
  if (hasBlocked) return 'blocked';
  if (hasInProgress) return 'in_progress';
  if (hasNotExecuted) return 'not_executed';
  if (allPassed) return 'passed';
  if (allSkipped) return 'skipped';
  if (allPassedOrSkipped) return 'passed';
  
  return 'not_executed';
}

/**
 * Calculate cycle status from case statuses
 */
export function calculateCycleStatus(caseStatuses: ExecutionStatus[]): string {
  if (caseStatuses.length === 0) return 'not_started';
  
  const allNotExecuted = caseStatuses.every(s => s === 'not_executed');
  const allPassed = caseStatuses.every(s => s === 'passed');
  const hasFailed = caseStatuses.includes('failed');
  const hasBlocked = caseStatuses.includes('blocked');
  
  if (allNotExecuted) return 'not_started';
  if (allPassed) return 'passed';
  if (hasFailed) return 'failed';
  if (hasBlocked) return 'blocked';
  
  return 'in_progress';
}
