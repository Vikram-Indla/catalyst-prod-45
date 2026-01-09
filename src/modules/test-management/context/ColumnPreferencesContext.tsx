/**
 * Column Preferences Context
 * Provides shared column visibility state across components
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DEFAULT_VISIBLE_COLUMNS, STORAGE_KEY, TEST_CASE_COLUMNS } from '../config/columnConfig';

interface ColumnPreferencesContextValue {
  visibleColumns: string[];
  toggleColumn: (columnKey: string) => void;
  resetToDefault: () => void;
  isColumnVisible: (columnKey: string) => boolean;
}

const ColumnPreferencesContext = createContext<ColumnPreferencesContextValue | null>(null);

export function ColumnPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_VISIBLE_COLUMNS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          // Ensure locked columns are always included
          const lockedColumns = TEST_CASE_COLUMNS.filter(c => c.locked).map(c => c.key);
          const withLocked = [...new Set([...lockedColumns, ...parsed])];
          return withLocked;
        }
      }
    } catch (e) {
      console.warn('Failed to parse column preferences:', e);
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
    } catch (e) {
      console.warn('Failed to save column preferences:', e);
    }
  }, [visibleColumns]);

  const toggleColumn = useCallback((columnKey: string) => {
    // Don't allow toggling locked columns
    const column = TEST_CASE_COLUMNS.find(c => c.key === columnKey);
    if (column?.locked) return;

    setVisibleColumns(prev => {
      if (prev.includes(columnKey)) {
        return prev.filter(k => k !== columnKey);
      } else {
        return [...prev, columnKey];
      }
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  }, []);

  const isColumnVisible = useCallback((columnKey: string) => {
    return visibleColumns.includes(columnKey);
  }, [visibleColumns]);

  const value = useMemo(() => ({
    visibleColumns,
    toggleColumn,
    resetToDefault,
    isColumnVisible,
  }), [visibleColumns, toggleColumn, resetToDefault, isColumnVisible]);

  return (
    <ColumnPreferencesContext.Provider value={value}>
      {children}
    </ColumnPreferencesContext.Provider>
  );
}

export function useColumnPreferencesContext() {
  const context = useContext(ColumnPreferencesContext);
  if (!context) {
    throw new Error('useColumnPreferencesContext must be used within a ColumnPreferencesProvider');
  }
  return context;
}
