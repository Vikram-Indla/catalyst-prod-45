/**
 * My Work Hook - Aggregates assigned work items for current user
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MyWorkItem, CycleScope, TestCase, TestCycle } from '../api/types';

// Query Keys
export const myWorkKeys = {
  all: ['tm-my-work'] as const,
  assigned: (userId: string) => [...myWorkKeys.all, 'assigned', userId] as const,
  recent: (userId: string) => [...myWorkKeys.all, 'recent', userId] as const,
};

interface MyWorkData {
  assignedCases: MyWorkItem[];
  pendingRuns: MyWorkItem[];
  recentActivity: MyWorkItem[];
  stats: {
    totalAssigned: number;
    pendingExecution: number;
    passedToday: number;
    failedToday: number;
  };
}

/**
 * Get all work assigned to current user
 */
export function useMyWork() {
  return useQuery({
    queryKey: myWorkKeys.all,
    queryFn: async (): Promise<MyWorkData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          assignedCases: [],
          pendingRuns: [],
          recentActivity: [],
          stats: { totalAssigned: 0, pendingExecution: 0, passedToday: 0, failedToday: 0 },
        };
      }

      // Fetch assigned scope items (not yet run)
      const { data: scopeItems } = await supabase
        .from('tm_cycle_scope')
        .select(`
          id,
          current_status,
          tm_test_cases (id, case_key, title, priority_id),
          tm_test_cycles (id, cycle_key, title, status)
        `)
        .eq('assigned_to', user.id)
        .in('current_status', ['not_run', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch recent runs by user
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: recentRuns } = await supabase
        .from('tm_test_runs')
        .select(`
          id,
          run_number,
          status,
          completed_at,
          tm_cycle_scope (
            id,
            tm_test_cases (id, case_key, title),
            tm_test_cycles (id, cycle_key, title)
          )
        `)
        .eq('executed_by', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Transform scope items to work items
      const assignedCases: MyWorkItem[] = (scopeItems || []).map((item: any) => ({
        id: item.id,
        type: 'cycle' as const,
        title: item.tm_test_cases?.title || 'Unknown',
        key: item.tm_test_cases?.case_key || '',
        status: item.current_status,
        cycle_title: item.tm_test_cycles?.title,
      }));

      // Filter pending (not_run only)
      const pendingRuns = assignedCases.filter((c) => c.status === 'not_run');

      // Transform recent runs
      const recentActivity: MyWorkItem[] = (recentRuns || []).map((run: any) => ({
        id: run.id,
        type: 'run' as const,
        title: run.tm_cycle_scope?.tm_test_cases?.title || 'Unknown',
        key: `Run #${run.run_number}`,
        status: run.status,
        cycle_title: run.tm_cycle_scope?.tm_test_cycles?.title,
      }));

      // Calculate stats
      const passedToday = (recentRuns || []).filter(
        (r: any) => r.status === 'passed' && new Date(r.completed_at) >= today
      ).length;

      const failedToday = (recentRuns || []).filter(
        (r: any) => r.status === 'failed' && new Date(r.completed_at) >= today
      ).length;

      return {
        assignedCases,
        pendingRuns,
        recentActivity,
        stats: {
          totalAssigned: assignedCases.length,
          pendingExecution: pendingRuns.length,
          passedToday,
          failedToday,
        },
      };
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Get assigned items for a specific user
 */
export function useAssignedWork(userId: string | null) {
  return useQuery({
    queryKey: myWorkKeys.assigned(userId || ''),
    queryFn: async () => {
      if (!userId) return [];

      const { data } = await supabase
        .from('tm_cycle_scope')
        .select(`
          id,
          current_status,
          tm_test_cases (id, case_key, title, priority_id),
          tm_test_cycles (id, cycle_key, title, status, planned_end)
        `)
        .eq('assigned_to', userId)
        .neq('current_status', 'passed')
        .order('created_at', { ascending: false });

      return (data || []).map((item: any) => ({
        id: item.id,
        type: 'cycle' as const,
        title: item.tm_test_cases?.title || 'Unknown',
        key: item.tm_test_cases?.case_key || '',
        status: item.current_status,
        cycle_title: item.tm_test_cycles?.title,
        due_date: item.tm_test_cycles?.planned_end,
      }));
    },
    enabled: !!userId,
  });
}
