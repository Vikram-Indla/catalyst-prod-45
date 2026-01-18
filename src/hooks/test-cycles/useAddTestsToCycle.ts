/**
 * Mutation hook to add tests to a cycle
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { AddTestsParams } from '@/types/add-tests.types';

export function useAddTestsToCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cycleId,
      testCaseIds,
      assigneeId,
    }: AddTestsParams) => {
      // Get the next sort order
      const { data: existingScope } = await supabase
        .from('tm_cycle_scope')
        .select('sort_order')
        .eq('cycle_id', cycleId)
        .order('sort_order', { ascending: false })
        .limit(1);

      let nextSortOrder = (existingScope?.[0]?.sort_order || 0) + 1;

      // Prepare rows to insert
      const rows = testCaseIds.map((testCaseId, index) => ({
        cycle_id: cycleId,
        test_case_id: testCaseId,
        assigned_to: assigneeId || null,
        current_status: 'not_run' as const,
        sort_order: nextSortOrder + index,
        added_at: new Date().toISOString(),
      }));

      // Insert all test cases into the cycle scope
      const { data, error } = await supabase
        .from('tm_cycle_scope')
        .insert(rows)
        .select();

      if (error) {
        console.error('Error adding tests to cycle:', error);
        throw error;
      }

      // Update the cycle's counts
      const { data: cycle } = await supabase
        .from('tm_test_cycles')
        .select('total_cases, not_run_count')
        .eq('id', cycleId)
        .single();
      
      if (cycle) {
        await supabase
          .from('tm_test_cycles')
          .update({
            total_cases: (cycle.total_cases || 0) + testCaseIds.length,
            not_run_count: (cycle.not_run_count || 0) + testCaseIds.length,
          })
          .eq('id', cycleId);
      }

      return {
        added: data?.length || testCaseIds.length,
        cycleId,
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cycle', variables.cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases', variables.cycleId] });
      queryClient.invalidateQueries({ queryKey: ['test-repository'] });
      queryClient.invalidateQueries({ queryKey: ['tm_test_cycles'] });
      toast.success(`Added ${data.added} tests to cycle`);
    },
    onError: (error: Error) => {
      toast.error('Failed to add tests: ' + error.message);
    },
  });
}
