/**
 * Hook for fetching cycle details with calculated stats
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CycleStats {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  inProgress: number;
  notStarted: number;
  executionRate: number;
  passRate: number;
}

export interface TestCycle {
  id: string;
  name: string;
  cycleKey: string;
  description: string | null;
  releaseId: string | null;
  releaseName: string | null;
  releaseVersion: string | null;
  cycleType: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: string | null;
  endDate: string | null;
  environment: string | null;
  createdAt: string;
  createdBy: string | null;
  assigneeCount: number;
  daysRemaining: number | null;
  isOverdue: boolean;
}

export function useCycleDetails(cycleId: string) {
  const query = useQuery({
    queryKey: ['cycle-details', cycleId],
    queryFn: async (): Promise<{ cycle: TestCycle; stats: CycleStats }> => {
      // For now, return mock data. Will be replaced with real Supabase query
      // once the tables are created
      
      const mockCycle: TestCycle = {
        id: cycleId,
        name: 'Q1 2024 Regression Cycle',
        cycleKey: 'CY-001',
        description: 'Full regression test cycle for Q1 release',
        releaseId: 'rel-001',
        releaseName: 'Release 2.4.0',
        releaseVersion: '2.4.0',
        cycleType: 'regression',
        status: 'active',
        startDate: '2024-01-10',
        endDate: '2024-01-24',
        environment: 'staging',
        createdAt: '2024-01-08T10:00:00Z',
        createdBy: 'user-001',
        assigneeCount: 5,
        daysRemaining: 6,
        isOverdue: false,
      };

      const mockStats: CycleStats = {
        total: 180,
        passed: 80,
        failed: 15,
        blocked: 5,
        inProgress: 20,
        notStarted: 60,
        executionRate: 67,
        passRate: 80,
      };

      return { cycle: mockCycle, stats: mockStats };
    },
    enabled: !!cycleId,
    staleTime: 30000,
  });

  return {
    cycle: query.data?.cycle,
    stats: query.data?.stats,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
