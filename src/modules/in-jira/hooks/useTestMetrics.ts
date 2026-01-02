/**
 * Test Metrics Hook
 * Aggregate metrics for the Test Command Center
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface TestMetrics {
  totalCases: number;
  totalSets: number;
  activeCycles: number;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  passRate: number;
  completionRate: number;
}

export interface CycleProgress {
  id: string;
  name: string;
  total: number;
  completed: number;
  progress: number;
}

export function useTestMetrics(programId: string | null) {
  const { user } = useAuth();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['test-metrics', programId],
    queryFn: async (): Promise<TestMetrics> => {
      // Get test cases count
      let casesQuery = supabase
        .from('test_cases')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);
      
      if (programId) {
        casesQuery = casesQuery.eq('program_id', programId);
      }
      
      const { count: casesCount } = await casesQuery;

      // Get test sets count
      let setsQuery = supabase
        .from('test_sets')
        .select('id', { count: 'exact', head: true });
      
      if (programId) {
        setsQuery = setsQuery.eq('program_id', programId);
      }
      
      const { count: setsCount } = await setsQuery;

      // Get active cycles count and execution stats
      let cyclesQuery = supabase
        .from('test_cycles')
        .select(`
          id,
          status,
          test_cycle_executions(status)
        `)
        .eq('archived', false);
      
      if (programId) {
        cyclesQuery = cyclesQuery.eq('program_id', programId);
      }
      
      const { data: cycles } = await cyclesQuery;

      // Calculate aggregate execution stats
      let passed = 0;
      let failed = 0;
      let blocked = 0;
      let notRun = 0;
      let activeCycles = 0;

      cycles?.forEach((cycle: any) => {
        if (cycle.status === 'active' || cycle.status === 'in_progress') {
          activeCycles++;
        }
        
        cycle.test_cycle_executions?.forEach((exec: any) => {
          switch (exec.status) {
            case 'passed':
              passed++;
              break;
            case 'failed':
              failed++;
              break;
            case 'blocked':
              blocked++;
              break;
            default:
              notRun++;
          }
        });
      });

      const totalExecutions = passed + failed + blocked + notRun;
      const completedExecutions = passed + failed + blocked;

      return {
        totalCases: casesCount || 0,
        totalSets: setsCount || 0,
        activeCycles,
        passed,
        failed,
        blocked,
        notRun,
        passRate: totalExecutions > 0 ? Math.round((passed / totalExecutions) * 1000) / 10 : 0,
        completionRate: totalExecutions > 0 ? Math.round((completedExecutions / totalExecutions) * 100) : 0,
      };
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });

  const { data: cycleProgress, isLoading: progressLoading } = useQuery({
    queryKey: ['cycle-progress', programId],
    queryFn: async (): Promise<CycleProgress[]> => {
      let query = supabase
        .from('test_cycles')
        .select(`
          id,
          name,
          test_cycle_executions(status)
        `)
        .eq('archived', false)
        .in('status', ['active', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (programId) {
        query = query.eq('program_id', programId);
      }
      
      const { data: cycles } = await query;

      return (cycles || []).map((cycle: any) => {
        const executions = cycle.test_cycle_executions || [];
        const total = executions.length;
        const completed = executions.filter((e: any) => 
          e.status === 'passed' || e.status === 'failed' || e.status === 'blocked'
        ).length;

        return {
          id: cycle.id,
          name: cycle.name,
          total,
          completed,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      });
    },
    enabled: !!user,
    staleTime: 30000,
  });

  return {
    metrics: metrics || {
      totalCases: 0,
      totalSets: 0,
      activeCycles: 0,
      passed: 0,
      failed: 0,
      blocked: 0,
      notRun: 0,
      passRate: 0,
      completionRate: 0,
    },
    cycleProgress: cycleProgress || [],
    isLoading: metricsLoading || progressLoading,
  };
}

// Hook for recent test activity
export function useRecentTestActivity(programId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-test-activity', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_activity_log')
        .select(`
          *,
          user:profiles!test_activity_log_user_id_fkey(id, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (programId) {
        query = query.eq('program_id', programId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 10000,
  });
}
