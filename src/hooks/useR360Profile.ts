import { useQuery } from '@tanstack/react-query';
import { r360ProfileService } from '@/services/r360ProfileService';

export const R360_CURRENT_WEEK = 9; // W9 — Mar 1–5 2026

export function useR360Resources() {
  return useQuery({
    queryKey: ['r360-profile-resources'],
    queryFn: () => r360ProfileService.getResources(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useR360WeeklyStats(resourceId: string | null, weekOffset = 0) {
  const weekNumber = Math.max(1, R360_CURRENT_WEEK + weekOffset);
  return useQuery({
    queryKey: ['r360-profile-stats', resourceId, weekNumber],
    queryFn: () => r360ProfileService.getWeeklyStats(resourceId!, weekNumber),
    enabled: !!resourceId,
  });
}

export function useR360WorkItems(resourceId: string | null, statusFilter = 'open') {
  return useQuery({
    queryKey: ['r360-profile-work-items', resourceId, statusFilter],
    queryFn: () => r360ProfileService.getWorkItems(resourceId!, statusFilter),
    enabled: !!resourceId,
  });
}

export function useR360ClosureTrend(resourceId: string | null) {
  return useQuery({
    queryKey: ['r360-profile-trend', resourceId],
    queryFn: () => r360ProfileService.getClosureTrend(resourceId!),
    enabled: !!resourceId,
  });
}
