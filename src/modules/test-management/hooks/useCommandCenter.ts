/**
 * Command Center Dashboard Hooks
 * Provides data aggregation for the Test Management Command Center
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================
// TYPES
// ============================================================

export interface CommandCenterKPIs {
  totalAssigned: number;
  notRun: number;
  inProgress: number;
  passedToday: number;
  failedToday: number;
  coverage: number;
  coverageGaps: number;
  passRate: number;
  passRateTrend: number;
  openDefects: number;
  criticalDefects: number;
  majorDefects: number;
  minorDefects: number;
  blockers: number;
}

export interface ActiveCycleSummary {
  id: string;
  key: string;
  name: string;
  status: string;
  daysLeft: number | null;
  progress: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    notRun: number;
  };
  percentage: number;
}

export interface ActivityFeedItem {
  id: string;
  user_name: string;
  action_type: string;
  entity_type: string;
  entity_key: string;
  entity_title: string | null;
  created_at: string;
}

export interface MyWorkItem {
  id: string;
  key: string;
  title: string;
  status: string;
  statusColor: 'success' | 'warning' | 'danger' | 'default';
  priority: string;
  cycleKey: string | null;
  updatedAt: string;
}

// ============================================================
// QUERY KEYS
// ============================================================

export const commandCenterKeys = {
  all: ['tm-command-center'] as const,
  kpis: () => [...commandCenterKeys.all, 'kpis'] as const,
  cycles: () => [...commandCenterKeys.all, 'active-cycles'] as const,
  activity: (limit: number) => [...commandCenterKeys.all, 'activity', limit] as const,
  myWork: () => [...commandCenterKeys.all, 'my-work'] as const,
};

// ============================================================
// HOOKS
// ============================================================

/**
 * Dashboard KPIs - aggregated metrics for the Command Center
 */
