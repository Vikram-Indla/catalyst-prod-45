/**
 * Barrel re-export for test-management hooks
 * Aggregates real hooks from this directory + external hook files
 */

// ── Real hooks from this directory ──
export {
  useTestCases,
  useCreateTestCase,
  useDeleteTestCase,
  useCloneTestCase,
  useUpsertTestCaseDraft,
  useBulkDeleteTestCases,
} from './useTestCases';
export { useTestCycles } from './useTestCycles';
export { useProjects } from './useProjects';
export { useReleases } from './useReleases';
export { useSprintsByProject } from './useSprintsByProject';
export type { SprintOption } from './useSprintsByProject';
export { useTeamMembers } from './useAdminConfig';
export { useCreateFolder, useDeleteFolder } from './useFolders';
export { useDefects } from './useDefects';
export {
  useTestExecutions,
  useTestExecutionByKey,
  useCreateTestExecution,
  useUpdateTestExecution,
} from './useTestExecutions';
export type { TmTestExecution, ExecutionScopeType, ExecutionStatus } from './useTestExecutions';
export { useCycleVariance, usePullLatestIntoScope, useAcceptSnapshotVariance } from './useCaseVariance';
export type { ScopeVariance } from './useCaseVariance';
export { useSprintTestHealth, useComputeSprintTestHealth } from './useSprintTestHealth';
export type { SprintTestHealth, SprintGateState, SprintTestHealthTotals } from './useSprintTestHealth';
