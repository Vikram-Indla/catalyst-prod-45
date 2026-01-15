// =====================================================
// USE RELEASES FILTER HOOK
// Manages filter state for releases
// =====================================================

import { useState, useCallback } from 'react';
import { ReleasesFilter, ReleaseStatus, ReleaseHealth } from '@/types/releases';

const defaultFilter: ReleasesFilter = {
  status: ['planning', 'active', 'uat'],
  health: [],
  search: '',
};

export function useReleasesFilter() {
  const [filter, setFilter] = useState<ReleasesFilter>(defaultFilter);
  
  const toggleStatus = useCallback((status: ReleaseStatus) => {
    setFilter(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }));
  }, []);
  
  const toggleHealth = useCallback((health: ReleaseHealth) => {
    setFilter(prev => ({
      ...prev,
      health: prev.health.includes(health)
        ? prev.health.filter(h => h !== health)
        : [...prev.health, health],
    }));
  }, []);
  
  const setSearch = useCallback((search: string) => {
    setFilter(prev => ({ ...prev, search }));
  }, []);
  
  const clearFilters = useCallback(() => {
    setFilter(defaultFilter);
  }, []);
  
  const activeFilterCount = 
    (filter.status.length < 5 && filter.status.length > 0 ? 1 : 0) +
    filter.health.length;
  
  return {
    filter,
    toggleStatus,
    toggleHealth,
    setSearch,
    clearFilters,
    activeFilterCount,
  };
}
