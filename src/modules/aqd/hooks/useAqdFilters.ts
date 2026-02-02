/**
 * Task¹⁰ Filter Hook - Manages filter state and filtered items
 */
import { useState, useMemo, useCallback } from 'react';
import type { AqdItemFull, AqdItemStatus } from '../types/aqd.types';

interface UseAqdFiltersReturn {
  // Filter state
  searchQuery: string;
  statusFilter: AqdItemStatus | 'all';
  labelFilter: string | 'all';
  assigneeFilter: string | 'all';
  
  // Setters
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: AqdItemStatus | 'all') => void;
  setLabelFilter: (labelId: string | 'all') => void;
  setAssigneeFilter: (assigneeId: string | 'all') => void;
  clearAllFilters: () => void;
  
  // Filtered data
  filteredItems: AqdItemFull[];
  
  // Helper computed
  hasActiveFilters: boolean;
  uniqueAssignees: { id: string; name: string }[];
}

export function useAqdFilters(items: AqdItemFull[]): UseAqdFiltersReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AqdItemStatus | 'all'>('all');
  const [labelFilter, setLabelFilter] = useState<string | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'all'>('all');

  // Extract unique assignees from items
  const uniqueAssignees = useMemo(() => {
    const seen = new Map<string, string>();
    items.forEach(item => {
      if (item.assignee_id && item.assignee_name && !seen.has(item.assignee_id)) {
        seen.set(item.assignee_id, item.assignee_name);
      }
    });
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [items]);

  // Apply filters to items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.taskhub_key?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter);
    }

    // Label filter
    if (labelFilter !== 'all') {
      result = result.filter(item => 
        item.labels?.some(label => label.id === labelFilter)
      );
    }

    // Assignee filter
    if (assigneeFilter !== 'all') {
      result = result.filter(item => item.assignee_id === assigneeFilter);
    }

    return result;
  }, [items, searchQuery, statusFilter, labelFilter, assigneeFilter]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setLabelFilter('all');
    setAssigneeFilter('all');
  }, []);

  const hasActiveFilters = 
    searchQuery !== '' || 
    statusFilter !== 'all' || 
    labelFilter !== 'all' || 
    assigneeFilter !== 'all';

  return {
    searchQuery,
    statusFilter,
    labelFilter,
    assigneeFilter,
    setSearchQuery,
    setStatusFilter,
    setLabelFilter,
    setAssigneeFilter,
    clearAllFilters,
    filteredItems,
    hasActiveFilters,
    uniqueAssignees,
  };
}

export default useAqdFilters;
