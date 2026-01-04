// ============================================================================
// HOOK: useReports
// File: /hooks/test-management/useReports.ts
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ReportSummary, 
  ExecutionTrend, 
  TesterPerformance,
  DefectSeverity,
  DefectStatus
} from '@/types/test-management';

// Status mappings from DB (lowercase) to app (uppercase)
const execStatusFromDb = (status: string | null): string => {
  const map: Record<string, string> = {
    'not_run': 'NOT_RUN',
    'in_progress': 'IN_PROGRESS',
    'passed': 'PASSED',
    'failed': 'FAILED',
    'blocked': 'BLOCKED',
    'skipped': 'SKIPPED',
  };
  return map[status || 'not_run'] || 'NOT_RUN';
};

const defectStatusFromDb = (status: string | null): DefectStatus => {
  const map: Record<string, DefectStatus> = {
    'open': 'OPEN',
    'in_progress': 'IN_PROGRESS',
    'resolved': 'FIXED',
    'closed': 'CLOSED',
    'reopened': 'OPEN',
  };
  return map[status || 'open'] || 'OPEN';
};

const defectSeverityFromDb = (severity: string | null): DefectSeverity => {
  return (severity?.toUpperCase() || 'MINOR') as DefectSeverity;
};

// ============================================================================
// REPORT SUMMARY (Dashboard)
// ============================================================================

export function useReportSummary(
  projectId: string | undefined, 
  dateRange?: { from?: string; to?: string }
) {
  return useQuery({
    queryKey: ['tm-report-summary', projectId, dateRange],
    queryFn: async (): Promise<ReportSummary> => {
      if (!projectId) {
        return getEmptyReportSummary();
      }

      // Get test cases count
      const { count: totalCases } = await supabase
        .from('tm_test_cases')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // Get cycles count
      const { count: totalCycles } = await supabase
        .from('tm_test_cycles')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // Get runs - need to join through cycle_scope
      const { data: scopeItems } = await supabase
        .from('tm_cycle_scope')
        .select('id, cycle:tm_test_cycles!inner(project_id)')
        .eq('cycle.project_id', projectId);

      let runs: Array<{ status: string | null; started_at: string | null }> = [];
      
      if (scopeItems && scopeItems.length > 0) {
        const scopeIds = scopeItems.map(s => s.id);
        
        let runsQuery = supabase
          .from('tm_test_runs')
          .select('status, started_at')
          .in('cycle_scope_id', scopeIds);

        if (dateRange?.from) {
          runsQuery = runsQuery.gte('started_at', dateRange.from);
        }
        if (dateRange?.to) {
          runsQuery = runsQuery.lte('started_at', dateRange.to);
        }

        const { data: runsData } = await runsQuery;
        runs = runsData || [];
      }

      // Get defects
      let defectsQuery = supabase
        .from('tm_defects')
        .select('status, severity')
        .eq('project_id', projectId);

      if (dateRange?.from) {
        defectsQuery = defectsQuery.gte('created_at', dateRange.from);
      }
      if (dateRange?.to) {
        defectsQuery = defectsQuery.lte('created_at', dateRange.to);
      }

      const { data: defects } = await defectsQuery;

      // Calculate run stats
      const runStats = {
        total: runs.length,
        passed: 0,
        failed: 0,
        blocked: 0,
        not_run: 0,
      };

      runs.forEach(r => {
        const status = execStatusFromDb(r.status);
        if (status === 'PASSED') runStats.passed++;
        else if (status === 'FAILED') runStats.failed++;
        else if (status === 'BLOCKED') runStats.blocked++;
        else runStats.not_run++;
      });

      // Calculate defect stats
      const defectsByStatus: Record<DefectStatus, number> = {
        OPEN: 0,
        IN_PROGRESS: 0,
        FIXED: 0,
        VERIFIED: 0,
        CLOSED: 0,
        WONT_FIX: 0,
        DUPLICATE: 0,
      };

      const defectsBySeverity: Record<DefectSeverity, number> = {
        CRITICAL: 0,
        MAJOR: 0,
        MINOR: 0,
        TRIVIAL: 0,
      };

      defects?.forEach(d => {
        const status = defectStatusFromDb(d.status);
        const severity = defectSeverityFromDb(d.severity);
        defectsByStatus[status]++;
        defectsBySeverity[severity]++;
      });

      return {
        total_cases: totalCases || 0,
        total_cycles: totalCycles || 0,
        total_runs: runStats.total,
        total_defects: defects?.length || 0,
        passed_count: runStats.passed,
        failed_count: runStats.failed,
        blocked_count: runStats.blocked,
        not_run_count: runStats.not_run,
        pass_rate: runStats.total > 0 
          ? Math.round((runStats.passed / runStats.total) * 100) 
          : 0,
        defects_by_severity: defectsBySeverity,
        defects_by_status: defectsByStatus,
      };
    },
    enabled: !!projectId,
  });
}

