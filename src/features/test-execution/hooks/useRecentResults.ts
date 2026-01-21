/**
 * Module 3B-3: Hook for recent test results stream
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RecentResult } from '../types/progress-dashboard';

export function useRecentResults(
  runId: string | null, 
  refreshInterval: number = 2000, 
  limit: number = 10
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['recent-results', runId, limit],
    queryFn: async () => {
      if (!runId) return [];
      const { data, error } = await supabase
        .rpc('get_recent_results', { p_run_id: runId, p_limit: limit });
      if (error) throw error;
      return (data || []) as unknown as RecentResult[];
    },
    enabled: !!runId,
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
  });

  // Real-time subscription
  useEffect(() => {
    if (!runId) return;

    const channel = supabase
      .channel(`results-stream-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'test_execution_results',
          filter: `run_id=eq.${runId}`,
        },
        (payload: any) => {
          if (payload.new?.result_status) {
            queryClient.invalidateQueries({ queryKey: ['recent-results', runId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, queryClient]);

  return {
    results: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
