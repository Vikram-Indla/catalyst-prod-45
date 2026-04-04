/**
 * Test Execution Utilities
 * Single source of truth for deriving overall test case status from step-level results.
 */

export type StepStatus = 'passed' | 'failed' | 'blocked' | 'skipped' | 'not_run';
export type OverallStatus = 'passed' | 'failed' | 'blocked' | 'skipped' | 'not_run';

const STATUS_PRIORITY: Record<StepStatus, number> = {
  failed:  5,  // worst — always wins
  blocked: 4,
  skipped: 3,
  not_run: 2,
  passed:  1,  // best
};

/**
 * Derives the overall test case status from individual step statuses.
 * Uses a priority ladder: failed > blocked > skipped > not_run > passed.
 * The worst status among all steps determines the overall result.
 */
export function deriveOverallStatus(stepStatuses: StepStatus[]): OverallStatus {
  if (!stepStatuses.length) return 'not_run';
  return stepStatuses.reduce<OverallStatus>((worst, current) =>
    STATUS_PRIORITY[current] > STATUS_PRIORITY[worst] ? current : worst
  , stepStatuses[0]);
}
