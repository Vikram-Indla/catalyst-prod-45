import { useEffect, useRef } from 'react';
import { 
  initResourceAllocationOverride, 
  reprocessAllocationGrid 
} from '@/utils/resourceAllocationOverride';

interface UseResourceAllocationOverrideOptions {
  containerSelector?: string;
  enabled?: boolean;
  dependencies?: unknown[];
}

/**
 * React hook to apply Strategy D override to Resource Allocation grid
 * 
 * @example
 * function ResourceAllocationPage() {
 *   useResourceAllocationOverride({ 
 *     containerSelector: '.resource-grid-container',
 *     enabled: true 
 *   });
 *   
 *   return <div className="resource-grid-container">...</div>;
 * }
 */
export function useResourceAllocationOverride({
  containerSelector,
  enabled = true,
  dependencies = [],
}: UseResourceAllocationOverrideOptions = {}) {
  const cleanupRef = useRef<(() => void) | null>(null);

  // Initialize on mount
  useEffect(() => {
    if (!enabled) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      cleanupRef.current = initResourceAllocationOverride(containerSelector);
    }, 50);

    return () => {
      clearTimeout(timer);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [containerSelector, enabled]);

  // Re-process when dependencies change
  useEffect(() => {
    if (!enabled || dependencies.length === 0) return;

    const timer = setTimeout(() => {
      reprocessAllocationGrid(containerSelector);
    }, 100);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  // Return manual reprocess function
  return {
    reprocess: () => reprocessAllocationGrid(containerSelector),
  };
}
