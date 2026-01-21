/**
 * Module 3A-5: Execution Metrics Hooks
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { StepMetrics, CaseMetrics, RunMetrics, SpeedLevel, SpeedIndicator } from '../types/timer-metrics';
import { SPEED_INDICATORS } from '../types/timer-metrics';

export function useStepMetrics(executionId: string | null) {
  return useQuery({
    queryKey: ['step-metrics', executionId],
    queryFn: async () => {
      if (!executionId) return [];
      const { data, error } = await (supabase.rpc as any)('get_step_metrics', { p_execution_id: executionId });
      if (error) throw error;
      return data as StepMetrics[];
    },
    enabled: !!executionId,
    refetchInterval: 5000,
  });
}

export function useCaseMetrics(executionId: string | null) {
  return useQuery({
    queryKey: ['case-metrics', executionId],
    queryFn: async () => {
      if (!executionId) return null;
      const { data, error } = await (supabase.rpc as any)('get_case_metrics', { p_execution_id: executionId });
      if (error) throw error;
      return data as CaseMetrics;
    },
    enabled: !!executionId,
    refetchInterval: 5000,
  });
}

export function useRunMetrics(runId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['run-metrics', runId],
    queryFn: async () => {
      if (!runId) return null;
      const { data, error } = await (supabase.rpc as any)('get_run_metrics', { p_run_id: runId });
      if (error) throw error;
      return data as RunMetrics;
    },
    enabled: !!runId,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!runId) return;

    const channel = supabase
      .channel(`run-metrics-${runId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'test_execution_results',
        filter: `run_id=eq.${runId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['run-metrics', runId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [runId, queryClient]);

  return query;
}

export function useSpeedIndicator(
  actual: number | null,
  estimated: number | null
): SpeedIndicator | null {
  return useMemo(() => {
    if (actual === null || estimated === null || estimated === 0) return null;
    const ratio = actual / estimated;
    if (ratio <= 0.7) return SPEED_INDICATORS.fast;
    if (ratio <= 1.1) return SPEED_INDICATORS.on_track;
    if (ratio <= 1.5) return SPEED_INDICATORS.slow;
    return SPEED_INDICATORS.behind;
  }, [actual, estimated]);
}

export function useETACalculation(remainingItems: number, avgDurationPerItem: number) {
  return useMemo(() => {
    if (remainingItems <= 0 || avgDurationPerItem <= 0) return null;

    const remainingSeconds = remainingItems * avgDurationPerItem;
    const completionTime = new Date(Date.now() + remainingSeconds * 1000);

    const formatDuration = (secs: number): string => {
      if (secs < 60) return `${secs}s`;
      const mins = Math.floor(secs / 60);
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m`;
    };

    return {
      remainingSeconds,
      completionTime,
      formattedETA: formatDuration(remainingSeconds),
      formattedCompletion: completionTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }, [remainingItems, avgDurationPerItem]);
}
