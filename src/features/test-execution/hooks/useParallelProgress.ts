/**
 * Module 3B-1: Hook for real-time parallel run progress
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ParallelRunProgress } from '../types/parallel-runner';

export function useParallelProgress(runId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['parallel-run-progress', runId],
    queryFn: async (): Promise<ParallelRunProgress | null> => {
      if (!runId) return null;

      const { data, error } = await (supabase.rpc as any)('get_parallel_run_progress', { p_run_id: runId });

      if (error) throw error;
      return data as ParallelRunProgress;
    },
    enabled: !!runId,
    refetchInterval: 2000, // Poll every 2 seconds
    staleTime: 1000,
  });

  // Real-time updates
  useEffect(() => {
    if (!runId) return;

    const channel = supabase
      .channel(`progress-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'execution_queue',
          filter: `run_id=eq.${runId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['parallel-run-progress', runId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, queryClient]);

  // Calculate derived metrics
  const getMetrics = () => {
    const progress = query.data;
    if (!progress) return null;

    const passRate = progress.completed > 0 
      ? ((progress.completed - progress.failed) / progress.completed) * 100 
      : 0;

    const velocity = progress.max_workers > 0 && progress.completed > 0
      ? progress.completed / progress.max_workers
      : 0;

    return {
      ...progress,
      passRate: Math.round(passRate * 10) / 10,
      velocity: Math.round(velocity * 10) / 10,
      isComplete: progress.queued === 0 && progress.running === 0,
      hasFailures: progress.failed > 0,
    };
  };

  return {
    progress: query.data,
    metrics: getMetrics(),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
