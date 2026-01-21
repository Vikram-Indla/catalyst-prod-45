/**
 * Module 3B-3: Hook for historical trend data
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TrendData } from '../types/progress-dashboard';

export function useTrendData(
  runId: string | null, 
  refreshInterval: number = 30000,
  intervalMinutes: number = 5,
  points: number = 12
) {
  const query = useQuery({
    queryKey: ['trend-data', runId, intervalMinutes, points],
    queryFn: async () => {
      if (!runId) return null;
      const { data, error } = await supabase
        .rpc('get_trend_data', {
          p_run_id: runId,
          p_interval_minutes: intervalMinutes,
          p_points: points,
        });
      if (error) throw error;
      return data as unknown as TrendData;
    },
    enabled: !!runId,
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
  });

  return {
    trendData: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
