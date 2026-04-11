import { useMutation } from '@tanstack/react-query';

export function useApplyTemplate() { return useMutation({ mutationFn: async (_: any) => {} }); }
export function useCreateTemplate() { return useMutation({ mutationFn: async (_: any) => ({} as any) }); }
export function useTemplatePreview(..._: any[]) { return { data: null, isLoading: false }; }
export function useFilterOptions(..._: any[]) { return { data: { folders: [], tags: [], modules: [] } as any, isLoading: false }; }
