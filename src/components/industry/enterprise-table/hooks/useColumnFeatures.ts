// ═══════════════════════════════════════════════════════════════════════════
// CATALYST ENTERPRISE TABLE — COLUMN FEATURES HOOK
// Manages column resizing, pinning, visibility, and ordering
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useRef } from 'react';
import type { CatalystColumn } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ColumnPinning {
  left: string[];
  right: string[];
}

export interface UseColumnFeaturesOptions<T> {
  columns: CatalystColumn<T>[];
  defaultVisibility?: Record<string, boolean>;
  defaultOrder?: string[];
  defaultPinning?: ColumnPinning;
  defaultSizing?: Record<string, number>;
  onVisibilityChange?: (visibility: Record<string, boolean>) => void;
  onOrderChange?: (order: string[]) => void;
  onPinningChange?: (pinning: ColumnPinning) => void;
  onSizingChange?: (sizing: Record<string, number>) => void;
}

export interface ColumnFeaturesResult<T> {
  // Visibility
  columnVisibility: Record<string, boolean>;
  setColumnVisibility: (visibility: Record<string, boolean>) => void;
  toggleColumnVisibility: (columnId: string) => void;
  showColumn: (columnId: string) => void;
  hideColumn: (columnId: string) => void;
  showAllColumns: () => void;
  hideAllColumns: () => void;
  getVisibleColumns: () => CatalystColumn<T>[];
  isColumnVisible: (columnId: string) => boolean;
  
  // Ordering
  columnOrder: string[];
  setColumnOrder: (order: string[]) => void;
  moveColumn: (columnId: string, targetIndex: number) => void;
  swapColumns: (fromId: string, toId: string) => void;
  resetColumnOrder: () => void;
  getOrderedColumns: () => CatalystColumn<T>[];
  
  // Pinning
  columnPinning: ColumnPinning;
  setColumnPinning: (pinning: ColumnPinning) => void;
  pinColumn: (columnId: string, position: 'left' | 'right') => void;
  unpinColumn: (columnId: string) => void;
  isPinned: (columnId: string) => 'left' | 'right' | false;
  getPinnedColumns: (position: 'left' | 'right') => CatalystColumn<T>[];
  getUnpinnedColumns: () => CatalystColumn<T>[];
  
  // Sizing
  columnSizing: Record<string, number>;
  setColumnSizing: (sizing: Record<string, number>) => void;
  setColumnWidth: (columnId: string, width: number) => void;
  resetColumnSizing: () => void;
  getColumnWidth: (columnId: string) => number;
  
  // Resize handlers
  startResize: (columnId: string, startX: number) => void;
  onResize: (deltaX: number) => void;
  endResize: () => void;
  isResizing: boolean;
  resizingColumnId: string | null;
  
