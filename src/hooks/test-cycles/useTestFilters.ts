/**
 * Hook for managing filter state in Add Tests workflow
 */

import { useState, useCallback, useMemo } from 'react';
import type { TestCaseFilters } from '@/types/add-tests.types';

const DEFAULT_FILTERS: TestCaseFilters = {
  search: '',
  module: null,
  testType: null,
  priority: null,
  automationStatus: null,
  hideAlreadyAdded: false,
};

export function useTestFilters() {
  const [filters, setFilters] = useState<TestCaseFilters>(DEFAULT_FILTERS);

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const setModule = useCallback((module: string | null) => {
    setFilters(prev => ({ ...prev, module }));
  }, []);

  const setTestType = useCallback((testType: string | null) => {
    setFilters(prev => ({ ...prev, testType }));
  }, []);

  const setPriority = useCallback((priority: string | null) => {
    setFilters(prev => ({ ...prev, priority }));
  }, []);

  const setAutomationStatus = useCallback((automationStatus: string | null) => {
    setFilters(prev => ({ ...prev, automationStatus }));
  }, []);

  const setHideAlreadyAdded = useCallback((hideAlreadyAdded: boolean) => {
    setFilters(prev => ({ ...prev, hideAlreadyAdded }));
  }, []);

  const clearFilter = useCallback((filterKey: keyof TestCaseFilters) => {
    setFilters(prev => ({ ...prev, [filterKey]: filterKey === 'hideAlreadyAdded' ? false : filterKey === 'search' ? '' : null }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.module) count++;
    if (filters.testType) count++;
    if (filters.priority) count++;
    if (filters.automationStatus) count++;
    if (filters.hideAlreadyAdded) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  return {
    filters,
    setSearch,
    setModule,
    setTestType,
    setPriority,
    setAutomationStatus,
    setHideAlreadyAdded,
    clearFilter,
    clearAllFilters,
    activeFilterCount,
    hasActiveFilters,
  };
}
