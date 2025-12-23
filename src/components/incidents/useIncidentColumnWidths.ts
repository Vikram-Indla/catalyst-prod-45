/**
 * Hook for managing incident table column widths with localStorage persistence
 * Enterprise-grade auto-fit + manual resize + persist pattern
 * 
 * COLUMN SIZING SPEC:
 * - ID/Key: fixed (small)
 * - Summary: AUTO-FIT CONTENT WIDTH up to MAX, then truncates with ellipsis
 * - Other columns: flexible (share remaining space with weights)
 * - SLA State: fixed/small
 * 
 * Algorithm:
 * 1) Fixed columns get their fixed widths
 * 2) Summary gets content-based width clamped to [min, max]
 * 3) Remaining space is distributed to flexible columns via weights
 * 4) Table always fills container width (no dead space)
 */
import { useState, useCallback, useRef, useLayoutEffect } from 'react';

const STORAGE_KEY = 'catalyst.release.incidentList.columnWidths.v2';

// Column categories for sizing algorithm
const FIXED_COLUMNS = ['key', 'sla', 'actions'] as const;
const SUMMARY_COLUMN = 'summary';

// Base minimum widths (content + padding allowance)
export const MIN_COLUMN_WIDTHS: Record<string, number> = {
  key: 100,
  summary: 200,
  severity: 80,
  status: 100,
  assignee: 120,
  sla: 90,
  // Hidden columns
  level: 44,
  age: 48,
  releaseVersion: 80,
  major: 54,
  committee: 72,
  actions: 40,
};

// Maximum widths for columns
export const MAX_COLUMN_WIDTHS: Record<string, number> = {
  key: 140,
  summary: 700, // Summary max - gives it room to breathe
  severity: 100,
  status: 140,
  assignee: 200,
  sla: 110,
  // Hidden columns
  level: 60,
  age: 64,
  releaseVersion: 140,
  major: 70,
  committee: 120,
  actions: 40,
};

// Flexible column weights for distributing remaining space
// Higher weight = more space
const FLEXIBLE_WEIGHTS: Record<string, number> = {
  summary: 4,     // Give summary the most space
  status: 1.5,
  assignee: 2,
  severity: 1,
  sla: 1,
  // Hidden columns
  level: 0.8,
  age: 0.8,
  releaseVersion: 1.5,
  major: 0.8,
  committee: 1.2,
};

// Sensible fallback defaults if we can't measure
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  key: 110,
  summary: 400,
  severity: 85,
  status: 120,
  assignee: 150,
  sla: 100,
  // Hidden columns
  level: 50,
  age: 52,
  releaseVersion: 95,
  major: 58,
  committee: 85,
  actions: 40,
};

// Column order for iteration - EXACT ORDER for header and rows
// Streamlined: Key, Summary, Severity, Status, Assignee, SLA (6 core columns)
export const COLUMN_ORDER = [
  'key', 
  'summary', 
  'severity', 
  'status', 
  'assignee', 
  'sla',
  // Hidden columns (can be enabled via column selector)
  'level', 
  'age', 
  'releaseVersion', 
  'major', 
  'committee', 
  'actions'
];

// Center-aligned columns (everything except KEY and SUMMARY)
export const CENTER_ALIGNED_COLUMNS = [
  'severity', 
  'status', 
  'assignee', 
  'sla',
  'level', 
  'age', 
  'releaseVersion', 
  'major', 
  'committee'
];

/**
 * SINGLE SOURCE OF TRUTH: Generate grid template columns string
 * This EXACT string must be used by BOTH header row and data rows
 */
export function getGridTemplate(
  columnWidths: Record<string, number>,
  isColumnVisible: (colId: string) => boolean
): string {
  const cols: string[] = [];
  
  COLUMN_ORDER.forEach(colId => {
    if (colId === 'actions') {
      cols.push('40px');
    } else if (isColumnVisible(colId)) {
      const width = columnWidths[colId] || DEFAULT_COLUMN_WIDTHS[colId] || 80;
      cols.push(`${Math.round(width)}px`);
    }
  });
  
  return cols.join(' ');
}

interface UseIncidentColumnWidthsOptions {
  containerRef?: React.RefObject<HTMLElement>;
  visibleColumns?: string[];
}

/**
 * Measures the ideal width needed for a column based on content
 */
function measureColumnContent(columnId: string, padding: number = 36): number {
  // For key column, typical incident keys are like "INC-1234"
  if (columnId === 'key') return 85 + padding;
  
  // For severity, "SEV1" + badge styling
  if (columnId === 'severity') return 50 + padding;
  
  // For level, "L1" short text
  if (columnId === 'level') return 40 + padding;
  
  // For status, longest is "In Progress" 
  if (columnId === 'status') return 80 + padding;
  
  // For assignee, name with avatar
  if (columnId === 'assignee') return 120 + padding;
  
  // For age, "30d" type values
  if (columnId === 'age') return 40 + padding;
  
  // For SLA, "On Track" / "Breached"
  if (columnId === 'sla') return 70 + padding;
  
  // For release, version strings
  if (columnId === 'releaseVersion') return 80 + padding;
  
  // For major, "Yes"/"No"
  if (columnId === 'major') return 50 + padding;
  
  // For committee, status text
  if (columnId === 'committee') return 80 + padding;
  
  // Actions column is fixed
  if (columnId === 'actions') return 40;
  
  // Summary needs more measurement, default to reasonable size
  return 300;
}