  // Computed columns
  processedColumns: CatalystColumn<T>[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_COLUMN_WIDTH = 50;
const MAX_COLUMN_WIDTH = 800;
const DEFAULT_COLUMN_WIDTH = 150;

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useColumnFeatures<T>({
  columns,
  defaultVisibility = {},
  defaultOrder,
  defaultPinning = { left: [], right: [] },
  defaultSizing = {},
  onVisibilityChange,
  onOrderChange,
  onPinningChange,
  onSizingChange,
}: UseColumnFeaturesOptions<T>): ColumnFeaturesResult<T> {
  // ─── State ────────────────────────────────────────────────────────────────
  
  const [columnVisibility, setColumnVisibilityState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    columns.forEach(col => {
      initial[col.id] = defaultVisibility[col.id] ?? true;
    });
    return initial;
  });

  const [columnOrder, setColumnOrderState] = useState<string[]>(() => {
    return defaultOrder ?? columns.map(c => c.id);
  });

  const [columnPinning, setColumnPinningState] = useState<ColumnPinning>(defaultPinning);

  const [columnSizing, setColumnSizingState] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    columns.forEach(col => {
      initial[col.id] = defaultSizing[col.id] ?? 
        (typeof col.width === 'number' ? col.width : DEFAULT_COLUMN_WIDTH);
    });
    return initial;
  });

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const resizeStartRef = useRef<{ columnId: string; startX: number; startWidth: number } | null>(null);

  // ─── Visibility Methods ───────────────────────────────────────────────────

  const setColumnVisibility = useCallback((visibility: Record<string, boolean>) => {
    setColumnVisibilityState(visibility);
    onVisibilityChange?.(visibility);
  }, [onVisibilityChange]);

  const toggleColumnVisibility = useCallback((columnId: string) => {
    setColumnVisibilityState(prev => {
      const next = { ...prev, [columnId]: !prev[columnId] };
      onVisibilityChange?.(next);
      return next;
    });
  }, [onVisibilityChange]);

  const showColumn = useCallback((columnId: string) => {
    setColumnVisibilityState(prev => {
      const next = { ...prev, [columnId]: true };
      onVisibilityChange?.(next);
      return next;
    });
  }, [onVisibilityChange]);

  const hideColumn = useCallback((columnId: string) => {
    setColumnVisibilityState(prev => {
      const next = { ...prev, [columnId]: false };
      onVisibilityChange?.(next);
      return next;
    });
  }, [onVisibilityChange]);

  const showAllColumns = useCallback(() => {
    const next: Record<string, boolean> = {};
    columns.forEach(col => { next[col.id] = true; });
    setColumnVisibilityState(next);
    onVisibilityChange?.(next);
  }, [columns, onVisibilityChange]);

  const hideAllColumns = useCallback(() => {
    const next: Record<string, boolean> = {};
    columns.forEach(col => { next[col.id] = false; });
    setColumnVisibilityState(next);
    onVisibilityChange?.(next);
  }, [columns, onVisibilityChange]);

  const getVisibleColumns = useCallback(() => {
    return columns.filter(col => columnVisibility[col.id] !== false);
  }, [columns, columnVisibility]);

  const isColumnVisible = useCallback((columnId: string) => {
    return columnVisibility[columnId] !== false;
  }, [columnVisibility]);

  // ─── Ordering Methods ─────────────────────────────────────────────────────

  const setColumnOrder = useCallback((order: string[]) => {
    setColumnOrderState(order);
    onOrderChange?.(order);
  }, [onOrderChange]);

  const moveColumn = useCallback((columnId: string, targetIndex: number) => {
    setColumnOrderState(prev => {
      const currentIndex = prev.indexOf(columnId);
      if (currentIndex === -1) return prev;
      
      const next = [...prev];
      next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, columnId);
      onOrderChange?.(next);
      return next;
    });
  }, [onOrderChange]);

  const swapColumns = useCallback((fromId: string, toId: string) => {
    setColumnOrderState(prev => {
      const fromIndex = prev.indexOf(fromId);
      const toIndex = prev.indexOf(toId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      
      const next = [...prev];
      next[fromIndex] = toId;
      next[toIndex] = fromId;
      onOrderChange?.(next);
      return next;
    });
  }, [onOrderChange]);

  const resetColumnOrder = useCallback(() => {
    const order = columns.map(c => c.id);
    setColumnOrderState(order);
    onOrderChange?.(order);
  }, [columns, onOrderChange]);

  const getOrderedColumns = useCallback(() => {
    const columnMap = new Map(columns.map(c => [c.id, c]));
    return columnOrder
      .map(id => columnMap.get(id))
      .filter((c): c is CatalystColumn<T> => c !== undefined);
  }, [columns, columnOrder]);

  // ─── Pinning Methods ──────────────────────────────────────────────────────

  const setColumnPinning = useCallback((pinning: ColumnPinning) => {
    setColumnPinningState(pinning);
    onPinningChange?.(pinning);
  }, [onPinningChange]);

  const pinColumn = useCallback((columnId: string, position: 'left' | 'right') => {
    setColumnPinningState(prev => {
      const next = {
        left: prev.left.filter(id => id !== columnId),
        right: prev.right.filter(id => id !== columnId),
      };
      next[position] = [...next[position], columnId];
      onPinningChange?.(next);
      return next;
    });
  }, [onPinningChange]);

  const unpinColumn = useCallback((columnId: string) => {
    setColumnPinningState(prev => {
      const next = {
        left: prev.left.filter(id => id !== columnId),
        right: prev.right.filter(id => id !== columnId),
      };
      onPinningChange?.(next);
      return next;
    });
  }, [onPinningChange]);

  const isPinned = useCallback((columnId: string): 'left' | 'right' | false => {
    if (columnPinning.left.includes(columnId)) return 'left';
    if (columnPinning.right.includes(columnId)) return 'right';
    return false;
  }, [columnPinning]);

  const getPinnedColumns = useCallback((position: 'left' | 'right') => {
    const columnMap = new Map(columns.map(c => [c.id, c]));
    return columnPinning[position]
      .map(id => columnMap.get(id))
      .filter((c): c is CatalystColumn<T> => c !== undefined);
  }, [columns, columnPinning]);

  const getUnpinnedColumns = useCallback(() => {
    const pinnedIds = new Set([...columnPinning.left, ...columnPinning.right]);
    return columns.filter(c => !pinnedIds.has(c.id));
  }, [columns, columnPinning]);

  // ─── Sizing Methods ───────────────────────────────────────────────────────

  const setColumnSizing = useCallback((sizing: Record<string, number>) => {
    setColumnSizingState(sizing);
    onSizingChange?.(sizing);
  }, [onSizingChange]);

  const setColumnWidth = useCallback((columnId: string, width: number) => {
    const clampedWidth = Math.min(Math.max(width, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH);
    setColumnSizingState(prev => {
      const next = { ...prev, [columnId]: clampedWidth };
      onSizingChange?.(next);
      return next;
    });
  }, [onSizingChange]);

  const resetColumnSizing = useCallback(() => {
    const sizing: Record<string, number> = {};
    columns.forEach(col => {
      sizing[col.id] = typeof col.width === 'number' ? col.width : DEFAULT_COLUMN_WIDTH;
    });
    setColumnSizingState(sizing);
    onSizingChange?.(sizing);
  }, [columns, onSizingChange]);

  const getColumnWidth = useCallback((columnId: string): number => {
    return columnSizing[columnId] ?? DEFAULT_COLUMN_WIDTH;
  }, [columnSizing]);

  // ─── Resize Handlers ──────────────────────────────────────────────────────

  const startResize = useCallback((columnId: string, startX: number) => {
    setIsResizing(true);
    setResizingColumnId(columnId);
    resizeStartRef.current = {
      columnId,
      startX,
      startWidth: columnSizing[columnId] ?? DEFAULT_COLUMN_WIDTH,
    };
  }, [columnSizing]);

  const onResize = useCallback((deltaX: number) => {
    if (!resizeStartRef.current) return;
    
    const { columnId, startWidth } = resizeStartRef.current;
    const newWidth = Math.min(
      Math.max(startWidth + deltaX, MIN_COLUMN_WIDTH),
      MAX_COLUMN_WIDTH
    );
    
    setColumnSizingState(prev => ({
      ...prev,
      [columnId]: newWidth,
    }));
  }, []);

  const endResize = useCallback(() => {
    if (resizeStartRef.current && onSizingChange) {
      onSizingChange(columnSizing);
    }
    setIsResizing(false);
    setResizingColumnId(null);
    resizeStartRef.current = null;
  }, [columnSizing, onSizingChange]);

  // ─── Processed Columns ────────────────────────────────────────────────────

  const processedColumns = useMemo(() => {
    const columnMap = new Map(columns.map(c => [c.id, c]));
    const result: CatalystColumn<T>[] = [];
    
    // Add left pinned columns first
    columnPinning.left.forEach(id => {
      const col = columnMap.get(id);
      if (col && columnVisibility[id] !== false) {
        result.push(col);
      }
    });
    
    // Add unpinned columns in order
    const pinnedIds = new Set([...columnPinning.left, ...columnPinning.right]);
    columnOrder.forEach(id => {
      if (!pinnedIds.has(id)) {
        const col = columnMap.get(id);
        if (col && columnVisibility[id] !== false) {
          result.push(col);
        }
      }
    });
    
    // Add right pinned columns last
    columnPinning.right.forEach(id => {
      const col = columnMap.get(id);
      if (col && columnVisibility[id] !== false) {
        result.push(col);
      }
    });
    
    return result;
  }, [columns, columnOrder, columnPinning, columnVisibility]);

  return {
    // Visibility
    columnVisibility,
    setColumnVisibility,
    toggleColumnVisibility,
    showColumn,
    hideColumn,
    showAllColumns,
    hideAllColumns,
    getVisibleColumns,
    isColumnVisible,
    
    // Ordering
    columnOrder,
    setColumnOrder,
    moveColumn,
    swapColumns,
    resetColumnOrder,
    getOrderedColumns,
    
    // Pinning
    columnPinning,
    setColumnPinning,
    pinColumn,
    unpinColumn,
    isPinned,
    getPinnedColumns,
    getUnpinnedColumns,
    
    // Sizing
    columnSizing,
    setColumnSizing,
    setColumnWidth,
    resetColumnSizing,
    getColumnWidth,
    
    // Resize handlers
    startResize,
    onResize,
    endResize,
    isResizing,
    resizingColumnId,
    
    // Computed
    processedColumns,
  };
}
