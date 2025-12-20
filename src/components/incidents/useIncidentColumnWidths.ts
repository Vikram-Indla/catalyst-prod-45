/**
 * Hook for managing incident table column widths with localStorage persistence
 * Enterprise-grade stable column widths for Jira-quality density
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'catalyst-incident-list-column-widths';

// Default column widths - enterprise-grade fixed widths per spec
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  key: 110,           // Fixed key column
  summary: 320,       // Fixed width, NOT flexible - scroll if needed
  severity: 80,       // Compact severity with dot
  level: 50,          // Plain text L1/L2/L3
  status: 110,        // Compact status pill
  assignee: 160,      // Avatar + truncated name
  age: 55,            // Compact numeric tabular
  sla: 70,            // Subtle text color
  releaseVersion: 90, // Plain text version
  major: 70,          // Small badge or "—"
  committee: 90,      // Text only
  actions: 32,        // Fixed actions column
};

// Minimum widths to prevent collapse
export const MIN_COLUMN_WIDTHS: Record<string, number> = {
  key: 80,
  summary: 200,       // Minimum readable summary width
  severity: 65,
  level: 40,
  status: 90,
  assignee: 100,
  age: 45,
  sla: 55,
  releaseVersion: 70,
  major: 55,
  committee: 70,
  actions: 32,
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
    const clampedWidth = Math.max(minWidth, Math.min(500, width));
    
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