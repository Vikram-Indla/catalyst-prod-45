import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';
import type { DefectFilters, DefectStatus, DefectSeverity, DefectPriority, FilterType } from '@/types/defect.types';

const DEFAULT_PAGE_SIZE = 50;

export function useDefectFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: DefectFilters = useMemo(() => ({
    statuses: searchParams.getAll('status') as DefectStatus[],
    severities: searchParams.getAll('severity') as DefectSeverity[],
    priorities: searchParams.getAll('priority') as DefectPriority[],
    assigneeIds: searchParams.getAll('assignee'),
    reporterIds: searchParams.getAll('reporter'),
    components: searchParams.getAll('component'),
    search: searchParams.get('q') || '',
    isBlocker: searchParams.get('blocker') === 'true' ? true : searchParams.get('blocker') === 'false' ? false : null,
    isRegression: searchParams.get('regression') === 'true' ? true : searchParams.get('regression') === 'false' ? false : null,
    sortBy: (searchParams.get('sort') as DefectFilters['sortBy']) || 'newest',
    page: parseInt(searchParams.get('page') || '1', 10),
    pageSize: parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10),
  }), [searchParams]);

  const addFilter = useCallback((type: FilterType, value: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (type === 'assignee' || type === 'reporter') {
      const existing = params.getAll(type);
      if (!existing.includes(value)) {
        params.append(type, value);
      }
    } else if (type === 'blocker' || type === 'regression') {
      params.set(type, value);
    } else {
      const existing = params.getAll(type);
      if (!existing.includes(value)) {
        params.append(type, value);
      }
    }
    
    params.set('page', '1');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const removeFilter = useCallback((type: FilterType, value?: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (type === 'blocker' || type === 'regression') {
      params.delete(type);
    } else if (value) {
      const values = params.getAll(type).filter(v => v !== value);
      params.delete(type);
      values.forEach(v => params.append(type, v));
    } else {
      params.delete(type);
    }
    
    params.set('page', '1');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const setFilters = useCallback((type: FilterType, values: string[]) => {
    const params = new URLSearchParams(searchParams);
    params.delete(type);
    values.forEach(v => params.append(type, v));
    params.set('page', '1');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const setSearch = useCallback((query: string) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    params.set('page', '1');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const setPage = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const setSortBy = useCallback((sortBy: DefectFilters['sortBy']) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', sortBy);
    params.set('page', '1');
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const hasActiveFilters = 
    filters.statuses.length > 0 || 
    filters.severities.length > 0 || 
    filters.priorities.length > 0 ||
    filters.assigneeIds.length > 0 ||
    filters.components.length > 0 ||
    filters.isBlocker !== null ||
    filters.isRegression !== null ||
    !!filters.search;

  return {
    filters,
    addFilter,
    removeFilter,
    setFilters,
    clearFilters,
    setSearch,
    setPage,
    setSortBy,
    hasActiveFilters,
  };
}
