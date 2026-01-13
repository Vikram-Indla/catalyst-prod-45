/**
 * Virtualized Evidence Hook
 * TC-261 to TC-280: Virtual scrolling for large evidence lists
 */

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useCallback, useMemo } from 'react';
import type { Evidence } from '../types';

interface UseVirtualizedEvidenceOptions {
  evidence: Evidence[];
  itemHeight?: number;
  overscan?: number;
}

export function useVirtualizedEvidence({
  evidence,
  itemHeight = 200,
  overscan = 5
}: UseVirtualizedEvidenceOptions) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: evidence.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  const totalSize = virtualizer.getTotalSize();

  const scrollToIndex = useCallback((index: number) => {
    virtualizer.scrollToIndex(index, { align: 'center' });
  }, [virtualizer]);

  const scrollToTop = useCallback(() => {
    virtualizer.scrollToOffset(0);
  }, [virtualizer]);

  const visibleRange = useMemo(() => {
    if (virtualItems.length === 0) return { start: 0, end: 0 };
    return {
      start: virtualItems[0].index,
      end: virtualItems[virtualItems.length - 1].index
    };
  }, [virtualItems]);

  return {
    parentRef,
    virtualItems,
    totalSize,
    scrollToIndex,
    scrollToTop,
    visibleRange,
    isVirtualized: evidence.length > 50
  };
}
