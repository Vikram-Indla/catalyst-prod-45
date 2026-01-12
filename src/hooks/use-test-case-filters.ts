/**
 * useTestCaseFilters — URL-synced filter state for test cases
 * Features:
 * - Syncs filters to URL search params
 * - Shareable filter views
 * - Type-safe filter management
 */

import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

export interface TestCaseFilters {
  search?: string;
  types?: string[];
  priorities?: string[];
  statuses?: string[];
  releases?: string[];
  assigneeId?: string;
  folderId?: string;
}

export function useTestCaseFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: TestCaseFilters = useMemo(() => ({
    search: searchParams.get('search') || undefined,
    types: searchParams.get('types')?.split(',').filter(Boolean) || undefined,
    priorities: searchParams.get('priorities')?.split(',').filter(Boolean) || undefined,
    statuses: searchParams.get('statuses')?.split(',').filter(Boolean) || undefined,
    releases: searchParams.get('releases')?.split(',').filter(Boolean) || undefined,
    assigneeId: searchParams.get('assigneeId') || undefined,
    folderId: searchParams.get('folderId') || undefined,
  }), [searchParams]);

  const setFilters = useCallback((newFilters: Partial<TestCaseFilters>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === undefined || value === null || (Array.isArray(value) && value.length === 0) || value === '') {
          next.delete(key);
        } else if (Array.isArray(value)) {
          next.set(key, value.join(','));
        } else {
          next.set(key, String(value));
        }
      });
      
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setFilter = useCallback(<K extends keyof TestCaseFilters>(
    key: K, 
    value: TestCaseFilters[K]
  ) => {
    setFilters({ [key]: value });
  }, [setFilters]);

  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(v => v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0));
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([_, v]) => {
      if (v === undefined || v === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }).length;
  }, [filters]);

  return {
    filters,
    setFilters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}
