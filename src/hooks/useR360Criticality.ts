/**
 * useR360Criticality — TanStack Query hook for role-aware criticality scoring
 * 24h staleTime — does NOT recompute on every render.
 */
import { useQuery } from '@tanstack/react-query';
import { computeCriticalityScore } from '@/services/r360CriticalityService';

export function useR360Criticality(resourceId: string | undefined, roleCode: string | undefined) {
  return useQuery({
    queryKey: ['r360-criticality', resourceId, roleCode],
    queryFn: () => computeCriticalityScore(resourceId!, roleCode!),
    staleTime: 1000 * 60 * 5,   // 5 minutes — allow recomputation after fixes
    gcTime: 1000 * 60 * 60 * 48,
    enabled: !!resourceId && !!roleCode,
    retry: 1,
  });
}
