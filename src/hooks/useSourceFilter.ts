/**
 * useSourceFilter — Filter state management for source provenance
 * Stage B: Full implementation with callback filter
 */
import { useState, useCallback } from 'react';

type WorkItemSource = 'catalyst' | 'jira';
type SyncStatus = 'synced' | 'stale' | 'conflict' | 'syncing' | 'pending';

interface JiraSyncFilter {
  source?: WorkItemSource | 'all';
  syncStatus?: SyncStatus[];
  releaseId?: string;
}

type SourceFilterValue = WorkItemSource | 'all';

export function useSourceFilter(defaultValue: SourceFilterValue = 'all') {
  const [filter, setFilter] = useState<JiraSyncFilter>({
    source: defaultValue,
    syncStatus: [],
  });

  const setSource = useCallback((source: SourceFilterValue) => {
    setFilter(prev => ({ ...prev, source }));
  }, []);

  const setSyncStatus = useCallback((syncStatus: SyncStatus[]) => {
    setFilter(prev => ({ ...prev, syncStatus }));
  }, []);

  const setReleaseId = useCallback((releaseId: string | undefined) => {
    setFilter(prev => ({ ...prev, releaseId }));
  }, []);

  const filterFn = useCallback(<T extends { source?: string; sync_status?: string }>(items: T[]): T[] => {
    let result = items;
    if (filter.source && filter.source !== 'all') {
      result = result.filter(item => item.source === filter.source);
    }
    if (filter.syncStatus && filter.syncStatus.length > 0) {
      result = result.filter(item => item.sync_status && filter.syncStatus!.includes(item.sync_status as SyncStatus));
    }
    return result;
  }, [filter]);

  return { filter, source: filter.source || 'all', setSource, setSyncStatus, setReleaseId, filterFn };
}