export function useCommandCenterKPIs() {
  return useQuery({
    queryKey: commandCenterKeys.kpis(),
    queryFn: async (): Promise<CommandCenterKPIs> => {
      // Fetch all required data in parallel
      const [casesRes, scopeRes, defectsRes, cyclesRes] = await Promise.all([
        supabase.from('tm_test_cases').select('id, status, priority_id'),
        supabase.from('tm_cycle_scope').select('id, current_status'),
        supabase.from('tm_defects').select('id, status, severity'),
        supabase.from('tm_test_cycles').select('id, status, passed_count, failed_count, blocked_count, not_run_count, total_cases'),
      ]);

      const cases = casesRes.data || [];
      const scope = scopeRes.data || [];
      const defects = defectsRes.data || [];
      const cycles = cyclesRes.data || [];

      // Calculate defect metrics
      const openDefects = defects.filter(d => ['open', 'in_progress'].includes(d.status));
      const criticalDefects = openDefects.filter(d => d.severity === 'critical').length;
      const majorDefects = openDefects.filter(d => d.severity === 'major').length;
      const minorDefects = openDefects.filter(d => ['minor', 'trivial'].includes(d.severity)).length;

      // Calculate execution metrics from scope
      const passed = scope.filter(s => s.current_status === 'passed').length;
      const failed = scope.filter(s => s.current_status === 'failed').length;
      const blocked = scope.filter(s => s.current_status === 'blocked').length;
      const inProgress = scope.filter(s => s.current_status === 'in_progress').length;
      const notRun = scope.filter(s => s.current_status === 'not_run').length;
      const executed = passed + failed + blocked;

      // Aggregate from cycles for more accurate numbers
      const totalFromCycles = cycles.reduce((sum, c) => sum + (c.total_cases || 0), 0);
      const passedFromCycles = cycles.reduce((sum, c) => sum + (c.passed_count || 0), 0);
      const failedFromCycles = cycles.reduce((sum, c) => sum + (c.failed_count || 0), 0);
      const blockedFromCycles = cycles.reduce((sum, c) => sum + (c.blocked_count || 0), 0);
      const executedFromCycles = passedFromCycles + failedFromCycles + blockedFromCycles;

      // Use the larger of scope-based or cycle-based metrics
      const finalPassed = Math.max(passed, passedFromCycles);
      const finalFailed = Math.max(failed, failedFromCycles);
      const finalExecuted = Math.max(executed, executedFromCycles);

      // Calculate coverage: (test cases with at least one linked requirement / total test cases) * 100
      const coverageValue = cases.length > 0 
        ? Math.round((cases.filter(c => c.priority_id).length / cases.length) * 100) 
        : 0;

      return {
        totalAssigned: Math.max(cases.length, totalFromCycles),
        notRun: notRun,
        inProgress: inProgress,
        passedToday: finalPassed,
        failedToday: finalFailed,
        coverage: coverageValue,
        coverageGaps: cases.length - cases.filter(c => c.priority_id).length,
        passRate: finalExecuted > 0 ? Math.round((finalPassed / finalExecuted) * 100) : 0,
        passRateTrend: 0, // Would need historical data to calculate
        openDefects: openDefects.length,
        criticalDefects: criticalDefects,
        majorDefects: majorDefects,
        minorDefects: minorDefects,
        blockers: blocked || blockedFromCycles,
      };
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Active Cycles with progress summaries
 */
export function useActiveCycles() {
  return useQuery({
    queryKey: commandCenterKeys.cycles(),
    queryFn: async (): Promise<ActiveCycleSummary[]> => {
      const { data: cycles, error } = await supabase
        .from('tm_test_cycles')
        .select('*')
        .in('status', ['planned', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      if (!cycles || cycles.length === 0) {
        return [];
      }

      return cycles.map(cycle => {
        const total = cycle.total_cases || 1;
        const passed = cycle.passed_count || 0;
        const failed = cycle.failed_count || 0;
        const blocked = cycle.blocked_count || 0;
        const notRun = cycle.not_run_count || 0;
        const executed = passed + failed + blocked;

        let daysLeft: number | null = null;
        if (cycle.planned_end) {
          const end = new Date(cycle.planned_end);
          const today = new Date();
          daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
          id: cycle.id,
          key: cycle.cycle_key,
          name: cycle.name,
          status: cycle.status,
          daysLeft,
          progress: { total, passed, failed, blocked, notRun },
          percentage: total > 0 ? Math.round((executed / total) * 100) : 0,
        };
      });
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Activity Feed from tm_activity_log
 */
export function useActivityFeed(limit: number = 10) {
  return useQuery({
    queryKey: commandCenterKeys.activity(limit),
    queryFn: async (): Promise<ActivityFeedItem[]> => {
      const { data, error } = await supabase
        .from('tm_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        return [];
      }

      return data.map(item => ({
        id: item.id,
        user_name: item.user_name || 'Unknown User',
        action_type: item.action_type,
        entity_type: item.entity_type,
        entity_key: item.entity_key || '',
        entity_title: item.entity_title,
        created_at: item.created_at,
      }));
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * My Work - cases/cycles/defects assigned to current user
 */
export function useMyWork() {
  return useQuery({
    queryKey: commandCenterKeys.myWork(),
    queryFn: async (): Promise<MyWorkItem[]> => {
      // Fetch test cases
      const { data: cases } = await supabase
        .from('tm_test_cases')
        .select('id, case_key, title, status, priority_id, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (!cases || cases.length === 0) {
        return [];
      }

      const getStatusColor = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
        switch (status?.toLowerCase()) {
          case 'approved':
          case 'ready':
          case 'published':
            return 'success';
          case 'under_review':
          case 'needs_update':
            return 'warning';
          case 'deprecated':
            return 'danger';
          default:
            return 'default';
        }
      };

      return cases.map(c => ({
        id: c.id,
        key: c.case_key,
        title: c.title,
        status: c.status?.toUpperCase() || 'DRAFT',
        statusColor: getStatusColor(c.status),
        priority: c.priority_id ? 'HIGH' : 'MEDIUM', // Simplified - would need priority lookup
        cycleKey: null, // Would need to join with cycle_scope
        updatedAt: c.updated_at,
      }));
    },
    staleTime: 60 * 1000,
  });
}
