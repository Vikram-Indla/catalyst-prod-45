// src/hooks/home/useMigrationMetrics.ts
// Metrics collection for Home V1 → V2 migration

import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MigrationMetrics {
  version: 'v1' | 'v2';
  pageLoadMs: number;
  queryCount: number;
  errorCount: number;
  dataMismatches: Array<{
    field: string;
    v1Value: unknown;
    v2Value: unknown;
  }>;
}

/**
 * Hook for tracking migration metrics during phased rollout
 */
export function useMigrationMetrics() {
  const startTimeRef = useRef<number>(0);
  const queryCountRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);

  const startTracking = useCallback(() => {
    startTimeRef.current = performance.now();
    queryCountRef.current = 0;
    errorCountRef.current = 0;
  }, []);

  const incrementQueryCount = useCallback(() => {
    queryCountRef.current += 1;
  }, []);

  const incrementErrorCount = useCallback(() => {
    errorCountRef.current += 1;
  }, []);

  const recordMetrics = useCallback(async (
    version: 'v1' | 'v2',
    dataMismatches: MigrationMetrics['dataMismatches'] = []
  ) => {
    const pageLoadMs = Math.round(performance.now() - startTimeRef.current);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('home_migration_metrics')
        .insert([{
          user_id: user.id,
          version,
          page_load_ms: pageLoadMs,
          query_count: queryCountRef.current,
          error_count: errorCountRef.current,
          data_mismatches: JSON.parse(JSON.stringify(dataMismatches)),
        }]);
    } catch (error) {
      // Silently fail - metrics shouldn't break the app
      console.warn('Failed to record migration metrics:', error);
    }
  }, []);

  return {
    startTracking,
    incrementQueryCount,
    incrementErrorCount,
    recordMetrics,
  };
}

/**
 * Compare V1 and V2 data for shadow mode validation
 */
export function compareHomeData(
  v1Data: Record<string, unknown>,
  v2Data: Record<string, unknown>
): Array<{ field: string; v1Value: unknown; v2Value: unknown }> {
  const mismatches: Array<{ field: string; v1Value: unknown; v2Value: unknown }> = [];

  const keysToCompare = new Set([...Object.keys(v1Data), ...Object.keys(v2Data)]);

  keysToCompare.forEach(key => {
    const v1Value = v1Data[key];
    const v2Value = v2Data[key];

    // Deep comparison for objects/arrays
    if (JSON.stringify(v1Value) !== JSON.stringify(v2Value)) {
      mismatches.push({ field: key, v1Value, v2Value });
    }
  });

  return mismatches;
}
