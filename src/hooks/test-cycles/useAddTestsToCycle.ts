/**
 * Mutation hook to add tests to a cycle
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AddTestsParams } from '@/types/add-tests.types';

export function useAddTestsToCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cycleId,
      testCaseIds,
      assigneeId,
      priority,
      dueDate,
      useSmartAssignment,
    }: AddTestsParams) => {
      // TODO: Replace with actual Supabase mutation
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (useSmartAssignment) {
        console.log('Using smart assignment for', testCaseIds.length, 'tests');
        // In real implementation, call smart_assign_tests_to_cycle RPC
      }

      console.log('Adding tests to cycle:', {
        cycleId,
        testCaseIds,
        assigneeId,
        priority,
        dueDate,
        useSmartAssignment,
      });

      // Mock successful response
      return {
        added: testCaseIds.length,
        cycleId,
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cycle', variables.cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases', variables.cycleId] });
      toast.success(`Added ${data.added} tests to cycle`);
    },
    onError: (error: Error) => {
      toast.error('Failed to add tests: ' + error.message);
    },
  });
}
