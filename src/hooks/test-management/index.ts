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
  useDeleteTestCase,
  useCloneTestCase,
  useMoveTestCase,
  useBulkDeleteTestCases,
  useBulkCopyTestCases,
  useAddTestCasesToCycle,
  useBulkUpdateTestCases,
  type BulkCaseStatus,
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

// Types
export * from '@/types/test-management';
