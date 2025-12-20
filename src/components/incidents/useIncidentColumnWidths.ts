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
// ALL columns use fixed pixel widths (no fr units) for proper resizing
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  key: 90,            // Fixed key column
  summary: 520,       // Default wider summary - resizable
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
  summary: 240,       // Minimum readable summary width
  severity: 60,
  level: 60,
  status: 120,
  assignee: 140,
  age: 60,
  sla: 80,
  releaseVersion: 80,
  major: 70,
  committee: 90,
  actions: 40,
};

// Maximum widths - generous limits for enterprise flexibility
export const MAX_COLUMN_WIDTHS: Record<string, number> = {
  key: 180,
  summary: 1200,      // Summary can grow very wide
  severity: 140,
  level: 120,
  status: 220,
  assignee: 300,
  age: 120,
  sla: 200,
  releaseVersion: 220,
  major: 160,
  committee: 240,
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
