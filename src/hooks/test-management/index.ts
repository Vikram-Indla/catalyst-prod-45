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

// ── Real hooks from sibling files (with adapter wrappers for API compat) ──
export { useTestPlan, useCreateTestPlan, useUpdateTestPlan, useDeleteTestPlan } from '../useTestPlansG26';
export { cycleListKeys } from '../test-cycles/useTestCycleList';

// useTestPlans wrapper: consumers expect { plans: [] } shape and string projectId arg
import { useTestPlans as _useTestPlans } from '../useTestPlansG26';
export function useTestPlans(..._args: any[]) {
  const result = _useTestPlans();
  return { ...result, data: { plans: result.data ?? [] } as any };
}

// ── Stubs for exports that have no real implementation yet ──
export type CycleListRow = any;

export function useDeleteTestCase() {
  return useMutation({ mutationFn: async (_: any) => {} });
}

export function useCreateTestCase(..._: any[]) {
  return useMutation({ mutationFn: async (...args: any[]) => ({} as any) });
}

export function useCloneTestPlan(..._: any[]) {
  return useMutation({ mutationFn: async (_: any) => ({} as any) });
}

export function useTestCycleList(..._: any[]) {
  return { data: [] as any[], isLoading: false };
}

export function useTestCycleListSummary(..._: any[]) {
  return { data: null, isLoading: false };
}
