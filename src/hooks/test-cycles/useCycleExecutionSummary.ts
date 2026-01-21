/**
 * Hook for real-time execution summary metrics for a test cycle
 * Module 4A-3: Cycle Execution Tracker
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CycleExecutionSummary {
  totalCases: number;
  passed: number;
  failed: number;
  blocked: number;
  inProgress: number;
  notStarted: number;
  skipped: number;
  executionRate: number;
  passRate: number;
  avgDurationSeconds: number;
  totalDurationHours: number;
  activeTesters: number;
  defectsFound: number;
  testsWithEvidence: number;
  velocityToday: number;
  velocityAvg7d: number;
}

export function useCycleExecutionSummary(cycleId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['cycle-execution-summary', cycleId],
    queryFn: async (): Promise<CycleExecutionSummary | null> => {
      if (!cycleId) return null;

      const { data, error } = await supabase
        .rpc('tm_get_cycle_execution_summary', { p_cycle_id: cycleId });

      if (error) throw error;
      if (!data || (Array.isArray(data) && data.length === 0)) return null;

      const row = Array.isArray(data) ? data[0] : data;
      
      return {
        totalCases: Number(row.total_cases) || 0,
        passed: Number(row.passed) || 0,
        failed: Number(row.failed) || 0,
        blocked: Number(row.blocked) || 0,
        inProgress: Number(row.in_progress) || 0,
        notStarted: Number(row.not_started) || 0,
        skipped: Number(row.skipped) || 0,
        executionRate: Number(row.execution_rate) || 0,
        passRate: Number(row.pass_rate) || 0,
        avgDurationSeconds: Number(row.avg_duration_seconds) || 0,
        totalDurationHours: Number(row.total_duration_hours) || 0,
        activeTesters: Number(row.active_testers) || 0,
        defectsFound: Number(row.defects_found) || 0,
        testsWithEvidence: Number(row.tests_with_evidence) || 0,
        velocityToday: Number(row.velocity_today) || 0,
        velocityAvg7d: Number(row.velocity_avg_7d) || 0,
      };
    },
    enabled: !!cycleId,
    staleTime: 15000,
    refetchInterval: 30000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!cycleId) return;

    const channel = supabase
      .channel(`cycle-summary-${cycleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_cycle_scope',
          filter: `cycle_id=eq.${cycleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cycle-execution-summary', cycleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleId, queryClient]);

  return {
    summary: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
