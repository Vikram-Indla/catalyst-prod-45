/**
 * Module 3B-3: Main dashboard hook combining all data sources
 */

import { useState, useCallback } from 'react';
import { useDashboardProgress } from './useDashboardProgress';
import { useWorkerActivity } from './useWorkerActivity';
import { useRecentResults } from './useRecentResults';
import { useTrendData } from './useTrendData';
import type { DashboardState, RefreshConfig, DEFAULT_REFRESH_CONFIG } from '../types/progress-dashboard';

export function useProgressDashboard(
  runId: string | null,
  config: RefreshConfig = {
    summaryInterval: 2000,
    workersInterval: 1000,
    resultsInterval: 2000,
    trendsInterval: 30000,
  }
) {
  const [isLive, setIsLive] = useState(true);

  const { summary, statusBreakdown, isLoading: summaryLoading } = useDashboardProgress(
    runId,
    isLive ? config.summaryInterval : 0
  );

  const { workers, isLoading: workersLoading } = useWorkerActivity(
    runId,
    isLive ? config.workersInterval : 0
  );

  const { results, isLoading: resultsLoading } = useRecentResults(
    runId,
    isLive ? config.resultsInterval : 0
  );

  const { trendData, isLoading: trendsLoading } = useTrendData(
    runId,
    isLive ? config.trendsInterval : 0
  );

  const state: DashboardState = {
    summary,
    statusBreakdown,
    workers,
    recentResults: results,
    trendData,
    isLive,
    lastUpdated: Date.now(),
  };

  const toggleLive = useCallback(() => {
    setIsLive(prev => !prev);
  }, []);

  return {
    ...state,
    isLoading: summaryLoading || workersLoading || resultsLoading || trendsLoading,
    toggleLive,
  };
}
