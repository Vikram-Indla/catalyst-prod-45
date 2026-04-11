/**
 * Barrel re-export for test-management hooks
 * Aggregates real hooks from this directory + external hook files
 */
import { useMutation } from '@tanstack/react-query';

// ── Real hooks from this directory ──
export { useTestCases, useCloneTestCase, useUpsertTestCaseDraft, useBulkDeleteTestCases } from './useTestCases';
export { useTestCycles } from './useTestCycles';
export { useCreateCycleEnhanced, useDeleteCycleEnhanced, useCloneCycleEnhanced } from './useTestCyclesEnhanced';
export { useProjects } from './useProjects';
export { useReleases } from './useReleases';
export { useTeamMembers } from './useAdminConfig';
export { useCreateFolder, useDeleteFolder } from './useFolders';
export { useSaveTestData, hasTestDataToSave } from './useTestData';
export { useDefects } from './useDefects';

// ── Real hooks from sibling files ──
export { useTestPlans, useDeleteTestPlan } from '../useTestPlansG26';
export { cycleListKeys, useTestCycleList } from '../test-cycles/useTestCycleList';

// ── Re-exports that need stubs (not yet implemented as real hooks) ──
export { useDeleteTestCase } from './useTestCaseComments';
export { useCreateTestCase } from './useTestCaseVersions';

// ── Stubs for exports that have no real implementation yet ──
export type CycleListRow = any;

export function useCloneTestPlan(..._: any[]) {
  return useMutation({ mutationFn: async (_: any) => ({} as any) });
}

export function useTestCycleListSummary(..._: any[]) {
  return { data: null, isLoading: false };
}
