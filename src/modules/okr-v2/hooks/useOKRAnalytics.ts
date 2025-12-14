// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Analytics Hook
// Bridge between OKR domain data and analytics engine
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { useOKRStrategicData } from './useOKRStrategicData';
import { computeOkrAnalytics, OkrAnalyticsResult } from '../lib/okrAnalytics';

interface UseOKRAnalyticsResult {
  analytics: OkrAnalyticsResult | null;
  isLoading: boolean;
  error: Error | null;
  themeCount: number;
  totalThemeCount: number;
}

/**
 * Hook to compute OKR analytics from strategic data
 * @param snapshotId - Optional strategy snapshot ID to filter by
 * @param selectedThemeIds - Optional array of theme IDs to filter by
 */
export function useOKRAnalytics(
  snapshotId?: string,
  selectedThemeIds?: string[]
): UseOKRAnalyticsResult {
  const { data: strategicData, isLoading, error } = useOKRStrategicData(snapshotId);

  const analytics = useMemo(() => {
    if (!strategicData?.themes || strategicData.themes.length === 0) {
      return null;
    }

    return computeOkrAnalytics({
      themes: strategicData.themes,
      themeFilterIds: selectedThemeIds,
      now: new Date(),
    });
  }, [strategicData?.themes, selectedThemeIds]);

  // Count themes for filter display
  const totalThemeCount = strategicData?.themes?.length || 0;
  const themeCount = selectedThemeIds?.length || totalThemeCount;

  return {
    analytics,
    isLoading,
    error: error as Error | null,
    themeCount,
    totalThemeCount,
  };
}
