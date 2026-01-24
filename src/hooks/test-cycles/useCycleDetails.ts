/**
 * Hook for fetching cycle details with calculated stats - WIRED TO SUPABASE
 * Extended Lifecycle: draft → planned → active → paused → completed → archived
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CycleStatus } from '@/features/test-cycles/types/cycle-config';

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
  status: CycleStatus;
  startDate: string | null;
  endDate: string | null;
  environment: string | null;
  createdAt: string;
  createdBy: string | null;
  assigneeCount: number;
  daysRemaining: number | null;
  isOverdue: boolean;
}

// Map DB status to UI status - keep as-is from database
function mapStatus(dbStatus: string | null): CycleStatus {
  const validStatuses: CycleStatus[] = ['draft', 'planned', 'active', 'paused', 'in_progress', 'completed', 'archived'];
  if (dbStatus && validStatuses.includes(dbStatus as CycleStatus)) {
    return dbStatus as CycleStatus;
  }
  return 'draft'; // Default to draft for new/unknown statuses
}

export function useCycleDetails(cycleId: string) {
  const query = useQuery({
    queryKey: ['cycle-details', cycleId],
    queryFn: async (): Promise<{ cycle: TestCycle; stats: CycleStats }> => {
      // Fetch cycle from Supabase
      const { data: cycleData, error: cycleError } = await supabase
        .from('tm_test_cycles')
        .select(`
          *,
          tm_environments(id, name)
        `)
        .eq('id', cycleId)
        .maybeSingle();

      if (cycleError) {
        console.error('Error fetching cycle:', cycleError);
        throw cycleError;
      }

      if (!cycleData) {
        throw new Error('Cycle not found');
      }

      // Get assignee count from scope
      const { count: assigneeCount } = await supabase
        .from('tm_cycle_scope')
        .select('assigned_to', { count: 'exact', head: true })
        .eq('cycle_id', cycleId)
        .not('assigned_to', 'is', null);

      // Calculate days remaining
      let daysRemaining: number | null = null;
      let isOverdue = false;
      if (cycleData.planned_end) {
        const endDate = new Date(cycleData.planned_end);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        isOverdue = daysRemaining < 0 && cycleData.status !== 'completed';
      }

      const cycle: TestCycle = {
        id: cycleData.id,
        name: cycleData.name,
        cycleKey: cycleData.cycle_key,
        description: cycleData.description,
        releaseId: null,
        releaseName: null,
        releaseVersion: null,
        status: mapStatus(cycleData.status),
        startDate: cycleData.planned_start,
        endDate: cycleData.planned_end,
        environment: cycleData.tm_environments?.name || null,
        createdAt: cycleData.created_at,
        createdBy: cycleData.created_by,
        assigneeCount: assigneeCount || 0,
        daysRemaining,
        isOverdue,
      };

      // Calculate stats from cycle data
      const total = cycleData.total_cases || 0;
      const passed = cycleData.passed_count || 0;
      const failed = cycleData.failed_count || 0;
      const blocked = cycleData.blocked_count || 0;
      const skipped = cycleData.skipped_count || 0;
      const notStarted = cycleData.not_run_count || 0;
      const inProgress = total - passed - failed - blocked - skipped - notStarted;

      const executed = passed + failed + blocked;
      const executionRate = total > 0 ? Math.round((executed / total) * 100) : 0;
      const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;

      const stats: CycleStats = {
        total,
        passed,
        failed,
        blocked,
        inProgress: inProgress > 0 ? inProgress : 0,
        notStarted,
        executionRate,
        passRate,
      };

      return { cycle, stats };
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
