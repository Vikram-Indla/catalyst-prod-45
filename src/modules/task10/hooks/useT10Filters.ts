// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useT10Filters
// Purpose: Filter state management for landing page
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from 'react';
import type { T10FilterState, T10ListStatus, T10DateRangePreset } from '../types';
import { T10_DEFAULT_FILTERS } from '../types';

/**
 * Filter state management hook
 */
export function useT10Filters() {
  const [filters, setFilters] = useState<T10FilterState>(T10_DEFAULT_FILTERS);

  // Search
  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  // Labels
  const setLabels = useCallback((labels: string[]) => {
    setFilters(prev => ({ ...prev, labels }));
  }, []);

  const toggleLabel = useCallback((labelId: string) => {
    setFilters(prev => ({
      ...prev,
      labels: prev.labels.includes(labelId)
        ? prev.labels.filter(id => id !== labelId)
        : [...prev.labels, labelId],
    }));
  }, []);

  // Assignees
  const setAssignees = useCallback((assignees: string[]) => {
    setFilters(prev => ({ ...prev, assignees }));
  }, []);

  const toggleAssignee = useCallback((userId: string) => {
    setFilters(prev => ({
      ...prev,
      assignees: prev.assignees.includes(userId)
        ? prev.assignees.filter(id => id !== userId)
        : [...prev.assignees, userId],
    }));
  }, []);

  // Date range
  const setDateRange = useCallback((
    preset: T10DateRangePreset | null,
    start?: string | null,
    end?: string | null
  ) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        preset,
        start: start ?? null,
        end: end ?? null,
      },
    }));
  }, []);

  // Status
  const setStatus = useCallback((status: T10ListStatus | 'all') => {
    setFilters(prev => ({ ...prev, status }));
  }, []);

  // Reset all
  const resetFilters = useCallback(() => {
    setFilters(T10_DEFAULT_FILTERS);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.labels.length > 0 ||
      filters.assignees.length > 0 ||
      filters.dateRange.preset !== null ||
      filters.status !== 'all'
    );
  }, [filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.labels.length > 0) count++;
    if (filters.assignees.length > 0) count++;
    if (filters.dateRange.preset) count++;
    if (filters.status !== 'all') count++;
    return count;
  }, [filters]);

  return {
    filters,
    setSearch,
    setLabels,
    toggleLabel,
    setAssignees,
    toggleAssignee,
    setDateRange,
    setStatus,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}

/**
 * Helper: Convert date range preset to actual dates
 */
export function getDateRangeFromPreset(preset: T10DateRangePreset): { start: string; end: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (preset) {
    case 'today':
      return {
        start: today.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
    
    case 'tomorrow':
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        start: tomorrow.toISOString().split('T')[0],
        end: tomorrow.toISOString().split('T')[0],
      };
    
    case 'this_week':
      const dayOfWeek = today.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0],
      };
    
    case 'next_week':
      const nextMonday = new Date(today);
      const currentDay = today.getDay();
      const daysUntilNextMonday = currentDay === 0 ? 1 : 8 - currentDay;
      nextMonday.setDate(today.getDate() + daysUntilNextMonday);
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 6);
      return {
        start: nextMonday.toISOString().split('T')[0],
        end: nextSunday.toISOString().split('T')[0],
      };
    
    case 'this_month':
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        start: firstOfMonth.toISOString().split('T')[0],
        end: lastOfMonth.toISOString().split('T')[0],
      };
    
    case 'overdue':
      const longAgo = new Date('2020-01-01');
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: longAgo.toISOString().split('T')[0],
        end: yesterday.toISOString().split('T')[0],
      };
    
    default:
      return {
        start: today.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
  }
}
