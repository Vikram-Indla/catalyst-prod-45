/**
 * Hook for fetching run progress with real-time updates
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RunProgress } from '../types/test-execution';

export function useRunProgress(runId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['run-progress', runId],
    queryFn: async (): Promise<RunProgress | null> => {
      if (!runId) return null;
      
      const { data, error } = await (supabase.rpc as any)('get_run_progress', { p_run_id: runId });
      
      if (error) throw error;
      
      return data as RunProgress;
    },
    enabled: !!runId,
    staleTime: 10000,
    refetchInterval: 30000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!runId) return;

    const channel = supabase
      .channel(`run-progress-${runId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_execution_results',
          filter: `run_id=eq.${runId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['run-progress', runId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, queryClient]);

  return {
    progress: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
