/**
 * Module 4C-4: Run Analytics Hooks
 * Execution trends, tester stats, time analysis for runs
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================
// Run Summary Analytics
// ============================================================
export interface RunSummaryAnalytics {
  runId: string;
  runName: string;
  runNumber: number;
  status: string;
  totalCases: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  notRun: number;
  passRate: number;
  executionRate: number;
  avgDurationSeconds: number;
  totalDurationMinutes: number;
  defectsLogged: number;
  activeTesters: number;
  startedAt: string | null;
  completedAt: string | null;
}

export function useRunSummaryAnalytics(runId: string | null) {
  return useQuery({
    queryKey: ['run-summary-analytics', runId],
    queryFn: async (): Promise<RunSummaryAnalytics | null> => {
      if (!runId) return null;

      // Fetch run details
      const { data: run, error: runError } = await (supabase
        .from('test_execution_runs') as any)
        .select('id, name, run_number, status, started_at, completed_at')
        .eq('id', runId)
        .single();

      if (runError) throw runError;

      // Fetch assignments aggregated by status
      const { data: assignments, error: assignError } = await (supabase
        .from('tm_run_case_assignments') as any)
        .select('status, assigned_to')
        .eq('run_id', runId);

      if (assignError) throw assignError;

      // Fetch results for duration calculation
      const { data: results, error: resultsError } = await (supabase
        .from('test_execution_results') as any)
        .select('actual_result, duration_seconds')
        .eq('run_id', runId);

      if (resultsError) throw resultsError;

      // Calculate metrics
      const statusCounts = {
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        not_started: 0,
        in_progress: 0,
      };

      const uniqueTesters = new Set<string>();

      (assignments || []).forEach((a: any) => {
        const s = a.status || 'not_started';
        if (s in statusCounts) {
          statusCounts[s as keyof typeof statusCounts]++;
        }
        if (a.assigned_to) uniqueTesters.add(a.assigned_to);
      });

      const totalCases = assignments?.length || 0;
      const executed = statusCounts.passed + statusCounts.failed + statusCounts.blocked + statusCounts.skipped;
      const passRate = executed > 0 ? (statusCounts.passed / executed) * 100 : 0;
      const executionRate = totalCases > 0 ? (executed / totalCases) * 100 : 0;

      // Duration calculations from results
      const durations = (results || [])
        .filter((r: any) => r.duration_seconds)
        .map((r: any) => r.duration_seconds);
      
      const avgDuration = durations.length > 0 
        ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length 
        : 0;
      const totalDuration = durations.reduce((a: number, b: number) => a + b, 0) / 60;

      // Count defects from results
      const defectsLogged = (results || []).filter((r: any) => 
        r.actual_result === 'failed'
      ).length;

      return {
        runId: run.id,
        runName: run.name,
        runNumber: run.run_number,
        status: run.status,
        totalCases,
        passed: statusCounts.passed,
        failed: statusCounts.failed,
        blocked: statusCounts.blocked,
        skipped: statusCounts.skipped,
        notRun: statusCounts.not_started + statusCounts.in_progress,
        passRate,
        executionRate,
        avgDurationSeconds: avgDuration,
        totalDurationMinutes: totalDuration,
        defectsLogged,
        activeTesters: uniqueTesters.size,
        startedAt: run.started_at,
        completedAt: run.completed_at,
      };
    },
    enabled: !!runId,
    staleTime: 30000,
  });
}

// ============================================================
// Run Execution Trend (time-based)
// ============================================================
export interface RunTrendPoint {
  timestamp: string;
  timeLabel: string;
  passed: number;
  failed: number;
  blocked: number;
  cumulativeExecuted: number;
  passRate: number;
}

export function useRunExecutionTrend(runId: string | null) {
  return useQuery({
    queryKey: ['run-execution-trend', runId],
    queryFn: async (): Promise<RunTrendPoint[]> => {
      if (!runId) return [];

      const { data: results, error } = await (supabase
        .from('test_execution_results') as any)
        .select('actual_result, executed_at, created_at')
        .eq('run_id', runId)
        .order('executed_at', { ascending: true });

      if (error) throw error;
      if (!results || results.length === 0) return [];

      // Group by hour
      const hourlyBuckets = new Map<string, { passed: number; failed: number; blocked: number }>();
      
      results.forEach((r: any) => {
        const ts = r.executed_at || r.created_at;
        if (!ts) return;
        
        const date = new Date(ts);
        const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
        
        if (!hourlyBuckets.has(hourKey)) {
          hourlyBuckets.set(hourKey, { passed: 0, failed: 0, blocked: 0 });
        }
        
        const bucket = hourlyBuckets.get(hourKey)!;
        if (r.actual_result === 'passed') bucket.passed++;
        else if (r.actual_result === 'failed') bucket.failed++;
        else if (r.actual_result === 'blocked') bucket.blocked++;
      });

      // Convert to trend points with cumulative data
      let cumulativeExecuted = 0;
      let cumulativePassed = 0;
      
      const sortedKeys = Array.from(hourlyBuckets.keys()).sort();
      
      return sortedKeys.map(key => {
        const bucket = hourlyBuckets.get(key)!;
        cumulativeExecuted += bucket.passed + bucket.failed + bucket.blocked;
        cumulativePassed += bucket.passed;
        
        return {
          timestamp: key,
          timeLabel: key.split(' ')[1] || key,
          passed: bucket.passed,
          failed: bucket.failed,
          blocked: bucket.blocked,
          cumulativeExecuted,
          passRate: cumulativeExecuted > 0 ? (cumulativePassed / cumulativeExecuted) * 100 : 0,
        };
      });
    },
    enabled: !!runId,
    staleTime: 30000,
  });
}

// ============================================================
// Tester Performance in Run
// ============================================================
export interface RunTesterStats {
  userId: string;
  userName: string;
  userInitials: string;
  assigned: number;
  completed: number;
  passed: number;
  failed: number;
  blocked: number;
  completionRate: number;
  passRate: number;
  avgDurationSeconds: number;
}

export function useRunTesterStats(runId: string | null) {
  return useQuery({
    queryKey: ['run-tester-stats', runId],
    queryFn: async (): Promise<RunTesterStats[]> => {
      if (!runId) return [];

      // Get assignments with tester info
      const { data: assignments, error: assignError } = await (supabase
        .from('tm_run_case_assignments') as any)
        .select(`
          status,
          assigned_to,
          profiles:assigned_to (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('run_id', runId);

      if (assignError) throw assignError;

      // Get results for duration
      const { data: results, error: resultsError } = await (supabase
        .from('test_execution_results') as any)
        .select('tester_id, actual_result, duration_seconds')
        .eq('run_id', runId);

      if (resultsError) throw resultsError;

      // Aggregate by tester
      const testerMap = new Map<string, {
        userId: string;
        userName: string;
        assigned: number;
        completed: number;
        passed: number;
        failed: number;
        blocked: number;
        durations: number[];
      }>();

      (assignments || []).forEach((a: any) => {
        if (!a.assigned_to) return;
        
        if (!testerMap.has(a.assigned_to)) {
          const profile = a.profiles;
          testerMap.set(a.assigned_to, {
            userId: a.assigned_to,
            userName: profile?.display_name || 'Unknown',
            assigned: 0,
            completed: 0,
            passed: 0,
            failed: 0,
            blocked: 0,
            durations: [],
          });
        }
        
        const stats = testerMap.get(a.assigned_to)!;
        stats.assigned++;
        
        if (['passed', 'failed', 'blocked', 'skipped'].includes(a.status)) {
          stats.completed++;
          if (a.status === 'passed') stats.passed++;
          if (a.status === 'failed') stats.failed++;
          if (a.status === 'blocked') stats.blocked++;
        }
      });

      // Add duration info from results
      (results || []).forEach((r: any) => {
        if (!r.tester_id || !testerMap.has(r.tester_id)) return;
        const stats = testerMap.get(r.tester_id)!;
        if (r.duration_seconds) stats.durations.push(r.duration_seconds);
      });

      return Array.from(testerMap.values()).map(stats => {
        const avgDuration = stats.durations.length > 0
          ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length
          : 0;
        
        const initials = stats.userName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return {
          userId: stats.userId,
          userName: stats.userName,
          userInitials: initials || 'UN',
          assigned: stats.assigned,
          completed: stats.completed,
          passed: stats.passed,
          failed: stats.failed,
          blocked: stats.blocked,
          completionRate: stats.assigned > 0 ? (stats.completed / stats.assigned) * 100 : 0,
          passRate: stats.completed > 0 ? (stats.passed / stats.completed) * 100 : 0,
          avgDurationSeconds: avgDuration,
        };
      }).sort((a, b) => b.completed - a.completed);
    },
    enabled: !!runId,
    staleTime: 30000,
  });
}

// ============================================================
// Status Distribution
// ============================================================
export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export function useRunStatusDistribution(runId: string | null) {
  return useQuery({
    queryKey: ['run-status-distribution', runId],
    queryFn: async (): Promise<StatusDistribution[]> => {
      if (!runId) return [];

      const { data: assignments, error } = await (supabase
        .from('tm_run_case_assignments') as any)
        .select('status')
        .eq('run_id', runId);

      if (error) throw error;

      const statusColors: Record<string, string> = {
        passed: 'hsl(var(--success))',
        failed: 'hsl(var(--destructive))',
        blocked: 'hsl(var(--warning))',
        skipped: 'hsl(var(--muted))',
        in_progress: 'hsl(var(--primary))',
        not_started: 'hsl(var(--secondary))',
      };

      const counts = new Map<string, number>();
      (assignments || []).forEach((a: any) => {
        const status = a.status || 'not_started';
        counts.set(status, (counts.get(status) || 0) + 1);
      });

      const total = assignments?.length || 0;

      return Array.from(counts.entries()).map(([status, count]) => ({
        status,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        color: statusColors[status] || 'hsl(var(--muted))',
      }));
    },
    enabled: !!runId,
    staleTime: 30000,
  });
}
