// ============================================================================
// HOOK: useCycleScopeMutations - Add/remove test cases from cycle scope
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RpcResponse {
  success: boolean;
  added?: number;
  error?: string;
}

export function useCycleScopeMutations(cycleId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (cycleId) {
      queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle-scope', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['tm-cycle', cycleId] });
    }
  };

  const addCases = useMutation({
    mutationFn: async ({
      testCaseIds,
      assignedTo,
    }: {
      testCaseIds: string[];
      assignedTo?: string;
    }) => {
      if (!cycleId) throw new Error('No cycle ID');
      if (testCaseIds.length === 0) throw new Error('No test cases selected');

      const { data, error } = await supabase.rpc('tm_bulk_add_cases_to_cycle', {
        p_cycle_id: cycleId,
        p_test_case_ids: testCaseIds,
        p_assigned_to: assignedTo || null,
      });

      if (error) throw error;

      const response = data as unknown as RpcResponse;
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to add test cases');
      }

      return response.added || 0;
    },
    onSuccess: (added) => {
      invalidate();
      toast.success(`Added ${added} test case(s) to cycle`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add test cases: ${error.message}`);
    },
  });

  const removeCase = useMutation({
    mutationFn: async (testCaseId: string) => {
      if (!cycleId) throw new Error('No cycle ID');

      const { data, error } = await supabase.rpc('tm_remove_case_from_cycle', {
        p_cycle_id: cycleId,
        p_test_case_id: testCaseId,
      });

      if (error) throw error;

      const response = data as unknown as RpcResponse;
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to remove test case');
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('Test case removed from cycle');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove test case: ${error.message}`);
    },
  });

  const assignScopeItem = useMutation({
    mutationFn: async ({
      scopeId,
      assignedTo,
    }: {
      scopeId: string;
      assignedTo: string | null;
    }) => {
      const { data, error } = await supabase.rpc('tm_assign_scope_item', {
        p_scope_id: scopeId,
        p_assigned_to: assignedTo,
      });

      if (error) throw error;

      const response = data as unknown as RpcResponse;
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to assign test case');
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('Assignment updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign test case: ${error.message}`);
    },
  });

  return {
    addCases,
    removeCase,
    assignScopeItem,
    isLoading: addCases.isPending || removeCase.isPending || assignScopeItem.isPending,
  };
}
