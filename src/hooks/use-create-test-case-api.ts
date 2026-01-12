/**
 * Hook for creating test cases via the API
 * Used by AI generation and import features
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { casesApi } from '@/modules/test-management/api/cases';
import type { CreateTestCaseInput } from '@/modules/test-management/api/types';
import { toast } from 'sonner';

interface CreateTestCaseOptions {
  projectId: string;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export function useCreateTestCaseApi(options: CreateTestCaseOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTestCaseInput) => {
      return await casesApi.create(input);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', options.projectId] });
      options.onSuccess?.(data);
    },
    onError: (error: Error) => {
      console.error('Failed to create test case:', error);
      toast.error('Failed to create test case');
      options.onError?.(error);
    },
  });
}

export function useBulkCreateTestCasesApi(options: CreateTestCaseOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: CreateTestCaseInput[]) => {
      // Create test cases sequentially to avoid overwhelming the API
      const results = [];
      for (const input of inputs) {
        try {
          const result = await casesApi.create(input);
          results.push(result);
        } catch (error) {
          console.error('Failed to create test case:', input.title, error);
        }
      }
      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', options.projectId] });
      options.onSuccess?.(data);
    },
    onError: (error: Error) => {
      console.error('Failed to bulk create test cases:', error);
      toast.error('Failed to create test cases');
      options.onError?.(error);
    },
  });
}
