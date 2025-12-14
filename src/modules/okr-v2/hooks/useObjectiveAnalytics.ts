// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Objective Analytics Hook
// Provides computed analytics for a single objective
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { useOKRStrategicData } from './useOKRStrategicData';
import { computeObjectiveAnalytics, ObjectiveAnalyticsData } from '../lib/objectiveAnalytics';

interface UseObjectiveAnalyticsResult {
  analytics: ObjectiveAnalyticsData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to compute analytics for a single objective
 * @param objectiveId - The objective ID to compute analytics for
 * @param snapshotId - Optional strategy snapshot ID
 */
export function useObjectiveAnalytics(
  objectiveId: string | null,
  snapshotId?: string
): UseObjectiveAnalyticsResult {
  const { data: strategicData, isLoading, error } = useOKRStrategicData(snapshotId);

  const analytics = useMemo(() => {
    if (!objectiveId || !strategicData?.themes) {
      return null;
    }

    return computeObjectiveAnalytics(objectiveId, strategicData.themes);
  }, [objectiveId, strategicData?.themes]);

  return {
    analytics,
    isLoading,
    error: error as Error | null,
  };
}
