/**
 * Hook for CRUD operations on execution runs
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CreateRunInput, UpdateRunInput } from '../types/test-execution';

export function useRunMutations() {
  const queryClient = useQueryClient();

  const createRun = useMutation({
    mutationFn: async (input: CreateRunInput) => {
      const { data, error } = await (supabase.rpc as any)('create_execution_run', {
        p_project_id: input.project_id,
        p_name: input.name,
        p_description: input.description || null,
        p_environment: input.environment || 'staging',
        p_configuration: input.configuration || {},
        p_scheduled_start: input.scheduled_start || null,
        p_assigned_testers: input.assigned_testers || [],
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['execution-runs'] });
      toast.success(`Execution run #${data.run_number} created`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create run: ${error.message}`);
    },
  });

  const updateRun = useMutation({
    mutationFn: async ({ runId, updates }: { runId: string; updates: UpdateRunInput }) => {
      const { data, error } = await (supabase.rpc as any)('update_execution_run', {
        p_run_id: runId,
        p_name: updates.name || null,
        p_description: updates.description,
        p_environment: updates.environment || null,
        p_configuration: updates.configuration || null,
        p_status: updates.status || null,
        p_assigned_testers: updates.assigned_testers || null,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['execution-run', variables.runId] });
      queryClient.invalidateQueries({ queryKey: ['execution-runs'] });
      toast.success('Run updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update run: ${error.message}`);
    },
  });

  const deleteRun = useMutation({
    mutationFn: async (runId: string) => {
      const { data, error } = await (supabase.rpc as any)('delete_execution_run', { p_run_id: runId });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execution-runs'] });
      toast.success('Run deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete run: ${error.message}`);
    },
  });

  const addCasesToRun = useMutation({
    mutationFn: async ({ runId, caseIds }: { runId: string; caseIds: string[] }) => {
      const { data, error } = await (supabase.rpc as any)('add_test_cases_to_run', {
        p_run_id: runId,
        p_test_case_ids: caseIds,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['execution-run', variables.runId] });
      toast.success(`${data.added_count} test case(s) added`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add test cases: ${error.message}`);
    },
  });

  // Convenience methods for status changes
  const startRun = useCallback((runId: string) => {
    return updateRun.mutateAsync({ runId, updates: { status: 'in_progress' } });
  }, [updateRun]);

  const pauseRun = useCallback((runId: string) => {
    return updateRun.mutateAsync({ runId, updates: { status: 'paused' } });
  }, [updateRun]);

  const completeRun = useCallback((runId: string) => {
    return updateRun.mutateAsync({ runId, updates: { status: 'completed' } });
  }, [updateRun]);

  const abortRun = useCallback((runId: string) => {
    return updateRun.mutateAsync({ runId, updates: { status: 'aborted' } });
  }, [updateRun]);

  return {
    createRun,
    updateRun,
    deleteRun,
    addCasesToRun,
    startRun,
    pauseRun,
    completeRun,
    abortRun,
    isCreating: createRun.isPending,
    isUpdating: updateRun.isPending,
    isDeleting: deleteRun.isPending,
  };
}
