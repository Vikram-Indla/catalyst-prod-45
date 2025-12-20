/**
 * Hook for managing incident table column widths with localStorage persistence
 * Enterprise-grade auto-fit + manual resize + persist pattern
 * 
 * Features:
 * - Auto-fit: Measures content widths and distributes space on first load
 * - Persist: Saves user's resized widths to localStorage
 * - Restore: On reload, uses saved widths (user's manual layout becomes default)
 * - Stretch: Distributes leftover space to stretchable columns using weights
 * - Single getGridTemplate function for header AND rows alignment
 */
import { useState, useCallback, useRef, useLayoutEffect } from 'react';

const STORAGE_KEY = 'catalyst.release.incidentList.columnWidths.v1';

// Base minimum widths (content + padding allowance)
export const MIN_COLUMN_WIDTHS: Record<string, number> = {
  key: 70,
  summary: 200,
  severity: 60,
  level: 50,
  status: 90,
  assignee: 120,
  age: 50,
  sla: 70,
  releaseVersion: 80,
  major: 60,
  committee: 80,
  actions: 40,
};

// Maximum widths for columns
export const MAX_COLUMN_WIDTHS: Record<string, number> = {
  key: 140,
  summary: 1200,
  severity: 100,
  level: 80,
  status: 160,
  assignee: 280,
  age: 80,
  sla: 120,
  releaseVersion: 180,
  major: 100,
  committee: 160,
  actions: 40,
};

// Stretch weights for distributing leftover space
// Only stretchable columns get extra space
const STRETCH_WEIGHTS: Record<string, number> = {
  summary: 4,
  assignee: 2,
  status: 1,
  releaseVersion: 1,
  committee: 1,
};

// Non-stretchable columns (fixed after content fit)
const NON_STRETCHABLE = ['key', 'severity', 'level', 'age', 'sla', 'major', 'actions'];

// Sensible fallback defaults if we can't measure
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  key: 90,
  summary: 400,
  severity: 70,
  level: 60,
  status: 110,
  assignee: 150,
  age: 60,
  sla: 90,
  releaseVersion: 100,
  major: 70,
  committee: 100,
  actions: 40,
};

// Column order for iteration - EXACT ORDER for header and rows
// KEY, SUMMARY, SEV, LVL, STATUS, ASSIGNEE, AGE, SLA, RELEASE, MAJOR, COMMITTEE, ACTIONS
export const COLUMN_ORDER = [
  'key', 
  'summary', 
  'severity', 
  'level', 
  'status', 
  'assignee', 
  'age', 
  'sla', 
  'releaseVersion', 
  'major', 
  'committee', 
  'actions'
];

// Center-aligned columns (SEV onward - everything except KEY and SUMMARY)
export const CENTER_ALIGNED_COLUMNS = [
  'severity', 
  'level', 
  'status', 
  'assignee', 
  'age', 
  'sla', 
  'releaseVersion', 
  'major', 
  'committee'
];

/**
 * SINGLE SOURCE OF TRUTH: Generate grid template columns string
 * This EXACT string must be used by BOTH header row and data rows
 * 
 * @param columnWidths - Current column widths
 * @param isColumnVisible - Function to check if column is visible
 * @returns CSS gridTemplateColumns string
 */
export function getGridTemplate(
  columnWidths: Record<string, number>,
  isColumnVisible: (colId: string) => boolean
): string {
  const cols: string[] = [];
  
  COLUMN_ORDER.forEach(colId => {
    if (colId === 'actions') {
      // Actions column is always 40px fixed
      cols.push('40px');
    } else if (isColumnVisible(colId)) {
      const width = columnWidths[colId] || DEFAULT_COLUMN_WIDTHS[colId] || 100;
      cols.push(`${width}px`);
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
  
  // Step 3: If totalIdeal < containerWidth, distribute leftover to stretchable columns
  if (totalIdeal < containerWidth) {
    const leftover = containerWidth - totalIdeal;
    
    // Calculate total stretch weight
    let totalWeight = 0;
    visibleColumns.forEach(colId => {
      if (STRETCH_WEIGHTS[colId]) {
        totalWeight += STRETCH_WEIGHTS[colId];
      }
    });
    
    if (totalWeight > 0) {
      // Distribute leftover proportionally
      visibleColumns.forEach(colId => {
        const weight = STRETCH_WEIGHTS[colId] || 0;
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
