// ═══════════════════════════════════════════════════════════════════════════
// CATALYST ENTERPRISE TABLE — VIRTUALIZATION HOOK
// Uses TanStack Virtual for high-performance row virtualization
// ═══════════════════════════════════════════════════════════════════════════

import { useRef, useMemo, useCallback } from 'react';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UseVirtualizationOptions<T> {
  data: T[];
  enabled?: boolean;
  rowHeight?: number | ((index: number) => number);
  overscan?: number;
  estimateSize?: number;
  scrollMargin?: number;
  getItemKey?: (index: number) => string | number;
}

export interface VirtualizationResult<T> {
  containerRef: React.RefObject<HTMLDivElement>;
  virtualRows: VirtualItem[];
  totalSize: number;
  measureElement: (el: HTMLElement | null) => void;
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }) => void;
  scrollToOffset: (offset: number) => void;
  isScrolling: boolean;
  getVirtualItems: () => VirtualItem[];
  getRowData: (virtualRow: VirtualItem) => T | undefined;
  paddingTop: number;
  paddingBottom: number;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useVirtualization<T extends { id: string }>({
  data,
  enabled = true,
  rowHeight = 48,
  overscan = 5,
  estimateSize = 48,
  scrollMargin = 0,
  getItemKey,
}: UseVirtualizationOptions<T>): VirtualizationResult<T> {
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize the size estimator
  const estimateSizeFn = useMemo(() => {
    if (typeof rowHeight === 'function') {
      return rowHeight;
    }
    return () => rowHeight;
  }, [rowHeight]);

  // Memoize key getter
  const getKey = useMemo(() => {
    if (getItemKey) return getItemKey;
    return (index: number) => data[index]?.id ?? index;
  }, [getItemKey, data]);

  // Initialize virtualizer
  const virtualizer = useVirtualizer({
    count: enabled ? data.length : 0,
    getScrollElement: () => containerRef.current,
    estimateSize: estimateSizeFn,
    overscan,
    scrollMargin,
    getItemKey: getKey,
  });

  // Get virtual items
  const virtualRows = virtualizer.getVirtualItems();

  // Calculate padding for virtual scroll area
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start ?? 0 : 0;
  const paddingBottom = virtualRows.length > 0
    ? virtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1]?.end ?? 0)
    : 0;

  // Helper to get row data from virtual item
  const getRowData = useCallback(
    (virtualRow: VirtualItem): T | undefined => data[virtualRow.index],
    [data]
  );

  // Scroll to specific index
  const scrollToIndex = useCallback(
    (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }) => {
      virtualizer.scrollToIndex(index, options);
    },
    [virtualizer]
  );

  // Scroll to specific offset
  const scrollToOffset = useCallback(
    (offset: number) => {
      virtualizer.scrollToOffset(offset);
    },
    [virtualizer]
  );

  return {
    containerRef,
    virtualRows,
    totalSize: virtualizer.getTotalSize(),
    measureElement: virtualizer.measureElement,
    scrollToIndex,
    scrollToOffset,
    isScrolling: virtualizer.isScrolling,
    getVirtualItems: () => virtualizer.getVirtualItems(),
    getRowData,
    paddingTop,
    paddingBottom,
  };
}

// ─── Helper Hook for Dynamic Row Heights ────────────────────────────────────

export function useDynamicRowHeight<T extends { id: string }>(
  data: T[],
  getRowHeight: (row: T) => number
) {
  const heightsRef = useRef<Map<string, number>>(new Map());

  const measureRow = useCallback(
    (rowId: string, element: HTMLElement | null) => {
      if (element) {
        const height = element.getBoundingClientRect().height;
        heightsRef.current.set(rowId, height);
      }
    },
    []
  );

  const getHeight = useCallback(
    (index: number) => {
      const row = data[index];
      if (!row) return 48; // Default height
      
      // Check measured height first
      const measured = heightsRef.current.get(row.id);
      if (measured) return measured;
      
      // Fall back to calculated height
      return getRowHeight(row);
    },
    [data, getRowHeight]
  );

  return { measureRow, getHeight };
}

// ─── Virtual Table Body Component Props ─────────────────────────────────────

export interface VirtualTableBodyProps<T> {
  virtualization: VirtualizationResult<T>;
  renderRow: (row: T, index: number, virtualRow: VirtualItem) => React.ReactNode;
  className?: string;
}
