/**
 * useGlobalTestMetrics Hook
 * Fetches test metrics with scope filtering (global/program/project)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { ScopeType } from './useGlobalTestScope';

export interface GlobalTestMetrics {
  totalCases: number;
  totalSets: number;
  totalCycles: number;
  activeCycles: number;
  passRate: number;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
}

export function useGlobalTestMetrics(scopeType: ScopeType, scopeId: string | null) {
  const { user } = useAuth();

  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['global-test-metrics', scopeType, scopeId],
    queryFn: async (): Promise<GlobalTestMetrics> => {
      // Build scope filter
      let casesQuery = supabase
        .from('test_cases')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);

      let setsQuery = supabase
        .from('test_sets')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);

      let cyclesQuery = supabase
        .from('test_cycles')
        .select('id', { count: 'exact', head: true })
        .eq('archived', false);

      let activeCyclesQuery = supabase
        .from('test_cycles')
        .select('id', { count: 'exact', head: true })
        .eq('archived', false)
        .in('status', ['active', 'in_progress']);

      // Apply scope filters
      if (scopeType === 'program' && scopeId) {
        casesQuery = casesQuery.eq('program_id', scopeId);
        setsQuery = setsQuery.eq('program_id', scopeId);
        cyclesQuery = cyclesQuery.eq('program_id', scopeId);
        activeCyclesQuery = activeCyclesQuery.eq('program_id', scopeId);
      } else if (scopeType === 'project' && scopeId) {
        casesQuery = casesQuery.eq('project_id', scopeId);
        setsQuery = setsQuery.eq('project_id', scopeId);
        cyclesQuery = cyclesQuery.eq('project_id', scopeId);
        activeCyclesQuery = activeCyclesQuery.eq('project_id', scopeId);
      }

      // Execute all count queries in parallel
      const [casesResult, setsResult, cyclesResult, activeCyclesResult] = await Promise.all([
        casesQuery,
        setsQuery,
        cyclesQuery,
        activeCyclesQuery,
      ]);

      // Fetch execution stats
      let execQuery = supabase
        .from('test_cycle_executions')
        .select('status, test_cycle:test_cycles(program_id, project_id)');

      const { data: executions } = await execQuery;

      // Filter executions by scope
      const filteredExecs = (executions || []).filter((exec: any) => {
        if (scopeType === 'global') return true;
        if (scopeType === 'program' && scopeId) {
          return exec.test_cycle?.program_id === scopeId;
        }
        if (scopeType === 'project' && scopeId) {
          return exec.test_cycle?.project_id === scopeId;
        }
        return true;
      });

      let passed = 0, failed = 0, blocked = 0, notRun = 0;
      filteredExecs.forEach((exec: any) => {
        switch (exec.status) {
          case 'passed': passed++; break;
          case 'failed': failed++; break;
          case 'blocked': blocked++; break;
          default: notRun++;
        }
      });

      const totalExecutions = passed + failed + blocked + notRun;
      const passRate = totalExecutions > 0 ? Math.round((passed / totalExecutions) * 100) : 0;

      return {
        totalCases: casesResult.count || 0,
        totalSets: setsResult.count || 0,
        totalCycles: cyclesResult.count || 0,
        activeCycles: activeCyclesResult.count || 0,
        passRate,
        passed,
        failed,
        blocked,
        notRun,
      };
    },
    enabled: !!user,
    staleTime: 30000,
  });

  return {
    metrics: metrics || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to fetch test cases with global scope filtering
 */
export function useGlobalTestCases(scopeType: ScopeType, scopeId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['global-test-cases', scopeType, scopeId],
    queryFn: async () => {
      let query = supabase
        .from('test_cases')
        .select(`
          id, title, description, status, priority, test_type, component,
          created_at, updated_at, created_by,
          program_id, project_id, folder_id
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500);

      if (scopeType === 'program' && scopeId) {
        query = query.eq('program_id', scopeId);
      } else if (scopeType === 'project' && scopeId) {
        query = query.eq('project_id', scopeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 15000,
  });
}

/**
 * Hook to fetch test cycles with global scope filtering
 */
export function useGlobalTestCycles(scopeType: ScopeType, scopeId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['global-test-cycles', scopeType, scopeId],
    queryFn: async () => {
      let query = supabase
        .from('test_cycles')
        .select(`
          id, name, key, description, status, 
          start_date, end_date,
          created_at, updated_at, created_by,
          program_id, project_id,
          test_cycle_executions(id, status)
        `)
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (scopeType === 'program' && scopeId) {
        query = query.eq('program_id', scopeId);
      } else if (scopeType === 'project' && scopeId) {
        query = query.eq('project_id', scopeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 15000,
  });
}

/**
 * Hook to fetch test sets with global scope filtering
 */
export function useGlobalTestSets(scopeType: ScopeType, scopeId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['global-test-sets', scopeType, scopeId],
    queryFn: async () => {
      let query = supabase
        .from('test_sets')
        .select(`
          id, name, description, 
          created_at, updated_at, created_by,
          program_id, project_id, folder_id,
          test_set_cases(id)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (scopeType === 'program' && scopeId) {
        query = query.eq('program_id', scopeId);
      } else if (scopeType === 'project' && scopeId) {
        query = query.eq('project_id', scopeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 15000,
  });
}
