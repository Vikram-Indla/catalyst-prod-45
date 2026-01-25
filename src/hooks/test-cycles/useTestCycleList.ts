/**
 * Hook: useTestCycleList
 * 
 * Fetches test cycles with metrics derived from authoritative sources:
 * - tm_cycle_scope (test count)
 * - tm_test_runs (execution metrics)
 * 
 * Uses v_tm_test_cycle_list_metrics view - single source of truth.
 * Does NOT use cached counters from tm_test_cycles.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CycleStatus } from '@/features/test-cycles/types/cycle-config';

// Query key factory for consistent cache invalidation
export const cycleListKeys = {
  all: ['tm-cycle-list'] as const,
  list: (projectId: string | undefined, filters?: CycleListFilters) => 
    [...cycleListKeys.all, projectId, filters] as const,
  summary: (projectId: string | undefined, filters?: CycleListFilters) => 
    [...cycleListKeys.all, 'summary', projectId, filters] as const,
};

export interface CycleListFilters {
  search?: string;
  releaseId?: string;
  status?: string;
  environment?: string;
}

export interface CycleListRow {
  id: string;
  projectId: string;
  cycleKey: string;
  name: string;
  description: string | null;
  status: CycleStatus;
  environment: string | null;
  releaseId: string | null;
  releaseName: string | null;
  assignedTo: string | null;
  assigneeName: string | null;
  assigneeInitials: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  createdAt: string;
  updatedAt: string;
  updatedAtEffective: string;
  
  // Metrics from view (derived from scope + runs)
  testsCount: number;
  runsTotal: number;
  runsPassed: number;
  runsFailed: number;
  runsBlocked: number;
  progressPct: number;
  passRatePct: number | null; // null when no passed+failed
  avgDurationSeconds: number | null;
}

export interface CycleListSummary {
  totalCycles: number;
  inProgressCount: number;
  completedThisMonth: number;
  overallPassRate: number | null;
  avgDurationHours: number;
}

/**
 * useTestCycleList - Fetch cycles with authoritative metrics
 */
export function useTestCycleList(projectId: string | undefined, filters?: CycleListFilters) {
  return useQuery({
    queryKey: cycleListKeys.list(projectId, filters),
    queryFn: async (): Promise<CycleListRow[]> => {
      if (!projectId) return [];

      // Build query on the view
      let query = (supabase as any)
        .from('v_tm_test_cycle_list_metrics')
        .select(`
          *,
          release:releases(id, name),
          assignee:profiles!tm_test_cycles_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('updated_at_effective', { ascending: false });

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.releaseId && filters.releaseId !== 'all') {
        query = query.eq('release_id', filters.releaseId);
      }

      if (filters?.environment && filters.environment !== 'all') {
        query = query.eq('environment', filters.environment);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,cycle_key.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching cycle list:', error);
        throw error;
      }

      return ((data || []) as any[]).map((row): CycleListRow => {
        const assigneeName = row.assignee?.full_name || null;
        const assigneeInitials = assigneeName
          ? assigneeName.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
          : 'UA';

        return {
          id: row.id,
          projectId: row.project_id,
          cycleKey: row.cycle_key,
          name: row.name,
          description: row.description,
          status: row.status || 'planned',
          environment: row.environment,
          releaseId: row.release_id,
          releaseName: row.release?.name || null,
          assignedTo: row.assigned_to,
          assigneeName,
          assigneeInitials,
          plannedStart: row.planned_start,
          plannedEnd: row.planned_end,
          actualStart: row.actual_start,
          actualEnd: row.actual_end,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          updatedAtEffective: row.updated_at_effective,
          
          // Metrics from view
          testsCount: row.tests_count ?? 0,
          runsTotal: row.runs_total ?? 0,
          runsPassed: row.runs_passed ?? 0,
          runsFailed: row.runs_failed ?? 0,
          runsBlocked: row.runs_blocked ?? 0,
          progressPct: row.progress_pct ?? 0,
          passRatePct: row.pass_rate_pct, // null if no passed+failed
          avgDurationSeconds: row.avg_duration_seconds,
        };
      });
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
}

/**
 * useTestCycleListSummary - Compute KPIs from authoritative view
 */
export function useTestCycleListSummary(projectId: string | undefined, filters?: CycleListFilters) {
  return useQuery({
    queryKey: cycleListKeys.summary(projectId, filters),
    queryFn: async (): Promise<CycleListSummary> => {
      if (!projectId) {
        return {
          totalCycles: 0,
          inProgressCount: 0,
          completedThisMonth: 0,
          overallPassRate: null,
          avgDurationHours: 0,
        };
      }

      // Build query on the view with same filters
      let query = (supabase as any)
        .from('v_tm_test_cycle_list_metrics')
        .select(`
          id,
          status,
          actual_end,
          runs_passed,
          runs_failed,
          avg_duration_seconds
        `)
        .eq('project_id', projectId);

      // Apply same filters as list
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.releaseId && filters.releaseId !== 'all') {
        query = query.eq('release_id', filters.releaseId);
      }

      if (filters?.environment && filters.environment !== 'all') {
        query = query.eq('environment', filters.environment);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,cycle_key.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching cycle summary:', error);
        throw error;
      }

      const rows = (data || []) as any[];
      
      // Total cycles (excluding archived)
      const totalCycles = rows.filter(r => r.status !== 'archived').length;
      
      // In progress: active, paused, in_progress
      const inProgressStatuses = ['active', 'paused', 'in_progress'];
      const inProgressCount = rows.filter(r => inProgressStatuses.includes(r.status)).length;
      
      // Completed this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const completedThisMonth = rows.filter(r => {
        if (r.status !== 'completed') return false;
        if (!r.actual_end) return false;
        const endDate = new Date(r.actual_end);
        return endDate >= startOfMonth;
      }).length;
      
      // Overall pass rate (across all filtered cycles)
      const totalPassed = rows.reduce((sum, r) => sum + (r.runs_passed || 0), 0);
      const totalFailed = rows.reduce((sum, r) => sum + (r.runs_failed || 0), 0);
      const overallPassRate = (totalPassed + totalFailed) > 0
        ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100)
        : null;
      
      // Avg duration (from completed cycles with duration data)
      const cyclesWithDuration = rows.filter(r => 
        r.status === 'completed' && r.avg_duration_seconds != null
      );
      const avgDurationHours = cyclesWithDuration.length > 0
        ? Math.round(
            (cyclesWithDuration.reduce((sum, r) => sum + r.avg_duration_seconds, 0) / 
             cyclesWithDuration.length / 3600) * 10
          ) / 10
        : 0;

      return {
        totalCycles,
        inProgressCount,
        completedThisMonth,
        overallPassRate,
        avgDurationHours,
      };
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
}
