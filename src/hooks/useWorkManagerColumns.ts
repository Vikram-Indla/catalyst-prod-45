// src/hooks/useWorkManagerColumns.ts
// Shared hook for Work Manager column configuration with localStorage persistence

import { useState, useEffect, useCallback } from 'react';
import { defaultColumns } from '@/lib/work-manager-data';
import type { KanbanColumn } from '@/components/work-manager/types';

const STORAGE_KEY = 'work-manager-columns';

export function useWorkManagerColumns() {
  const [columns, setColumns] = useState<KanbanColumn[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load columns from localStorage:', e);
    }
    return defaultColumns;
  });

  // Persist columns to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    } catch (e) {
      console.warn('Failed to save columns to localStorage:', e);
    }
  }, [columns]);

  const addColumn = useCallback((column: Omit<KanbanColumn, 'id'>) => {
    const newColumn: KanbanColumn = {
      ...column,
      id: `col-${Date.now()}`,
    };
    setColumns(prev => [...prev, newColumn]);
    return newColumn;
  }, []);

  const updateColumn = useCallback((id: string, updates: Partial<Omit<KanbanColumn, 'id'>>) => {
    setColumns(prev => prev.map(col =>
      col.id === id ? { ...col, ...updates } : col
    ));
  }, []);

  const deleteColumn = useCallback((id: string) => {
    setColumns(prev => prev.filter(col => col.id !== id));
  }, []);

  const reorderColumns = useCallback((newOrder: KanbanColumn[]) => {
    setColumns(newOrder);
  }, []);

  const resetToDefaults = useCallback(() => {
    setColumns(defaultColumns);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    columns,
    setColumns,
    addColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    resetToDefaults,
  };
}
