/**
 * Mutation hook to apply smart assignments
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Assignment } from '@/types/smart-assignment.types';

interface ApplyAssignmentParams {
  cycleId: string;
  assignments: Assignment[];
}

export function useApplyAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cycleId, assignments }: ApplyAssignmentParams) => {
      // TODO: Replace with actual Supabase mutation
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Applying assignments:', {
        cycleId,
        totalAssignments: assignments.length,
        adjustedCount: assignments.filter(a => a.adjusted).length,
      });

      // Mock successful response
      return {
        applied: assignments.length,
        cycleId,
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cycle', variables.cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases', variables.cycleId] });
      toast.success(`Successfully assigned ${data.applied} tests`);
    },
    onError: (error: Error) => {
      toast.error('Failed to apply assignments: ' + error.message);
    },
  });
}
