// ============================================================================
// INDEX FILE
// File: /hooks/test-management/index.ts
// ============================================================================

// Projects
export { useProjects, useProject, useCreateProject } from './useProjects';

// Folders
export { 
  useFolders, 
  useFolderTree, 
  useFoldersWithCounts,
  useCreateFolder, 
  useUpdateFolder, 
  useDeleteFolder 
} from './useFolders';

// Test Cases
export {
  useTestCases,
  useTestCase,
  useTestCaseSteps,
  useCreateTestCase,
  useUpdateTestCase,
  useDeleteTestCase,
  useCloneTestCase,
  useMoveTestCase,
  useBulkDeleteTestCases,
} from './useTestCases';

// Test Cycles
export {
  useTestCycles,
  useTestCycle,
  useCreateCycle,
  useUpdateCycle,
  useDeleteCycle,
  useCloneCycle,
  useCycleScope,
  useAddCasesToScope,
  useRemoveFromScope,
  useAssignTester,
  useBulkAssignTesters,
  useCompleteCycle,
  useStartCycle,
} from './useTestCycles';

// Test Runs & Execution
export {
  useTestRuns,
  useTestRun,
  useCreateRun,
  useUpdateStepResult,
  useBulkUpdateSteps,
  useCompleteRun,
  useAbortRun,
  useLinkDefectToStep,
  useRerunFailed,
  useMyWork,
} from './useTestRuns';

// Defects
export {
  useDefects,
  useDefectStats,
  useDefect,
  useCreateDefect,
  useUpdateDefect,
  useUpdateDefectStatus,
  useDeleteDefect,
  useDefectComments,
  useAddDefectComment,
  useDeleteDefectComment,
  useDefectAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  useDefectsByCycle,
} from './useDefects';

// Admin Config
export {
  useCasePriorities,
  useCreatePriority,
  useUpdatePriority,
  useDeletePriority,
  useCaseTypes,
  useCreateType,
  useUpdateType,
  useDeleteType,
  useLabels,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
  useTeamMembers,
  useEnvironments,
  useSeedProjectConfig,
} from './useAdminConfig';

// Reports
export {
  useReportSummary,
  useExecutionTrend,
  useExecutionReport,
  useTraceabilityMatrix,
  useBurndownData,
  useTeamPerformance,
  useRecentActivity,
  useCycleProgress,
} from './useReports';

// Types
export * from '@/types/test-management';
