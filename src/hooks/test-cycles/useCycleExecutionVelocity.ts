/**
 * Hook for execution velocity and trend data for a test cycle
 * Module 4A-3: Cycle Execution Tracker
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VelocityDataPoint {
  dateKey: string;
  dateLabel: string;
  executedCount: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  cumulativeExecuted: number;
  velocityPerDay: number;
}

export function useCycleExecutionVelocity(cycleId: string | null, days: number = 14) {
  return useQuery({
    queryKey: ['cycle-execution-velocity', cycleId, days],
    queryFn: async (): Promise<VelocityDataPoint[]> => {
      if (!cycleId) return [];

      const { data, error } = await supabase
        .rpc('tm_get_cycle_execution_velocity', { p_cycle_id: cycleId, p_days: days });

      if (error) throw error;

      return ((data as unknown as any[]) || []).map(row => ({
        dateKey: row.date_key,
        dateLabel: row.date_label,
        executedCount: Number(row.executed_count) || 0,
        passedCount: Number(row.passed_count) || 0,
        failedCount: Number(row.failed_count) || 0,
        blockedCount: Number(row.blocked_count) || 0,
        cumulativeExecuted: Number(row.cumulative_executed) || 0,
        velocityPerDay: Number(row.velocity_per_day) || 0,
      }));
    },
    enabled: !!cycleId,
    staleTime: 60000,
  });
}
