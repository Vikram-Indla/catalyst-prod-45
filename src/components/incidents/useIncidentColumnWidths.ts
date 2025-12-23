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

const STORAGE_KEY = 'catalyst.release.incidentList.columnWidths.v3';

// EXECUTIVE 6-COLUMN STRUCTURE ONLY
// Fixed columns with explicit pixel widths, Summary takes remaining space
export const COLUMN_WIDTHS: Record<string, string> = {
  key: '100px',
  summary: 'auto',  // Takes remaining space
  severity: '90px',
  status: '120px',
  assignee: '180px',
  sla: '100px',
  actions: '40px',
};

// Minimum widths for resize constraints
export const MIN_COLUMN_WIDTHS: Record<string, number> = {
  key: 80,
  summary: 200,
  severity: 80,
  status: 100,
  assignee: 140,
  sla: 80,
  actions: 40,
};

// Maximum widths for resize constraints
export const MAX_COLUMN_WIDTHS: Record<string, number> = {
  key: 140,
  summary: 1000,
  severity: 110,
  status: 160,
  assignee: 250,
  sla: 120,
  actions: 40,
};

// Default fallback widths (used for grid calculation)
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  key: 100,
  summary: 400,
  severity: 90,
  status: 120,
  assignee: 180,
  sla: 100,
  actions: 40,
};

// Column order - EXECUTIVE 6 columns only
export const COLUMN_ORDER = [
  'key', 
  'summary', 
  'severity', 
  'status', 
  'assignee', 
  'sla',
  'actions'
];

// Center-aligned columns
export const CENTER_ALIGNED_COLUMNS = [
  'severity', 
  'status', 
  'assignee', 
  'sla'
];

// Flexible column weights for distributing remaining space
const FLEXIBLE_WEIGHTS: Record<string, number> = {
  summary: 5,     // Summary gets most of the extra space
  status: 1,
  assignee: 1.5,
  severity: 0.5,
  sla: 0.5,
};

/**
 * SINGLE SOURCE OF TRUTH: Generate grid template columns string
 * Uses table-fixed approach: fixed widths for all columns except summary
 */
export function getGridTemplate(
  columnWidths: Record<string, number>,
  isColumnVisible: (colId: string) => boolean
): string {
  // Executive 6-column structure with fixed widths and summary taking remaining space
  const cols: string[] = [];
  
  COLUMN_ORDER.forEach(colId => {
    if (colId === 'actions') {
      cols.push('40px');
    } else if (colId === 'summary' && isColumnVisible(colId)) {
      // Summary takes all remaining space
      cols.push('1fr');
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