function getEmptyReportSummary(): ReportSummary {
  return {
    total_cases: 0,
    total_cycles: 0,
    total_runs: 0,
    total_defects: 0,
    passed_count: 0,
    failed_count: 0,
    blocked_count: 0,
    not_run_count: 0,
    pass_rate: 0,
    defects_by_severity: { CRITICAL: 0, MAJOR: 0, MINOR: 0, TRIVIAL: 0 },
    defects_by_status: { 
      OPEN: 0, IN_PROGRESS: 0, FIXED: 0, VERIFIED: 0, 
      CLOSED: 0, WONT_FIX: 0, DUPLICATE: 0 
    },
  };
}

// ============================================================================
// EXECUTION TREND (Line Chart Data)
// ============================================================================

export function useExecutionTrend(
  projectId: string | undefined,
  dateRange?: { from?: string; to?: string },
  cycleId?: string
) {
  return useQuery({
    queryKey: ['tm-execution-trend', projectId, dateRange, cycleId],
    queryFn: async (): Promise<ExecutionTrend[]> => {
      if (!projectId) return [];

      // Get scope items for filtering
      let scopeQuery = supabase
        .from('tm_cycle_scope')
        .select('id, cycle:tm_test_cycles!inner(id, project_id)')
        .eq('cycle.project_id', projectId);

      if (cycleId) {
        scopeQuery = scopeQuery.eq('cycle_id', cycleId);
      }

      const { data: scopeItems } = await scopeQuery;
      
      if (!scopeItems || scopeItems.length === 0) return [];

      const scopeIds = scopeItems.map(s => s.id);

      let query = supabase
        .from('tm_test_runs')
        .select('status, started_at')
        .in('cycle_scope_id', scopeIds)
        .not('started_at', 'is', null)
        .order('started_at', { ascending: true });

      if (dateRange?.from) {
        query = query.gte('started_at', dateRange.from);
      }
      if (dateRange?.to) {
        query = query.lte('started_at', dateRange.to);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by date
      const byDate = new Map<string, ExecutionTrend>();

      data?.forEach(run => {
        if (!run.started_at) return;
        const date = run.started_at.split('T')[0]; // YYYY-MM-DD
        
        if (!byDate.has(date)) {
          byDate.set(date, { date, passed: 0, failed: 0, blocked: 0, total: 0 });
        }

        const entry = byDate.get(date)!;
        entry.total++;
        
        const status = execStatusFromDb(run.status);
        if (status === 'PASSED') entry.passed++;
        else if (status === 'FAILED') entry.failed++;
        else if (status === 'BLOCKED') entry.blocked++;
      });

      return Array.from(byDate.values());
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// EXECUTION REPORT (By Cycle)
// ============================================================================

export function useExecutionReport(projectId: string | undefined, cycleId?: string) {
  return useQuery({
    queryKey: ['tm-execution-report', projectId, cycleId],
    queryFn: async () => {
      if (!projectId) return { cycles: [], runs: [] };

      // Get cycles - use v_tm_cycle_progress view for stats
      let cyclesQuery = supabase
        .from('v_tm_cycle_progress')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (cycleId) {
        cyclesQuery = cyclesQuery.eq('id', cycleId);
      }

      const { data: cycles } = await cyclesQuery;

      // Get recent runs through scope items
      const scopeIds: string[] = [];
      if (cycleId) {
        const { data: scopeItems } = await supabase
          .from('tm_cycle_scope')
          .select('id')
          .eq('cycle_id', cycleId);
        scopeIds.push(...(scopeItems?.map(s => s.id) || []));
      }

      let runsQuery = supabase
        .from('tm_test_runs')
        .select(`
          *,
          cycle_scope:tm_cycle_scope(
            id, cycle_id,
            test_case:tm_test_cases(id, case_key, title),
            cycle:tm_test_cycles(id, cycle_key, name)
          ),
          executor:profiles(id, full_name)
        `)
        .order('started_at', { ascending: false })
        .limit(50);

      if (scopeIds.length > 0) {
        runsQuery = runsQuery.in('cycle_scope_id', scopeIds);
      }

      const { data: runs } = await runsQuery;

      // Process cycles
      const processedCycles = (cycles || []).map(cycle => ({
        id: cycle.id,
        key: cycle.cycle_key,
        name: cycle.name,
        status: cycle.status,
        total: cycle.total_cases || 0,
        passed: cycle.passed_count || 0,
        failed: cycle.failed_count || 0,
        blocked: cycle.blocked_count || 0,
        not_run: cycle.not_run_count || 0,
        progress: cycle.total_cases > 0 
          ? Math.round(((cycle.passed_count + cycle.failed_count + cycle.blocked_count) / cycle.total_cases) * 100)
          : 0,
        pass_rate: cycle.total_cases > 0
          ? Math.round((cycle.passed_count / cycle.total_cases) * 100)
          : 0,
      }));

      // Process runs
      const processedRuns = (runs || []).map(run => ({
        ...run,
        status: execStatusFromDb(run.status),
        test_case: run.cycle_scope?.test_case ? {
          id: run.cycle_scope.test_case.id,
          key: run.cycle_scope.test_case.case_key,
          title: run.cycle_scope.test_case.title,
        } : undefined,
        cycle: run.cycle_scope?.cycle ? {
          id: run.cycle_scope.cycle.id,
          key: run.cycle_scope.cycle.cycle_key,
          name: run.cycle_scope.cycle.name,
        } : undefined,
      }));

      return {
        cycles: processedCycles,
        runs: processedRuns,
      };
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// TRACEABILITY MATRIX
// ============================================================================

export function useTraceabilityMatrix(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-traceability', projectId],
    queryFn: async () => {
      if (!projectId) return { folders: [], coverage: 0 };

      // Use the traceability summary view if available
      const { data: summary } = await supabase
        .from('v_tm_traceability_summary')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      // Get folders with case counts
      const { data: folders } = await supabase
        .from('tm_folders')
        .select('id, name, path')
        .eq('project_id', projectId)
        .order('path', { ascending: true });

      // Get cases grouped by folder
      const { data: cases } = await supabase
        .from('tm_test_cases')
        .select('id, folder_id')
        .eq('project_id', projectId);

      // Get latest run status per case from scope
      const { data: scopeItems } = await supabase
        .from('tm_cycle_scope')
        .select('test_case_id, current_status, added_at')
        .order('added_at', { ascending: false });

      // Build case status map (latest status per case)
      const caseStatusMap = new Map<string, { status: string; lastRun: string | null }>();
      scopeItems?.forEach(item => {
        if (!caseStatusMap.has(item.test_case_id)) {
          caseStatusMap.set(item.test_case_id, { 
            status: execStatusFromDb(item.current_status), 
            lastRun: item.added_at 
          });
        }
      });

      // Calculate coverage by folder
      const folderStats = new Map<string, {
        total: number;
        executed: number;
        passed: number;
        failed: number;
        lastRun: string | null;
      }>();

      // Initialize folders
      folders?.forEach(f => {
        folderStats.set(f.id, { total: 0, executed: 0, passed: 0, failed: 0, lastRun: null });
      });
      folderStats.set('unfiled', { total: 0, executed: 0, passed: 0, failed: 0, lastRun: null });

      // Count cases per folder
      cases?.forEach(c => {
        const folderId = c.folder_id || 'unfiled';
        const stats = folderStats.get(folderId);
        if (stats) {
          stats.total++;
          
          const caseStatus = caseStatusMap.get(c.id);
          if (caseStatus) {
            if (caseStatus.status !== 'NOT_RUN') {
              stats.executed++;
            }
            if (caseStatus.status === 'PASSED') {
              stats.passed++;
            } else if (caseStatus.status === 'FAILED') {
              stats.failed++;
            }
            if (!stats.lastRun || (caseStatus.lastRun && caseStatus.lastRun > stats.lastRun)) {
              stats.lastRun = caseStatus.lastRun;
            }
          }
        }
      });

      // Build result
      const result = (folders || []).map(folder => {
        const stats = folderStats.get(folder.id) || { total: 0, executed: 0, passed: 0, failed: 0, lastRun: null };
        const passRate = stats.executed > 0 ? Math.round((stats.passed / stats.executed) * 100) : 0;
        return {
          id: folder.id,
          name: folder.name,
          path: folder.path,
          cases: stats.total,
          executed: stats.executed,
          passed: stats.passed,
          failed: stats.failed,
          lastRun: stats.lastRun,
          passRate,
          gap: stats.total === 0 ? 'no-tests' : passRate < 50 ? 'low' : passRate < 80 ? 'medium' : 'good',
        };
      });

      // Calculate overall coverage
      const totalCases = cases?.length || 0;
      const executedCases = Array.from(caseStatusMap.values()).filter(s => s.status !== 'NOT_RUN').length;
      const coverage = totalCases > 0 ? Math.round((executedCases / totalCases) * 100) : 0;

      return {
        folders: result,
        coverage,
        totalCases,
        executedCases,
        summary,
      };
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// BURNDOWN DATA
// ============================================================================

export function useBurndownData(cycleId: string | undefined) {
  return useQuery({
    queryKey: ['tm-burndown', cycleId],
    queryFn: async () => {
      if (!cycleId) return null;

      // Get cycle info using the view
      const { data: cycle } = await supabase
        .from('v_tm_cycle_progress')
        .select('*')
        .eq('id', cycleId)
        .maybeSingle();

      if (!cycle) return null;

      const totalCases = cycle.total_cases || 0;

      // Get scope items for this cycle
      const { data: scopeItems } = await supabase
        .from('tm_cycle_scope')
        .select('id')
        .eq('cycle_id', cycleId);

      const scopeIds = scopeItems?.map(s => s.id) || [];

      // Get execution history
      const { data: runs } = scopeIds.length > 0 
        ? await supabase
            .from('tm_test_runs')
            .select('id, status, completed_at')
            .in('cycle_scope_id', scopeIds)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: true })
        : { data: [] };

      // Group by date
      const byDate = new Map<string, number>();
      let cumulative = 0;

      runs?.forEach(run => {
        const status = execStatusFromDb(run.status);
        if (status === 'PASSED' || status === 'FAILED' || status === 'BLOCKED') {
          const date = run.completed_at!.split('T')[0];
          cumulative++;
          byDate.set(date, cumulative);
        }
      });

      // Build burndown data
      const startDate = cycle.planned_start || cycle.actual_start || cycle.created_at;
      const endDate = cycle.planned_end || cycle.actual_end;

      const burndownData: Array<{ date: string; ideal: number; actual: number | null }> = [];

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const dailyIdeal = totalCases / totalDays;

        for (let i = 0; i <= totalDays; i++) {
          const date = new Date(start);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];

          const executed = byDate.get(dateStr);
          const actualRemaining = executed !== undefined ? totalCases - executed : null;

          burndownData.push({
            date: dateStr,
            ideal: Math.max(0, totalCases - (dailyIdeal * i)),
            actual: actualRemaining,
          });
        }
      }

      // Calculate projection
      const completedCount = (cycle.passed_count || 0) + (cycle.failed_count || 0) + (cycle.blocked_count || 0);
      const remainingCount = totalCases - completedCount;
      
      // Calculate velocity (avg per day)
      const daysElapsed = runs?.length ? Math.max(1, new Set(runs.map(r => r.completed_at?.split('T')[0])).size) : 1;
      const velocity = completedCount / daysElapsed;
      const daysToComplete = velocity > 0 ? Math.ceil(remainingCount / velocity) : null;

      return {
        cycle,
        totalCases,
        completedCount,
        remainingCount,
        passedCount: cycle.passed_count || 0,
        failedCount: cycle.failed_count || 0,
        blockedCount: cycle.blocked_count || 0,
        burndownData,
        velocity: Math.round(velocity * 100) / 100,
        daysToComplete,
        isOnTrack: daysToComplete !== null && cycle.planned_end 
          ? new Date().getTime() + (daysToComplete * 24 * 60 * 60 * 1000) <= new Date(cycle.planned_end).getTime()
          : null,
      };
    },
    enabled: !!cycleId,
  });
}

// ============================================================================
// TEAM PERFORMANCE
// ============================================================================

export function useTeamPerformance(
  projectId: string | undefined,
  dateRange?: { from?: string; to?: string }
) {
  return useQuery({
    queryKey: ['tm-team-performance', projectId, dateRange],
    queryFn: async (): Promise<TesterPerformance[]> => {
      if (!projectId) return [];

      // Use the execution by assignee view
      const { data: assigneeData } = await supabase
        .from('v_tm_execution_by_assignee')
        .select('*');

      // Get defects by reporter
      let defectsQuery = supabase
        .from('tm_defects')
        .select('reporter_id')
        .eq('project_id', projectId);

      if (dateRange?.from) {
        defectsQuery = defectsQuery.gte('created_at', dateRange.from);
      }
      if (dateRange?.to) {
        defectsQuery = defectsQuery.lte('created_at', dateRange.to);
      }

      const { data: defects } = await defectsQuery;

      // Count defects by reporter
      const defectsByReporter = new Map<string, number>();
      defects?.forEach(d => {
        if (d.reporter_id) {
          defectsByReporter.set(d.reporter_id, (defectsByReporter.get(d.reporter_id) || 0) + 1);
        }
      });

      // Process assignee data - use correct column names from view
      return (assigneeData || []).map(a => ({
        user_id: a.user_id || '',
        user_name: a.assignee_name || 'Unknown',
        avatar_url: undefined, // Not in view
        executed: (a.passed || 0) + (a.failed || 0) + (a.blocked || 0),
        passed: a.passed || 0,
        failed: a.failed || 0,
        pass_rate: (a.passed || 0) + (a.failed || 0) > 0 
          ? Math.round(((a.passed || 0) / ((a.passed || 0) + (a.failed || 0))) * 100) 
          : 0,
        avg_duration: 0, // Would need run data for this
        defects_filed: defectsByReporter.get(a.user_id || '') || 0,
      })).sort((a, b) => b.executed - a.executed);
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

export function useRecentActivity(projectId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: ['tm-recent-activity', projectId, limit],
    queryFn: async () => {
      if (!projectId) return [];

      // Get recent runs
      const { data: runs } = await supabase
        .from('tm_test_runs')
        .select(`
          id, status, started_at,
          cycle_scope:tm_cycle_scope(
            test_case:tm_test_cases(case_key, title),
            cycle:tm_test_cycles(cycle_key, name, project_id)
          ),
          executor:profiles(full_name)
        `)
        .order('started_at', { ascending: false })
        .limit(limit);

      // Filter runs by project
      const projectRuns = (runs || []).filter(
        r => r.cycle_scope?.cycle?.project_id === projectId
      );

      // Get recent defects
      const { data: defects } = await supabase
        .from('tm_defects')
        .select(`
          id, defect_key, title, severity, created_at,
          reporter:profiles!tm_defects_reporter_id_fkey(full_name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Get recent cycles
      const { data: cycles } = await supabase
        .from('tm_test_cycles')
        .select('id, cycle_key, name, status, created_at, actual_start')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Combine and sort
      const activities: Array<{
        type: 'run' | 'defect' | 'cycle';
        timestamp: string;
        data: any;
      }> = [];

      projectRuns.forEach(r => {
        if (r.started_at) {
          activities.push({
            type: 'run',
            timestamp: r.started_at,
            data: {
              ...r,
              status: execStatusFromDb(r.status),
              test_case: r.cycle_scope?.test_case ? {
                key: r.cycle_scope.test_case.case_key,
                title: r.cycle_scope.test_case.title,
              } : undefined,
              cycle: r.cycle_scope?.cycle ? {
                key: r.cycle_scope.cycle.cycle_key,
                name: r.cycle_scope.cycle.name,
              } : undefined,
            },
          });
        }
      });

      defects?.forEach(d => {
        if (d.created_at) {
          activities.push({
            type: 'defect',
            timestamp: d.created_at,
            data: {
              ...d,
              key: d.defect_key,
              severity: defectSeverityFromDb(d.severity),
            },
          });
        }
      });

      cycles?.forEach(c => {
        const timestamp = c.actual_start || c.created_at;
        if (timestamp) {
          activities.push({
            type: 'cycle',
            timestamp,
            data: {
              ...c,
              key: c.cycle_key,
            },
          });
        }
      });

      // Sort by timestamp descending
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities.slice(0, limit);
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// CYCLE PROGRESS (for dashboard)
// ============================================================================

export function useCycleProgress(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-cycle-progress', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      // Use the cycle progress view
      const { data } = await supabase
        .from('v_tm_cycle_progress')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(5);

      return (data || [])
        .filter(cycle => cycle.status === 'in_progress' || cycle.status === 'completed')
        .map(cycle => {
          const total = cycle.total_cases || 0;
          const executed = (cycle.passed_count || 0) + (cycle.failed_count || 0) + (cycle.blocked_count || 0);
          
          return {
            id: cycle.id,
            key: cycle.cycle_key,
            name: cycle.name,
            status: cycle.status,
            total,
            executed,
            progress: total > 0 ? Math.round((executed / total) * 100) : 0,
          };
        });
    },
    enabled: !!projectId,
  });
}
