/**
 * useCreateWorkItem — Create work item mutation (F1.22)
 *
 * Mutation hook for creating new work items.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface CreateWorkItemInput {
  summary: string;
  issue_type: string;
  description: string;
}

export interface CreateWorkItemResult {
  mutate: (input: CreateWorkItemInput) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  data: any | null;
  reset: () => void;
}

export function useCreateWorkItem(): CreateWorkItemResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: CreateWorkItemInput) => {
      const { data, error } = await supabase
        .from('ph_issues')
        .insert([
          {
            summary: input.summary,
            issue_type: input.issue_type,
            description: input.description,
            status: 'To Do',
          },
        ])
        .select();

      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      // Invalidate work items cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['workItems'] });
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as Error | null,
    data: mutation.data,
    reset: mutation.reset,
  };
}
