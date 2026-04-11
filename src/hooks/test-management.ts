// Barrel re-export for legacy imports
// Actual implementations live in src/hooks/test-management/ folder
export function useCloneTestCase() { return { mutateAsync: async (_: any) => {} }; }
export function useDeleteTestCase() { return { mutateAsync: async (_: any) => {} }; }
export function useUpsertTestCaseDraft() { return { mutateAsync: async (_: any) => ({}) }; }
export function useCreateTestCase() { return { mutateAsync: async (_: any) => ({}) }; }
export function useSaveTestData() { return { mutateAsync: async (_: any) => {} }; }
export function hasTestDataToSave(_: any) { return false; }
export function useTeamMembers() { return { data: [], isLoading: false }; }
export function useCreateTestPlan() { return { mutateAsync: async (_: any) => ({}) }; }
export function useUpdateTestPlan() { return { mutateAsync: async (_: any) => ({}) }; }
export function useTestPlan(_id: string) { return { data: null, isLoading: false }; }
export function useDeleteFolder() { return { mutateAsync: async (_: any) => {} }; }
export function useCreateFolder() { return { mutateAsync: async (_: any) => ({}) }; }
export function useProjects() { return { data: [], isLoading: false }; }
export function useTestCases(_?: any) { return { data: [], isLoading: false }; }
