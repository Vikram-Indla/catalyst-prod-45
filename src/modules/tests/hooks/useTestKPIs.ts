/**
 * useTestKPIs Hook
 * Fetches comprehensive test metrics with permission gating
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
import { getTestKPIs, getQuickStats, TestKPIs, KPIFilters } from '../api/kpis';

export interface UseTestKPIsResult {
  kpis: TestKPIs | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  hasViewPermission: boolean;
}

/**
 * Hook to fetch test KPIs for a project
 */
export function useTestKPIs(
  projectId: string | null,
  filters: KPIFilters = {}
): UseTestKPIsResult {
  const { user } = useAuth();
  const { hasPermission: hasViewPermission, isLoading: permissionLoading } = usePermission(
    'test_cases',
    'view',
    'program',
    projectId || undefined
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['test-kpis', projectId, filters],
    queryFn: async () => {
      if (!projectId) return null;
      return await getTestKPIs(projectId, filters);
    },
    enabled: !!user && !!projectId && hasViewPermission && !permissionLoading,
    staleTime: 30000, // 30 seconds
  });

  return {
    kpis: data || null,
    isLoading: isLoading || permissionLoading,
    error: error as Error | null,
    refetch,
    hasViewPermission,
  };
}

/**
 * Hook to fetch quick stats for dashboard cards
 */
export function useTestQuickStats(projectId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['test-quick-stats', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      return await getQuickStats(projectId);
    },
    enabled: !!user && !!projectId,
    staleTime: 30000,
  });
}