/**
 * Calculate auto-fit widths that fill the container
 */
function calculateAutoFitWidths(
  containerWidth: number,
  visibleColumns: string[]
): Record<string, number> {
  const widths: Record<string, number> = {};
  
  // Step 1: Calculate ideal width for each visible column
  visibleColumns.forEach(colId => {
    const measured = measureColumnContent(colId);
    const min = MIN_COLUMN_WIDTHS[colId] || 60;
    const max = MAX_COLUMN_WIDTHS[colId] || 400;
    widths[colId] = Math.max(min, Math.min(max, measured));
  });
  
  // Always include actions column
  widths['actions'] = 40;
  
  // Step 2: Calculate total ideal width
  let totalIdeal = 0;
  visibleColumns.forEach(colId => {
    totalIdeal += widths[colId];
  });
  totalIdeal += 40; // Actions column
  
  // Step 3: If totalIdeal < containerWidth, distribute leftover to flexible columns
  if (totalIdeal < containerWidth) {
    const leftover = containerWidth - totalIdeal;
    
    // Calculate total flexible weight
    let totalWeight = 0;
    visibleColumns.forEach(colId => {
      if (FLEXIBLE_WEIGHTS[colId]) {
        totalWeight += FLEXIBLE_WEIGHTS[colId];
      }
    });
    
    if (totalWeight > 0) {
      // Distribute leftover proportionally
      visibleColumns.forEach(colId => {
        const weight = FLEXIBLE_WEIGHTS[colId] || 0;
        if (weight > 0) {
          const extra = (leftover * weight) / totalWeight;
          const newWidth = widths[colId] + extra;
          const max = MAX_COLUMN_WIDTHS[colId] || 400;
          widths[colId] = Math.min(max, newWidth);
        }
      });
    }
  }
  
  // Ensure all visible columns have a value
  visibleColumns.forEach(colId => {
    if (!widths[colId]) {
      widths[colId] = DEFAULT_COLUMN_WIDTHS[colId] || 100;
    }
  });
  
  return widths;
}

export function useIncidentColumnWidths(options: UseIncidentColumnWidthsOptions = {}) {
  const { containerRef, visibleColumns = COLUMN_ORDER.filter(c => c !== 'actions') } = options;
  const hasInitialized = useRef(false);
  const [hasSavedWidths, setHasSavedWidths] = useState(false);
  
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate that saved widths make sense
        const isValid = Object.keys(parsed).length > 0 && 
          Object.values(parsed).every((v: any) => typeof v === 'number' && v > 0);
        if (isValid) {
          return { ...DEFAULT_COLUMN_WIDTHS, ...parsed };
        }
      }
    } catch (e) {
      console.error('Failed to load incident column widths:', e);
    }
    return DEFAULT_COLUMN_WIDTHS;
  });

  // Check if we have saved widths on mount
  useLayoutEffect(() => {
    if (hasInitialized.current) return;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHasSavedWidths(true);
        hasInitialized.current = true;
        return;
      }
    } catch (e) {
      // Ignore
    }
    
    // No saved widths - calculate auto-fit
    const container = containerRef?.current;
    const containerWidth = container?.clientWidth || window.innerWidth - 300; // Fallback estimate
    
    if (containerWidth > 0) {
      const autoFitWidths = calculateAutoFitWidths(containerWidth, visibleColumns);
      setColumnWidths(prev => ({ ...prev, ...autoFitWidths }));
    }
    
    hasInitialized.current = true;
  }, [containerRef, visibleColumns]);

  const handleColumnResize = useCallback((columnId: string, width: number) => {
    const minWidth = MIN_COLUMN_WIDTHS[columnId] || 40;
    const maxWidth = MAX_COLUMN_WIDTHS[columnId] || 600;
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, width));
    
    setColumnWidths(prev => {
      const newWidths = { ...prev, [columnId]: clampedWidth };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidths));
        setHasSavedWidths(true);
      } catch (e) {
        console.error('Failed to save incident column widths:', e);
      }
      return newWidths;
    });
  }, []);

  const resetColumnWidths = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedWidths(false);
    hasInitialized.current = false;
    
    // Recalculate auto-fit
    const container = containerRef?.current;
    const containerWidth = container?.clientWidth || window.innerWidth - 300;
    
    if (containerWidth > 0) {
      const autoFitWidths = calculateAutoFitWidths(containerWidth, visibleColumns);
      setColumnWidths(autoFitWidths);
    } else {
      setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    }
  }, [containerRef, visibleColumns]);

  // Recalculate on container resize (only if no saved widths)
  const recalculateWidths = useCallback((containerWidth: number) => {
    if (hasSavedWidths) return; // Don't override user's saved widths
    
    const autoFitWidths = calculateAutoFitWidths(containerWidth, visibleColumns);
    setColumnWidths(prev => ({ ...prev, ...autoFitWidths }));
  }, [hasSavedWidths, visibleColumns]);

  return { 
    columnWidths, 
    handleColumnResize, 
    resetColumnWidths,
    recalculateWidths,
    hasSavedWidths,
  };
}
