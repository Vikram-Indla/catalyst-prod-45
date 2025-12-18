/**
 * Strategy Coverage Data Hook with LKG Caching
 * Wraps useStrategyPyramidCounts with Last Known Good caching
 * Prevents UI flickering during snapshot changes
 * 
 * LKG CACHE BEHAVIOR:
 * - On mount: hydrate from sessionStorage cache
 * - On fetch start: show cached data immediately if available
 * - On fetch success: update cache + persist to sessionStorage
 * - On fetch failure: show cached data with stale indicator
 */

import { useRef, useEffect, useMemo } from 'react';
import { useStrategyPyramidCounts, PyramidCounts } from './useExecutionMetrics';
import { getLKGData, setLKGData, safeNumber } from '@/utils/strategyRoomCache';

export const EMPTY_COVERAGE: PyramidCounts = {
  themes: 0,
  epics: 0,
  features: 0,
  alignedEpics: 0,
  misalignedEpics: 0,
  alignedFeatures: 0,
  misalignedFeatures: 0,
};

export function useStrategyCoverageData(snapshotId?: string) {
  // Track if we've ever successfully loaded data
  const hasEverLoadedRef = useRef(false);
  
  // Track last good data in memory for fast access
  const lastGoodDataRef = useRef<PyramidCounts | null>(null);
  
  // Track previous snapshot to detect changes
  const prevSnapshotIdRef = useRef<string | undefined>(undefined);

  // On snapshot change, try to load LKG from sessionStorage immediately
  useEffect(() => {
    if (snapshotId && snapshotId !== prevSnapshotIdRef.current) {
      prevSnapshotIdRef.current = snapshotId;
      
      // Try to get LKG data from cache for immediate display
      const cachedData = getLKGData<PyramidCounts>(snapshotId, 'coverage');
      if (cachedData) {
        lastGoodDataRef.current = cachedData;
        hasEverLoadedRef.current = true;
      }
    }
  }, [snapshotId]);

  // Use the base hook
  const query = useStrategyPyramidCounts(snapshotId);

  // On successful data fetch, update LKG cache
  useEffect(() => {
    if (query.data && snapshotId) {
      // Validate data before caching (ensure no NaN values)
      const validatedData: PyramidCounts = {
        themes: safeNumber(query.data.themes),
        epics: safeNumber(query.data.epics),
        features: safeNumber(query.data.features),
        alignedEpics: safeNumber(query.data.alignedEpics),
        misalignedEpics: safeNumber(query.data.misalignedEpics),
        alignedFeatures: safeNumber(query.data.alignedFeatures),
        misalignedFeatures: safeNumber(query.data.misalignedFeatures),
      };
      
      lastGoodDataRef.current = validatedData;
      hasEverLoadedRef.current = true;
      setLKGData(snapshotId, 'coverage', validatedData);
    }
  }, [query.data, snapshotId]);

  // Compute stable display data that NEVER goes undefined after first load
  const displayData = useMemo(() => {
    // Priority 1: Fresh data from current query
    if (query.data) {
      return query.data;
    }
    
    // Priority 2: Last good data in memory
    if (lastGoodDataRef.current) {
      return lastGoodDataRef.current;
    }
    
    // Priority 3: Try sessionStorage cache
    if (snapshotId) {
      const cached = getLKGData<PyramidCounts>(snapshotId, 'coverage');
      if (cached) {
        lastGoodDataRef.current = cached;
        return cached;
      }
    }
    
    // Priority 4: Empty data (will show skeleton on first load only)
    return null;
  }, [query.data, snapshotId]);

  // Compute loading states per requirements
  const isInitialLoading = query.isLoading && !hasEverLoadedRef.current && !lastGoodDataRef.current;
  const isRefreshing = query.isFetching && (hasEverLoadedRef.current || !!lastGoodDataRef.current);

  return {
    // Return displayData which bridges snapshot transitions
    data: displayData,
    // True only when we have NEVER loaded any data AND no LKG exists (show skeleton)
    isLoading: isInitialLoading,
    // True when actively fetching new data with existing data shown (show "Refreshing..." indicator)
    isFetching: isRefreshing,
    // True when we have data to show
    hasData: !!displayData,
    // True if showing stale/cached data
    isStale: query.isStale && !!displayData,
    // Error state
    error: query.error,
  };
}
