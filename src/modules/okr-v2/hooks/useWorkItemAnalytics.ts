// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Work Item Analytics Hook
// Provides computed analytics for a single Work Item (Epic/Feature/Story)
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { useOKRStrategicData } from './useOKRStrategicData';
import { computeWorkItemAnalytics, WorkItemAnalyticsData } from '../lib/workItemAnalytics';

interface UseWorkItemAnalyticsResult {
  analytics: WorkItemAnalyticsData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to compute analytics for a single Work Item
 * @param workItemId - The Work Item ID to compute analytics for
 * @param snapshotId - Optional strategy snapshot ID
 */
export function useWorkItemAnalytics(
  workItemId: string | null,
  snapshotId?: string
): UseWorkItemAnalyticsResult {
  const { data: strategicData, isLoading, error } = useOKRStrategicData(snapshotId);

  const analytics = useMemo(() => {
    if (!workItemId || !strategicData?.themes) {
      return null;
    }

    return computeWorkItemAnalytics(workItemId, strategicData.themes);
  }, [workItemId, strategicData?.themes]);

  return {
    analytics,
    isLoading,
    error: error as Error | null,
  };
}
