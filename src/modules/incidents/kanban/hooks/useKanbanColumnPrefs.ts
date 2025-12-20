/**
 * Hook for managing Kanban column preferences (collapse state)
 * Persists to localStorage
 */

import { useState, useCallback, useEffect } from 'react';
import type { IncidentStatus } from '@/types/incident';

const STORAGE_KEY = 'incident-kanban-column-prefs';

interface ColumnPrefs {
  collapsedColumns: IncidentStatus[];
}

const defaultPrefs: ColumnPrefs = {
  collapsedColumns: [],
};

export function useKanbanColumnPrefs() {
  const [prefs, setPrefs] = useState<ColumnPrefs>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return defaultPrefs;
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage errors
    }
  }, [prefs]);

  const isCollapsed = useCallback((status: IncidentStatus) => {
    return prefs.collapsedColumns.includes(status);
  }, [prefs.collapsedColumns]);

  const toggleCollapsed = useCallback((status: IncidentStatus) => {
    setPrefs(prev => {
      const collapsed = prev.collapsedColumns.includes(status)
        ? prev.collapsedColumns.filter(s => s !== status)
        : [...prev.collapsedColumns, status];
      return { ...prev, collapsedColumns: collapsed };
    });
  }, []);

  const setCollapsed = useCallback((status: IncidentStatus, collapsed: boolean) => {
    setPrefs(prev => {
      if (collapsed && !prev.collapsedColumns.includes(status)) {
        return { ...prev, collapsedColumns: [...prev.collapsedColumns, status] };
      }
      if (!collapsed && prev.collapsedColumns.includes(status)) {
        return { ...prev, collapsedColumns: prev.collapsedColumns.filter(s => s !== status) };
      }
      return prev;
    });
  }, []);

  const collapseAll = useCallback((statuses: IncidentStatus[]) => {
    setPrefs(prev => ({ ...prev, collapsedColumns: statuses }));
  }, []);

  const expandAll = useCallback(() => {
    setPrefs(prev => ({ ...prev, collapsedColumns: [] }));
  }, []);

  return {
    collapsedColumns: prefs.collapsedColumns,
    isCollapsed,
    toggleCollapsed,
    setCollapsed,
    collapseAll,
    expandAll,
  };
}
