/**
 * Hook for managing incident table column widths with localStorage persistence
 * Enterprise-grade stable column widths for Jira-quality density
 * 
 * Updated defaults for enterprise-grade table:
 * - Summary: 360px default, resizable up to 900px
 * - Better width distribution across columns
 * - All columns resizable with proper min/max constraints
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'catalyst-incident-list-column-widths';

// Default column widths - enterprise-grade CSS Grid widths
// Summary uses minmax(width, 1fr) in grid template for flexible growth
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  key: 90,            // Fixed key column
  summary: 320,       // minmax(320px, 1fr) - grows to fill space
  severity: 70,       // Compact severity pill with dot
  level: 70,          // Plain text L1/L2/L3
  status: 140,        // Compact status pill
  assignee: 160,      // Avatar + truncated name
  age: 70,            // Compact numeric tabular
  sla: 110,           // Subtle text color
  releaseVersion: 110,// Plain text version
  major: 90,          // Small badge or "—"
  committee: 120,     // Text only
  actions: 40,        // Fixed actions column (never resized)
};

// Minimum widths to prevent collapse
export const MIN_COLUMN_WIDTHS: Record<string, number> = {
  key: 70,
  summary: 200,       // Minimum readable summary width
  severity: 60,
  level: 50,
  status: 100,
  assignee: 100,
  age: 50,
  sla: 70,
  releaseVersion: 80,
  major: 60,
  committee: 80,
  actions: 40,
};

// Maximum widths - per-column clamp rules
export const MAX_COLUMN_WIDTHS: Record<string, number> = {
  key: 160,           // Key max: 160
  summary: 900,       // Summary max: 900
  severity: 120,
  level: 100,
  status: 200,
  assignee: 260,      // Assignee max: 260
  age: 100,
  sla: 160,
  releaseVersion: 180,
  major: 120,
  committee: 200,
  actions: 40,
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
    const maxWidth = MAX_COLUMN_WIDTHS[columnId] || 600;
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width));
    
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
