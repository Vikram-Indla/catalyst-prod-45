/**
 * Hook for fetching a single execution run with real-time updates
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ExecutionRun } from '../types/test-execution';

export function useExecutionRun(runId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['execution-run', runId],
    queryFn: async (): Promise<ExecutionRun | null> => {
      if (!runId) return null;
      
      const { data, error } = await (supabase.rpc as any)('get_execution_run', { p_run_id: runId });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data as ExecutionRun;
    },
    enabled: !!runId,
    staleTime: 30000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!runId) return;

    const channel = supabase
      .channel(`execution-run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_execution_runs',
          filter: `id=eq.${runId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['execution-run', runId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_execution_results',
          filter: `run_id=eq.${runId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['execution-run', runId] });
          queryClient.invalidateQueries({ queryKey: ['run-progress', runId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, queryClient]);

  return {
    run: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
