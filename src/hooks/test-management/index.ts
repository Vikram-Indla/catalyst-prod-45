// ============================================================================
// Test Management Hooks - Barrel Export
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
  useDeleteFolder,
  useMoveFolder,
  useDuplicateFolder,
} from './useFolders';

// Repository Data (bridges Supabase folders to TreeNode UI structure)
export { useRepositoryData, useInvalidateRepositoryData } from './useRepositoryData';

// Test Cases
export {
  useTestCases,
  useTestCase,
  useTestCaseSteps,
  useCreateTestCase,
  useUpdateTestCase,
  useUpsertTestCaseDraft,
  useDeleteTestCase,
  useCloneTestCase,
  useMoveTestCase,
  useBulkDeleteTestCases,
  useBulkCopyTestCases,
  useAddTestCasesToCycle,
  useBulkUpdateTestCases,
  type BulkCaseStatus,
  type DraftCaseInput,
  type DraftStepInput,
} from './useTestCases';

// Test Steps
export {
  useAddTestStep,
  useUpdateTestStep,
  useDeleteTestStep,
  useReorderTestSteps,
  useDuplicateTestStep,
} from './useTestSteps';

// Test Case Comments
export {
  useTestCaseComments,
  useTestCaseCommentsCount,
  useAddTestCaseComment,
  useDeleteTestCaseComment,
} from './useTestCaseComments';

// Test Case Versions
export {
  useTestCaseVersions,
  useTestCaseVersionsCount,
  useCreateTestCaseVersion,
  useRestoreTestCaseVersion,
  type TestCaseVersion,
  type TestCaseVersionSnapshot,
} from './useTestCaseVersions';

// Auto-Versioning
export { useAutoVersioning, createVersionSnapshot } from './useAutoVersioning';

// Test Case Tags/Labels
export {
  useTestCaseLabels,
  useAvailableLabels,
  useAddTestCaseLabel,
  useRemoveTestCaseLabel,
  useCreateLabel as useCreateTestCaseLabel,
} from './useTestCaseTags';

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

// Test Cycles Enhanced (with joins)
export {
  useTestCyclesEnhanced,
  useCycleKPIs,
  useCreateCycleEnhanced,
  useDeleteCycleEnhanced,
  useCloneCycleEnhanced,
  type CycleWithDetails,
  type CycleKPIs,
  type CycleFilterParams,
  type CreateCycleInput,
} from './useTestCyclesEnhanced';

// Releases
export { useReleases, type ReleaseOption } from './useReleases';

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

// Data-Driven Test Execution (DDT)
export {
  useCreateRunWithDataRows,
  useTestDataRowsForExecution,
  type DataRowSelection,
  type CreateRunWithDataRowsInput,
  type CreateRunWithDataRowsResult,
} from './useCreateRunWithDataRows';

// Data Row Results Aggregation
export {
  useDataRowResults,
  type DataRowLatestResult,
  type DataRowResultsSummary,
  type RowResultStatus,
} from './useDataRowResults';

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

// QA Testers (users with qa_tester role)
export { useQATesters, type QATester } from './useQATesters';

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

// AI Generation
export { useAIGeneration, type GeneratedTestCase, type GenerationResult, type GenerationOptions } from './useAIGeneration';

// Test Plans
export {
  useTestPlans,
  useTestPlan,
  useTestPlanCases,
  useTestPlanHealth,
  useCreateTestPlan,
  useUpdateTestPlan,
  useDeleteTestPlan,
  useAddCasesToPlan,
  useRemoveCasesFromPlan,
  useCloneTestPlan,
} from './useTestPlans';

// Test Data (parameters/rows for data-driven testing)
export {
  useTestDataParameters,
  useTestDataRows,
  useSaveTestData,
  hasTestDataToSave,
  type TestDataParameter,
  type TestDataRow,
  type SaveTestDataInput,
} from './useTestData';

// Types
export * from '@/types/test-management';
