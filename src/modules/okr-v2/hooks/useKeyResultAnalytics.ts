// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Key Result Analytics Hook
// Provides computed analytics for a single Key Result
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { useOKRStrategicData } from './useOKRStrategicData';
import { computeKeyResultAnalytics, KeyResultAnalyticsData } from '../lib/keyResultAnalytics';

interface UseKeyResultAnalyticsResult {
  analytics: KeyResultAnalyticsData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to compute analytics for a single Key Result
 * @param keyResultId - The Key Result ID to compute analytics for
 * @param snapshotId - Optional strategy snapshot ID
 */
export function useKeyResultAnalytics(
  keyResultId: string | null,
  snapshotId?: string
): UseKeyResultAnalyticsResult {
  const { data: strategicData, isLoading, error } = useOKRStrategicData(snapshotId);

  const analytics = useMemo(() => {
    if (!keyResultId || !strategicData?.themes) {
      return null;
    }

    return computeKeyResultAnalytics(keyResultId, strategicData.themes);
  }, [keyResultId, strategicData?.themes]);

  return {
    analytics,
    isLoading,
    error: error as Error | null,
  };
}
