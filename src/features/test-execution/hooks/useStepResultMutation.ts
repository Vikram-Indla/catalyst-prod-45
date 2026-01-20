/**
 * Hook for recording step results via database functions
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCatalystToast } from '@/hooks/useCatalystToast';
import type { StepResultInput, StepResult, CompleteExecutionInput } from '../types/step-execution';

interface RpcResponse {
  result?: string;
  error?: string;
  success?: boolean;
}

export function useStepResultMutation(runId: string, testCaseId: string) {
  const queryClient = useQueryClient();
  const toast = useCatalystToast();

  const recordResult = useMutation({
    mutationFn: async (input: StepResultInput) => {
      const { data, error } = await supabase
        .rpc('update_step_result_v2', {
          p_run_id: runId,
          p_step_id: input.step_id,
          p_result: input.result,
          p_notes: input.notes || null,
          p_actual_result: input.actual_result || null,
          p_duration_seconds: input.duration_seconds || null,
        });

      if (error) throw error;
      const response = data as unknown as RpcResponse;
      if (response?.error) throw new Error(response.error);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['execution-session', runId] });
      queryClient.invalidateQueries({ queryKey: ['test-execution-v2', runId, testCaseId] });
      
      const resultLabels: Record<StepResult, string> = {
        passed: 'Passed ✓',
        failed: 'Failed ✕',
        blocked: 'Blocked ⊘',
        skipped: 'Skipped →',
      };
      toast.success('Step Result', resultLabels[data?.result as StepResult] || 'Result recorded');
    },
    onError: (error: Error) => {
      toast.error('Failed to record result', error.message);
    },
  });

  const completeExecution = useMutation({
    mutationFn: async (input: CompleteExecutionInput) => {
      const { data, error } = await supabase
        .rpc('complete_test_run_v2', {
          p_run_id: runId,
          p_overall_result: input.overall_result,
          p_notes: input.notes || null,
        });

      if (error) throw error;
      const response = data as unknown as RpcResponse;
      if (response?.error) throw new Error(response.error);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-session', runId] });
      queryClient.invalidateQueries({ queryKey: ['tm-run', runId] });
      toast.success('Complete', 'Test execution completed');
    },
    onError: (error: Error) => {
      toast.error('Failed to complete execution', error.message);
    },
  });

  const saveNotes = useMutation({
    mutationFn: async ({ stepId, notes }: { stepId: string; notes: string }) => {
      const { data, error } = await supabase
        .rpc('save_step_notes_v2', {
          p_run_id: runId,
          p_step_id: stepId,
          p_actual_result: notes,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-execution-v2', runId, testCaseId] });
    },
  });

  return {
    recordResult,
    completeExecution,
    saveNotes,
    isRecording: recordResult.isPending,
    isCompleting: completeExecution.isPending,
  };
}
