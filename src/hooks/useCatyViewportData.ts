/**
 * Hook for fetching CATY Viewport probing questions data
 */

import { useQuery } from '@tanstack/react-query';
import { fetchViewportData } from '@/lib/caty-viewport-data';
import type { ViewportData } from '@/types/caty-viewport';

export function useCatyViewportData(departmentId: string | null) {
  return useQuery<ViewportData>({
    queryKey: ['caty-viewport', departmentId],
    queryFn: () => fetchViewportData(departmentId),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}
