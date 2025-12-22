/**
 * Hook for managing roadmap filter state
 */

import { useState, useCallback, useMemo } from 'react';
import type { RoadmapFilters, GroupingField } from '../types/roadmap';
import { EMPTY_FILTERS } from '../types/roadmap';

export function useRoadmapFilters(initialFilters?: Partial<RoadmapFilters>) {
  const [filters, setFilters] = useState<RoadmapFilters>({
    ...EMPTY_FILTERS,
    ...initialFilters,
  });

  const [grouping, setGrouping] = useState<GroupingField>(null);

  // Update a single filter field
  const updateFilter = useCallback(<K extends keyof RoadmapFilters>(
    key: K,
    value: RoadmapFilters[K]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Update search
  const setSearch = useCallback((search: string) => {
    updateFilter('search', search);
  }, [updateFilter]);

  // Toggle a value in an array filter
  const toggleArrayFilter = useCallback(<K extends keyof RoadmapFilters>(
    key: K,
    value: string
  ) => {
    setFilters((prev) => {
      const current = prev[key] as string[];
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  }, []);

  // Set date range
  const setDateRange = useCallback((start: string | null, end: string | null) => {
    setFilters((prev) => ({
      ...prev,
      date_range: { start, end },
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  // Reset filters to a specific state
  const resetFilters = useCallback((newFilters: RoadmapFilters) => {
    setFilters(newFilters);
  }, []);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    count += filters.status.length;
    count += filters.priority.length;
    count += filters.product_ids.length;
    count += filters.assignee_ids.length;
    count += filters.platforms.length;
    count += filters.health.length;
    if (filters.date_range.start || filters.date_range.end) count++;
    return count;
  }, [filters]);

  // Check if any filters are active
  const hasActiveFilters = activeFilterCount > 0;

  return {
    filters,
    setFilters,
    updateFilter,
    setSearch,
    toggleArrayFilter,
    setDateRange,
    clearFilters,
    resetFilters,
    grouping,
    setGrouping,
    activeFilterCount,
    hasActiveFilters,
  };
}

export type RoadmapFiltersHook = ReturnType<typeof useRoadmapFilters>;
