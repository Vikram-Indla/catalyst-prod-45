/**
 * Hook for fetching cycle details with calculated stats - WIRED TO SUPABASE
 * Extended Lifecycle: draft → planned → active → paused → completed → archived
 * 
 * IMPORTANT: Stats are derived from tm_cycle_scope (source of truth), NOT from cached counters.
 * This ensures data integrity - the UI always reflects actual scope records.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
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
  projectId: string;
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
  const validStatuses: CycleStatus[] = ['draft', 'planned', 'active', 'paused', 'completed', 'archived'];
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

      // =========================================================================
      // DERIVE STATS FROM tm_cycle_scope (SOURCE OF TRUTH)
      // This ensures counts always match actual scope records, not stale counters.
      // =========================================================================
      const { data: scopeData, error: scopeError } = await typedQuery('tm_cycle_scope')
        .select('id, current_status, assigned_to')
        .eq('cycle_id', cycleId);

      if (scopeError) {
        console.error('Error fetching scope:', scopeError);
        throw scopeError;
      }

      const scopeRecords = (scopeData || []) as { id: string; current_status: string | null; assigned_to: string | null }[];

      // Calculate stats from actual scope records
      const total = scopeRecords.length;
      const passed = scopeRecords.filter(s => s.current_status === 'passed').length;
      const failed = scopeRecords.filter(s => s.current_status === 'failed').length;
      const blocked = scopeRecords.filter(s => s.current_status === 'blocked').length;
      const inProgress = scopeRecords.filter(s => s.current_status === 'in_progress').length;
      const skipped = scopeRecords.filter(s => s.current_status === 'skipped').length;
      const notStarted = scopeRecords.filter(s => !s.current_status || s.current_status === 'not_run').length;

      // Get unique assignee count
      const uniqueAssignees = new Set(scopeRecords.filter(s => s.assigned_to).map(s => s.assigned_to));
      const assigneeCount = uniqueAssignees.size;

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
        projectId: cycleData.project_id,
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
        assigneeCount,
        daysRemaining,
        isOverdue,
      };

      // Calculate derived metrics
      const executed = passed + failed + blocked;
      const executionRate = total > 0 ? Math.round((executed / total) * 100) : 0;
      const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;

      const stats: CycleStats = {
        total,
        passed,
        failed,
        blocked,
        inProgress,
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
