import { useMutation } from '@tanstack/react-query';

// Barrel re-export stubs for legacy imports
export function useCloneTestCase() { return useMutation({ mutationFn: async (_: any) => {} }); }
export function useDeleteTestCase() { return useMutation({ mutationFn: async (_: any) => {} }); }
export function useUpsertTestCaseDraft() { return useMutation({ mutationFn: async (..._: any[]) => ({} as any) }); }
export function useCreateTestCase() { return useMutation({ mutationFn: async (..._: any[]) => ({} as any) }); }
export function useSaveTestData() { return useMutation({ mutationFn: async (_: any) => {} }); }
export function hasTestDataToSave(_: any) { return false; }
export function useTeamMembers(..._: any[]) { return { data: [], isLoading: false }; }
export function useCreateTestPlan() { return useMutation({ mutationFn: async (_: any) => ({} as any) }); }
export function useUpdateTestPlan() { return useMutation({ mutationFn: async (_: any) => ({} as any) }); }
export function useTestPlan(..._: any[]) { return { data: null, isLoading: false }; }
export function useDeleteFolder() { return useMutation({ mutationFn: async (_: any) => {} }); }
export function useCreateFolder() { return useMutation({ mutationFn: async (_: any) => ({} as any) }); }
export function useProjects() { return { data: [], isLoading: false }; }
export function useTestCases(..._: any[]) { return { data: [], isLoading: false }; }
