export function useApplyTemplate() { return { mutateAsync: async (_: any) => {} }; }
export function useCreateTemplate() { return { mutateAsync: async (_: any) => ({}) }; }
export function useTemplatePreview(_id: string) { return { data: null, isLoading: false }; }
export function useFilterOptions() { return { data: { folders: [], tags: [] }, isLoading: false }; }
