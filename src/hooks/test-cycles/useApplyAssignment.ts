/**
 * Mutation hook to apply smart assignments
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Assignment } from '@/types/smart-assignment.types';

interface ApplyAssignmentParams {
  cycleId: string;
  assignments: Assignment[];
}

export function useApplyAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cycleId, assignments }: ApplyAssignmentParams) => {
      // Group assignments by tester for efficient updates
      const updatePromises = assignments.map(async (assignment) => {
        // Find the cycle_scope record for this test case
        const { data: scopeRecord, error: findError } = await supabase
          .from('tm_cycle_scope')
          .select('id')
          .eq('cycle_id', cycleId)
          .eq('test_case_id', assignment.testCaseId)
          .maybeSingle();

        if (findError) {
          console.error('Error finding cycle scope:', findError);
          throw findError;
        }

        if (!scopeRecord) {
          console.warn(`Test case ${assignment.testCaseId} not found in cycle ${cycleId}`);
          return null;
        }

        // Update the assignment using assigneeId from the Assignment type
        const { error: updateError } = await supabase
          .from('tm_cycle_scope')
          .update({ assigned_to: assignment.assigneeId })
          .eq('id', scopeRecord.id);

        if (updateError) {
          console.error('Error updating assignment:', updateError);
          throw updateError;
        }

        return scopeRecord.id;
      });

      const results = await Promise.all(updatePromises);
      const successfulUpdates = results.filter(Boolean);

      return {
        applied: successfulUpdates.length,
        cycleId,
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cycle', variables.cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases', variables.cycleId] });
      queryClient.invalidateQueries({ queryKey: ['tm_cycle_scope'] });
      toast.success(`Successfully assigned ${data.applied} tests`);
    },
    onError: (error: Error) => {
      toast.error('Failed to apply assignments: ' + error.message);
    },
  });
}
