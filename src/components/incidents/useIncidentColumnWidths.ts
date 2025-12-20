/**
 * Hook for managing incident table column widths with localStorage persistence
 * Stores widths per-user, per-view (Incident List)
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'catalyst-incident-list-column-widths';

// Default column widths - enterprise-grade stable widths per spec
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  key: 130,         // 120-140px range
  summary: 320,     // Flexible (takes remaining space)
  severity: 110,    // 110px per spec
  level: 60,        // Compact level indicator
  status: 140,      // 140px per spec
  assignee: 180,    // 180px per spec
  age: 70,          // 70px per spec
  sla: 90,          // 90px per spec
  releaseVersion: 110, // 110px per spec
  major: 110,       // 110px per spec
  committee: 120,   // 120px per spec
};

// Minimum widths to prevent collapse
export const MIN_COLUMN_WIDTHS: Record<string, number> = {
  key: 100,
  summary: 200,
  severity: 80,
  level: 50,
  status: 100,
  assignee: 120,
  age: 60,
  sla: 70,
  releaseVersion: 90,
  major: 80,
  committee: 100,
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
