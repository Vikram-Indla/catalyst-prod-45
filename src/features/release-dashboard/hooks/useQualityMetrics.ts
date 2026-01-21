/**
 * Module 5B-1: Release Quality Metrics - Hooks
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  ReleaseQualityMetrics, 
  ReleaseHealthData, 
  ExecutionTrendPoint 
} from '../types/quality-metrics';

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useReleaseQualityMetrics - Get comprehensive quality metrics
// ─────────────────────────────────────────────────────────────────────────────

export function useReleaseQualityMetrics(releaseId: string | null) {
  const [metrics, setMetrics] = useState<ReleaseQualityMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!releaseId) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_release_quality_metrics', {
        p_release_id: releaseId
      });

      if (rpcError) throw rpcError;
      
      const result = data as unknown as { success: boolean } & ReleaseQualityMetrics | null;
      if (result?.success) {
        setMetrics({
          release_id: result.release_id,
          test_execution: result.test_execution,
          defects: result.defects,
          automation: result.automation,
          calculated_at: result.calculated_at
        });
      }
    } catch (err) {
      console.error('Failed to fetch quality metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setIsLoading(false);
    }
  }, [releaseId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, isLoading, error, refetch: fetchMetrics };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useReleaseHealth - Get health score with breakdown
// ─────────────────────────────────────────────────────────────────────────────

export function useReleaseHealth(releaseId: string | null) {
  const [health, setHealth] = useState<ReleaseHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHealth = useCallback(async () => {
    if (!releaseId) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('calculate_release_health', {
        p_release_id: releaseId
      });

      if (error) throw error;
      
      const result = data as unknown as { success: boolean } & ReleaseHealthData | null;
      if (result?.success) {
        setHealth({
          release_id: result.release_id,
          score: result.score,
          level: result.level,
          breakdown: result.breakdown,
          metrics: result.metrics,
          calculated_at: result.calculated_at
        });
      }
    } catch (err) {
      console.error('Failed to calculate release health:', err);
    } finally {
      setIsLoading(false);
    }
  }, [releaseId]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return { health, isLoading, refetch: fetchHealth };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useExecutionTrend - Get execution trend over time
// ─────────────────────────────────────────────────────────────────────────────

export function useExecutionTrend(releaseId: string | null, days: number = 14) {
  const [trend, setTrend] = useState<ExecutionTrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTrend = useCallback(async () => {
    if (!releaseId) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('get_release_execution_trend', {
        p_release_id: releaseId,
        p_days: days
      });

      if (error) throw error;
      
      const result = data as unknown as { success: boolean; trend: ExecutionTrendPoint[] } | null;
      if (result?.success) {
        setTrend(result.trend || []);
      }
    } catch (err) {
      console.error('Failed to fetch execution trend:', err);
    } finally {
      setIsLoading(false);
    }
  }, [releaseId, days]);

  useEffect(() => {
    fetchTrend();
  }, [fetchTrend]);

  return { trend, isLoading, refetch: fetchTrend };
}