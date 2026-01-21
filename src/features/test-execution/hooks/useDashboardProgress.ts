/**
 * Module 3B-3: Hook for progress summary and status breakdown
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ProgressSummary, StatusBreakdown } from '../types/progress-dashboard';

export function useDashboardProgress(runId: string | null, refreshInterval: number = 2000) {
  const queryClient = useQueryClient();

  const summaryQuery = useQuery({
    queryKey: ['run-progress-summary', runId],
    queryFn: async () => {
      if (!runId) return null;
      const { data, error } = await supabase
        .rpc('get_run_progress_summary', { p_run_id: runId });
      if (error) throw error;
      return data as unknown as ProgressSummary;
    },
    enabled: !!runId,
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
  });

  const breakdownQuery = useQuery({
    queryKey: ['status-breakdown', runId],
    queryFn: async () => {
      if (!runId) return null;
      const { data, error } = await supabase
        .rpc('get_status_breakdown', { p_run_id: runId });
      if (error) throw error;
      return data as unknown as StatusBreakdown;
    },
    enabled: !!runId,
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
  });

  // Real-time subscription for immediate updates
  useEffect(() => {
    if (!runId) return;

    const channel = supabase
      .channel(`progress-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'test_execution_results',
          filter: `run_id=eq.${runId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['run-progress-summary', runId] });
          queryClient.invalidateQueries({ queryKey: ['status-breakdown', runId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, queryClient]);

  return {
    summary: summaryQuery.data ?? null,
    statusBreakdown: breakdownQuery.data ?? null,
    isLoading: summaryQuery.isLoading || breakdownQuery.isLoading,
    error: summaryQuery.error || breakdownQuery.error,
  };
}
