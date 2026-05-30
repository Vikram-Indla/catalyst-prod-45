/**
 * useQuickExecute Hook
 * Mutations for quick pass/fail/block actions on My Scope tests
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
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
    current_status: action,
    updated_at: new Date().toISOString(),
  };

  const { error } = await typedQuery('tm_cycle_scope')
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
      catalystToast.success(messages[action]);
    },
    onError: (error) => {
      catalystToast.error(`Failed to update test: ${error.message}`);
    },
  });
}
