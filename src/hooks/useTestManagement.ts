/**
 * Test Management Data Hooks
 * React Query hooks for fetching TM data from Supabase
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  TMDashboardKPIs,
  TMCycleSummary,
  TMActivityItem,
  TMMyWorkItem,
  CycleStatus,
  CaseStatus,
} from '@/types/test-management';
import { getCaseStatusColor } from '@/types/test-management';

// ============================================================
// QUERY KEYS
// ============================================================
export const TM_QUERY_KEYS = {
  dashboardKPIs: ['tm-dashboard-kpis'] as const,
  activeCycles: ['tm-active-cycles'] as const,
  activityFeed: (limit: number) => ['tm-activity-feed', limit] as const,
  myWork: ['tm-my-work'] as const,
};

// Map database status to frontend status
function mapCaseStatus(dbStatus: string): CaseStatus {
  const statusMap: Record<string, CaseStatus> = {
    draft: 'DRAFT',
    ready: 'REVIEW',
    approved: 'APPROVED',
    deprecated: 'DEPRECATED',
  };
  return statusMap[dbStatus] ?? 'DRAFT';
}

function mapCycleStatus(dbStatus: string): CycleStatus {
  const statusMap: Record<string, CycleStatus> = {
    planned: 'PLANNED',
    in_progress: 'IN_PROGRESS',
    completed: 'COMPLETED',
    archived: 'CANCELLED',
  };
  return statusMap[dbStatus] ?? 'PLANNED';
}

// ============================================================
// DASHBOARD KPIs HOOK
// ============================================================
export function useTMDashboardKPIs() {
  return useQuery({
    queryKey: TM_QUERY_KEYS.dashboardKPIs,
    queryFn: async (): Promise<TMDashboardKPIs> => {
      console.log('[TM] Fetching dashboard KPIs...');
      
      // Parallel queries for performance
      const [casesResult, scopeResult, defectsResult] = await Promise.all([
        supabase.from('tm_test_cases').select('id, status'),
        supabase.from('tm_cycle_scope').select('id, current_status'),
        supabase.from('tm_defects').select('id, status, severity'),
      ]);

      console.log('[TM] Cases result:', casesResult);
      console.log('[TM] Scope result:', scopeResult);
      console.log('[TM] Defects result:', defectsResult);

      if (casesResult.error) {
        console.error('[TM] Cases query error:', casesResult.error);
        throw new Error(`Failed to fetch cases: ${casesResult.error.message}`);
      }
      if (scopeResult.error) {
        console.error('[TM] Scope query error:', scopeResult.error);
        throw new Error(`Failed to fetch scope: ${scopeResult.error.message}`);
      }
      if (defectsResult.error) {
        console.error('[TM] Defects query error:', defectsResult.error);
        throw new Error(`Failed to fetch defects: ${defectsResult.error.message}`);
      }

      const cases = casesResult.data ?? [];
      const scope = scopeResult.data ?? [];
      const defects = defectsResult.data ?? [];

      // Calculate scope metrics
      const notRun = scope.filter(s => s.current_status === 'not_run').length;
      const inProgress = scope.filter(s => s.current_status === 'in_progress').length;
      const passed = scope.filter(s => s.current_status === 'passed').length;
      const failed = scope.filter(s => s.current_status === 'failed').length;
      const blocked = scope.filter(s => s.current_status === 'blocked').length;
      const executed = passed + failed + blocked;

      // Calculate defect metrics
      const openDefects = defects.filter(d => ['open', 'in_progress', 'reopened'].includes(d.status));
      const criticalDefects = openDefects.filter(d => d.severity === 'critical').length;
      const majorDefects = openDefects.filter(d => d.severity === 'major').length;
      const minorDefects = openDefects.filter(d => ['minor', 'trivial'].includes(d.severity)).length;

      // Calculate pass rate
      const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;

      const kpis: TMDashboardKPIs = {
        totalAssigned: cases.length,
        notRun,
        inProgress,
        passedToday: passed,
        failedToday: failed,
        coverage: 78, // TODO: Calculate from requirements
        coverageGaps: 12,
        passRate,
        passRateTrend: 3,
        openDefects: openDefects.length,
        criticalDefects,
        majorDefects,
        minorDefects,
        blockers: blocked,
      };

      console.log('[TM] Calculated KPIs:', kpis);
      return kpis;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// ============================================================
// ACTIVE CYCLES HOOK
// ============================================================
export function useTMActiveCycles() {
  return useQuery({
    queryKey: TM_QUERY_KEYS.activeCycles,
    queryFn: async (): Promise<TMCycleSummary[]> => {
      console.log('[TM] Fetching active cycles...');
      
      const { data: cycles, error } = await supabase
        .from('tm_test_cycles')
        .select('*')
        .in('status', ['planned', 'in_progress'])
        .order('planned_end', { ascending: true, nullsFirst: false })
        .limit(5);

      if (error) {
        console.error('[TM] Cycles query error:', error);
        throw new Error(`Failed to fetch cycles: ${error.message}`);
      }

      console.log('[TM] Cycles data:', cycles);

      if (!cycles || cycles.length === 0) return [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return cycles.map((cycle): TMCycleSummary => {
        const total = cycle.total_cases || 0;
        const passed = cycle.passed_count || 0;
        const failed = cycle.failed_count || 0;
        const blocked = cycle.blocked_count || 0;
        const notRun = cycle.not_run_count || 0;
        const inProgress = Math.max(0, total - passed - failed - blocked - notRun);
        const executed = passed + failed + blocked;

        let daysLeft: number | null = null;
        let isOverdue = false;
        if (cycle.planned_end) {
          const endDate = new Date(cycle.planned_end);
          endDate.setHours(0, 0, 0, 0);
          daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          isOverdue = daysLeft < 0;
        }

        return {
          id: cycle.id,
          key: cycle.cycle_key,
          name: cycle.name,
          status: mapCycleStatus(cycle.status),
          daysLeft,
          isOverdue,
          progress: { total, passed, failed, blocked, inProgress, notRun },
          percentage: total > 0 ? Math.round((executed / total) * 100) : 0,
        };
      });
    },
    staleTime: 30 * 1000,
    retry: 2,
  });
}

// ============================================================
// ACTIVITY FEED HOOK
// ============================================================
export function useTMActivityFeed(limit: number = 10) {
  return useQuery({
    queryKey: TM_QUERY_KEYS.activityFeed(limit),
    queryFn: async (): Promise<TMActivityItem[]> => {
      console.log('[TM] Fetching activity feed...');
      
      const { data, error } = await supabase
        .from('tm_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[TM] Activity query error:', error);
        throw new Error(`Failed to fetch activity: ${error.message}`);
      }

      console.log('[TM] Activity data:', data);

      const now = new Date();
      return (data ?? []).map((row, index): TMActivityItem => ({
        id: row.id,
        userName: row.user_name,
        userAvatar: null,
        actionType: row.action_type,
        entityType: row.entity_type,
        entityKey: row.entity_key,
        entityTitle: row.entity_title,
        createdAt: row.created_at,
        isLive: index === 0 && (now.getTime() - new Date(row.created_at).getTime()) < 60000,
      }));
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    retry: 2,
  });
}

// ============================================================
// MY WORK HOOK
// ============================================================
export function useTMMyWork() {
  return useQuery({
    queryKey: TM_QUERY_KEYS.myWork,
    queryFn: async (): Promise<TMMyWorkItem[]> => {
      console.log('[TM] Fetching my work...');
      
      const { data, error } = await supabase
        .from('tm_test_cases')
        .select('id, case_key, title, status, priority_id, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[TM] My work query error:', error);
        throw new Error(`Failed to fetch work: ${error.message}`);
      }

      console.log('[TM] My work data:', data);

      return (data ?? []).map((row): TMMyWorkItem => {
        const mappedStatus = mapCaseStatus(row.status);
        return {
          id: row.id,
          key: row.case_key,
          title: row.title,
          status: mappedStatus,
          statusColor: getCaseStatusColor(mappedStatus),
          priority: row.priority_id,
          cycleKey: null,
          updatedAt: row.updated_at,
        };
      });
    },
    staleTime: 60 * 1000,
    retry: 2,
  });
}

// ============================================================
// REFRESH UTILITY
// ============================================================
export function useTMRefresh() {
  const queryClient = useQueryClient();

  const refreshAll = () => {
    console.log('[TM] Refreshing all data...');
    queryClient.invalidateQueries({ queryKey: ['tm-dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['tm-active-cycles'] });
    queryClient.invalidateQueries({ queryKey: ['tm-activity-feed'] });
    queryClient.invalidateQueries({ queryKey: ['tm-my-work'] });
    toast.success('Dashboard refreshed');
  };

  return { refreshAll };
}
