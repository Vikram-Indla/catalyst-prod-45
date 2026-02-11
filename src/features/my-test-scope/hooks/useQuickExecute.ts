/**
 * useQuickExecute Hook
 * Mutations for quick pass/fail/block actions on My Scope tests
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { myTestScopeKeys } from './useMyTestScope';

type QuickAction = 'passed' | 'failed' | 'blocked' | 'not_run';

interface QuickExecuteParams {
  cycleTestCaseId: string;
  action: QuickAction;
  reason?: string;
}

async function executeQuickAction({ cycleTestCaseId, action, reason }: QuickExecuteParams) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const updateData: Record<string, unknown> = {
    execution_status: action,
    executed_by: user.id,
    executed_at: new Date().toISOString(),
  };

  if (action === 'failed' || action === 'blocked') {
    updateData.failure_reason = reason || null;
  }

  if (action === 'not_run') {
    // Unblock: reset execution fields
    updateData.executed_by = null;
    updateData.executed_at = null;
    updateData.failure_reason = null;
  }

  const { error } = await supabase
    .from('th_cycle_test_cases')
    .update(updateData)
    .eq('id', cycleTestCaseId);

  if (error) throw new Error(error.message);
  return { cycleTestCaseId, action };
}

export function useQuickExecute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: executeQuickAction,
    onSuccess: ({ action }) => {
      queryClient.invalidateQueries({ queryKey: myTestScopeKeys.all });

      const messages: Record<QuickAction, string> = {
        passed: '✅ Test marked as passed',
        failed: '❌ Test marked as failed',
        blocked: '⚠️ Test marked as blocked',
        not_run: '↩️ Test unblocked',
      };
      toast.success(messages[action]);
    },
    onError: (error) => {
      toast.error(`Failed to update test: ${error.message}`);
    },
  });
}
