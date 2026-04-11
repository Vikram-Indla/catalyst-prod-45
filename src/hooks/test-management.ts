import { useMutation, useQuery } from '@tanstack/react-query';

// Barrel re-export stubs for legacy imports
export function useCloneTestCase() { return useMutation({ mutationFn: async (_: any) => {} }); }
export function useDeleteTestCase() { return useMutation({ mutationFn: async (_: any) => {} }); }
export function useBulkDeleteTestCases() { return useMutation({ mutationFn: async (_: any) => {} }); }
export function useUpsertTestCaseDraft() { return useMutation({ mutationFn: async (...args: any[]) => ({} as any) }); }
export function useCreateTestCase(..._: any[]) { return useMutation({ mutationFn: async (...args: any[]) => ({} as any) }); }
export function useSaveTestData() { return useMutation({ mutationFn: async (_: any) => {} }); }
export function hasTestDataToSave(..._: any[]) { return false; }
export function useTeamMembers(..._: any[]) { return { data: [], isLoading: false }; }
export function useCreateTestPlan(..._: any[]) { return useMutation({ mutationFn: async (_: any) => ({} as any) }); }
export function useUpdateTestPlan() { return useMutation({ mutationFn: async (_: any) => ({} as any) }); }
export function useTestPlan(..._: any[]) { return { data: null, isLoading: false, refetch: async () => {} }; }
export function useTestPlans(..._: any[]) { return { data: { plans: [] } as any, isLoading: false, refetch: async () => {} }; }
export function useDeleteTestPlan() { return useMutation({ mutationFn: async (_: any) => {} }); }
export function useCloneTestPlan(..._: any[]) { return useMutation({ mutationFn: async (_: any) => ({} as any) }); }
export function useDeleteFolder() { return useMutation({ mutationFn: async (_: any) => {} }); }
export function useCreateFolder() { return useMutation({ mutationFn: async (_: any) => ({} as any) }); }
export function useProjects() { return { data: [], isLoading: false }; }
export function useTestCases(..._: any[]) { return { data: { cases: [], total: 0 } as any, isLoading: false, isError: false, error: null, refetch: async () => {} }; }
export function useTestCycles(..._: any[]) { return { data: [], isLoading: false }; }
export function useReleases(..._: any[]) { return { data: [], isLoading: false }; }

export const cycleListKeys = {
  all: ['test-cycle-list'] as const,
  list: (filters?: any) => [...cycleListKeys.all, filters] as const,
};
export type CycleListRow = any;
export function useTestCycleList(..._: any[]) { return { data: [], isLoading: false }; }
export function useTestCycleListSummary(..._: any[]) { return { data: null, isLoading: false }; }
export function useCreateCycleEnhanced() { return useMutation({ mutationFn: async (_: any) => ({} as any) }); }
export function useDeleteCycleEnhanced() { return useMutation({ mutationFn: async (_: any) => {} }); }
export function useCloneCycleEnhanced() { return useMutation({ mutationFn: async (_: any) => ({} as any) }); }
