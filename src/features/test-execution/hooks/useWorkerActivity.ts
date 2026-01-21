/**
 * Module 3B-3: Hook for real-time worker status
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkerActivity } from '../types/progress-dashboard';

export function useWorkerActivity(runId: string | null, refreshInterval: number = 1000) {
  const query = useQuery({
    queryKey: ['worker-activity', runId],
    queryFn: async () => {
      if (!runId) return [];
      const { data, error } = await supabase
        .rpc('get_worker_activity', { p_run_id: runId });
      if (error) throw error;
      return (data || []) as unknown as WorkerActivity[];
    },
    enabled: !!runId,
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
  });

  return {
    workers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
