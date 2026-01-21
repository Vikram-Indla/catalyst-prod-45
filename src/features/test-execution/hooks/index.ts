/**
 * Test Execution Hooks - Modules 3A-1 through 4C-4
 */

// Module 3A-1: Session Manager
export { useExecutionRun } from './useExecutionRun';
export { useExecutionRuns } from './useExecutionRuns';
export { useRunMutations } from './useRunMutations';
export { useRunProgress } from './useRunProgress';

// Module 4C-1: Enhanced Session Manager
export { 
  useRunAssignments, 
  useAssignCasesToRun,
  useRemoveCasesFromRun,
  useUpdateAssignmentStatus,
  useBulkAssignTester
} from './useRunAssignments';

export { 
  useRunTemplates, 
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useCreateRunFromTemplate
} from './useRunTemplates';

// Module 4C-3: Defect Integration
export { useRunDefects, useInlineDefectCreate } from './useRunDefects';

// Module 4C-4: Analytics
export { 
  useRunSummaryAnalytics, 
  useRunExecutionTrend, 
  useRunTesterStats, 
  useRunStatusDistribution 
} from './useRunAnalytics';
