// ============================================================
// PLANNER SEARCH & FILTER HOOK
// Provides search and filter state management
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import type { PlannerTask, TaskStatus, TaskPriority } from '../types';

export interface PlannerFilters {
  search: string;
  status: TaskStatus | null;
  priority: TaskPriority | null;
  workstreamId: string | null;  // Added workstream filter
  assigneeId: string | null;
  blocked: boolean | null;
  overdue: boolean | null;
}

const DEFAULT_FILTERS: PlannerFilters = {
  search: '',
  status: null,
  priority: null,
  workstreamId: null,
  assigneeId: null,
  blocked: null,
  overdue: null,
};

export function usePlannerSearch(tasks: PlannerTask[]) {
  const [filters, setFilters] = useState<PlannerFilters>(DEFAULT_FILTERS);

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(() => new Fuse(tasks, {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'key', weight: 0.3 },
      { name: 'description', weight: 0.2 },
      { name: 'assigneeName', weight: 0.1 },
    ],
    threshold: 0.3,
    includeScore: true,
  }), [tasks]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Apply text search
    if (filters.search.trim()) {
      const searchResults = fuse.search(filters.search.trim());
      result = searchResults.map(r => r.item);
    }

    // Apply status filter
    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }

    // Apply priority filter
    if (filters.priority) {
      result = result.filter(t => t.priority === filters.priority);
    }

    // Apply workstream filter
    if (filters.workstreamId) {
      result = result.filter(t => t.teamId === filters.workstreamId);
    }

    // Apply assignee filter
    if (filters.assigneeId) {
      result = result.filter(t => t.assigneeId === filters.assigneeId);
    }

    // Apply blocked filter
    if (filters.blocked !== null) {
      result = result.filter(t => t.blocked === filters.blocked);
    }

    // Apply overdue filter
    if (filters.overdue === true) {
      const now = new Date();
      result = result.filter(t => 
        t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
      );
    }

    return result;
  }, [tasks, filters, fuse]);

  // Filter setters
  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const setStatusFilter = useCallback((status: TaskStatus | null) => {
    setFilters(prev => ({ ...prev, status }));
  }, []);

  const setPriorityFilter = useCallback((priority: TaskPriority | null) => {
    setFilters(prev => ({ ...prev, priority }));
  }, []);

  const setWorkstreamFilter = useCallback((workstreamId: string | null) => {
    setFilters(prev => ({ ...prev, workstreamId }));
  }, []);

  const setAssigneeFilter = useCallback((assigneeId: string | null) => {
    setFilters(prev => ({ ...prev, assigneeId }));
  }, []);

  const setBlockedFilter = useCallback((blocked: boolean | null) => {
    setFilters(prev => ({ ...prev, blocked }));
  }, []);

  const setOverdueFilter = useCallback((overdue: boolean | null) => {
    setFilters(prev => ({ ...prev, overdue }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.status !== null ||
      filters.priority !== null ||
      filters.workstreamId !== null ||
      filters.assigneeId !== null ||
      filters.blocked !== null ||
      filters.overdue !== null
    );
  }, [filters]);

  return {
    filters,
    filteredTasks,
    setSearch,
    setStatusFilter,
    setPriorityFilter,
    setWorkstreamFilter,
    setAssigneeFilter,
    setBlockedFilter,
    setOverdueFilter,
    clearFilters,
    hasActiveFilters,
    totalCount: tasks.length,
    filteredCount: filteredTasks.length,
  };
}
