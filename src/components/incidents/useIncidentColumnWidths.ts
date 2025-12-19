/**
 * Hook for managing incident table column widths with localStorage persistence
 * Stores widths per-user, per-view (Incident List)
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'catalyst-incident-list-column-widths';

// Default column widths - designed for enterprise density
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  key: 80,
  summary: 280,
  severity: 68,
  level: 48,
  status: 96,
  assignee: 120,
  age: 48,
  sla: 56,
  releaseVersion: 76,
  major: 52,
  committee: 88,
};

// Minimum widths to prevent collapse
export const MIN_COLUMN_WIDTHS: Record<string, number> = {
  key: 60,
  summary: 160,
  severity: 50,
  level: 40,
  status: 70,
  assignee: 80,
  age: 40,
  sla: 48,
  releaseVersion: 60,
  major: 44,
  committee: 70,
};

export function useIncidentColumnWidths() {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load incident column widths:', e);
    }
    return DEFAULT_COLUMN_WIDTHS;
  });

  const handleColumnResize = useCallback((columnId: string, width: number) => {
    const minWidth = MIN_COLUMN_WIDTHS[columnId] || 40;
    const clampedWidth = Math.max(minWidth, Math.min(600, width));
    
    setColumnWidths(prev => {
      const newWidths = { ...prev, [columnId]: clampedWidth };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidths));
      } catch (e) {
        console.error('Failed to save incident column widths:', e);
      }
      return newWidths;
    });
  }, []);

  const resetColumnWidths = useCallback(() => {
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { columnWidths, handleColumnResize, resetColumnWidths };
}
