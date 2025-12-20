/**
 * Hook for managing incident table column widths with localStorage persistence
 * Enterprise-grade stable column widths for Jira-quality density
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'catalyst-incident-list-column-widths';

// Default column widths - enterprise-grade stable widths
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  key: 110,         // Compact key column
  summary: 280,     // Flexible - takes remaining space
  severity: 80,     // Compact severity with dot
  level: 50,        // Plain text L1/L2/L3
  status: 110,      // Compact status pill
  assignee: 160,    // Avatar + truncated name
  age: 55,          // Compact numeric
  sla: 70,          // Subtle text
  releaseVersion: 90, // Plain text version
  major: 60,        // Small badge or "—"
  committee: 90,    // Text only
};

// Minimum widths to prevent collapse
export const MIN_COLUMN_WIDTHS: Record<string, number> = {
  key: 80,
  summary: 180,
  severity: 65,
  level: 40,
  status: 90,
  assignee: 100,
  age: 45,
  sla: 55,
  releaseVersion: 70,
  major: 50,
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