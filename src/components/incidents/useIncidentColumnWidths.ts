/**
 * Hook for managing incident table column widths with localStorage persistence
 * Enterprise-grade stable column widths for Jira-quality density
 * 
 * Updated defaults per A6 spec:
 * - Summary: 480px (was 320px) - fixed, not flexible
 * - Better width distribution across columns
 * - All columns resizable with proper min/max constraints
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'catalyst-incident-list-column-widths';

// Default column widths - enterprise-grade fixed widths per spec A6
// Summary is NOT flexible; all columns use explicit pixel widths
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  key: 110,           // Fixed key column
  summary: 420,       // Fixed width (NOT flex), resizable up to 900
  severity: 90,       // Compact severity with dot
  level: 60,          // Plain text L1/L2/L3
  status: 130,        // Compact status pill
  assignee: 170,      // Avatar + truncated name
  age: 60,            // Compact numeric tabular
  sla: 80,            // Subtle text color
  releaseVersion: 90, // Plain text version
  major: 70,          // Small badge or "—"
  committee: 120,     // Text only
  actions: 40,        // Fixed actions column
};

// Minimum widths to prevent collapse
export const MIN_COLUMN_WIDTHS: Record<string, number> = {
  key: 80,
  summary: 200,       // Minimum readable summary width
  severity: 70,
  level: 50,
  status: 100,
  assignee: 120,
  age: 50,
  sla: 60,
  releaseVersion: 80,
  major: 55,
  committee: 80,
  actions: 40,
};

// Maximum widths to prevent over-expansion
export const MAX_COLUMN_WIDTHS: Record<string, number> = {
  key: 160,
  summary: 1000,      // Allow wide summary for long titles (was 600, too tight)
  severity: 140,
  level: 100,
  status: 200,
  assignee: 280,
  age: 100,
  sla: 140,
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
