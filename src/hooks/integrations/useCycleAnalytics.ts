import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CycleAnalytics, CycleComparisonData } from '@/types/integrations.types';

// Mock analytics data
const generateMockAnalytics = (cycleId: string): CycleAnalytics => {
  const totalTests = 142;
  const passed = 98;
  const failed = 12;
  const blocked = 5;
  const inProgress = 15;
  const notStarted = 12;
  
  return {
    summary: {
      total_tests: totalTests,
      passed,
      failed,
      blocked,
      in_progress: inProgress,
      not_started: notStarted,
      pass_rate: Math.round((passed / (passed + failed)) * 100 * 10) / 10,
      execution_rate: Math.round(((totalTests - notStarted) / totalTests) * 100 * 10) / 10,
      avg_execution_minutes: 8.5,
      defect_count: 18,
    },
    daily_trend: [
      { date: '2026-01-10', passed: 5, failed: 1, executed: 6 },
      { date: '2026-01-11', passed: 12, failed: 2, executed: 14 },
      { date: '2026-01-12', passed: 18, failed: 3, executed: 21 },
      { date: '2026-01-13', passed: 25, failed: 4, executed: 29 },
      { date: '2026-01-14', passed: 22, failed: 2, executed: 24 },
      { date: '2026-01-15', passed: 10, failed: 0, executed: 10 },
      { date: '2026-01-16', passed: 6, failed: 0, executed: 6 },
    ],
    by_module: [
      { module: 'Authentication', total: 28, passed: 24, failed: 4 },
      { module: 'Payments', total: 35, passed: 28, failed: 5 },
      { module: 'User Management', total: 22, passed: 18, failed: 2 },
      { module: 'Checkout', total: 30, passed: 25, failed: 1 },
      { module: 'Reports', total: 18, passed: 15, failed: 0 },
      { module: 'Settings', total: 9, passed: 8, failed: 0 },
    ],
    team_performance: [
      { user_id: '1', name: 'Ahmed S.', avatar_url: undefined, assigned: 32, completed: 28, pass_rate: 92.9, avg_time: 7.2 },
      { user_id: '2', name: 'Sara M.', avatar_url: undefined, assigned: 28, completed: 25, pass_rate: 88.0, avg_time: 9.1 },
      { user_id: '3', name: 'Omar T.', avatar_url: undefined, assigned: 35, completed: 32, pass_rate: 90.6, avg_time: 8.5 },
      { user_id: '4', name: 'Fatima K.', avatar_url: undefined, assigned: 25, completed: 20, pass_rate: 95.0, avg_time: 6.8 },
      { user_id: '5', name: 'Hassan M.', avatar_url: undefined, assigned: 22, completed: 18, pass_rate: 83.3, avg_time: 10.2 },
    ],
  };
};

export function useCycleAnalytics(cycleId: string) {
  return useQuery({
    queryKey: ['cycle-analytics', cycleId],
    queryFn: async () => {
      // In production:
      // const { data, error } = await supabase.rpc('get_cycle_analytics', {
      //   p_cycle_id: cycleId,
      // });
      // if (error) throw error;
      // return data as CycleAnalytics;
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      return generateMockAnalytics(cycleId);
    },
    enabled: !!cycleId,
  });
}

export function useCycleComparison(cycleIds: string[]) {
  return useQuery({
    queryKey: ['cycle-comparison', cycleIds],
    queryFn: async () => {
      // In production, fetch analytics for each cycle and build comparison
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const comparisons: CycleComparisonData[] = [
        {
          cycle_id: cycleIds[0] || 'cycle-1',
          cycle_name: 'Regression R2.1',
          duration_days: 10,
          total_tests: 142,
          pass_rate: 89.1,
          defects_found: 18,
          team_velocity: 14.2,
        },
        {
          cycle_id: cycleIds[1] || 'cycle-2',
          cycle_name: 'Regression R2.0',
          duration_days: 12,
          total_tests: 128,
          pass_rate: 85.5,
          defects_found: 22,
          team_velocity: 10.7,
        },
        {
          cycle_id: cycleIds[2] || 'cycle-3',
          cycle_name: 'Regression R1.9',
          duration_days: 14,
          total_tests: 115,
          pass_rate: 82.3,
          defects_found: 28,
          team_velocity: 8.2,
        },
      ];
      
      return comparisons.slice(0, cycleIds.length);
    },
    enabled: cycleIds.length > 0,
  });
}

export function useAvailableCycles(projectId: string) {
  return useQuery({
    queryKey: ['available-cycles', projectId],
    queryFn: async () => {
      // In production:
      // const { data, error } = await supabase
      //   .from('test_cycles')
      //   .select('id, name, status, start_date, end_date')
      //   .eq('project_id', projectId)
      //   .order('created_at', { ascending: false });
      
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      return [
        { id: 'cycle-1', name: 'Regression R2.1', status: 'active', start_date: '2026-01-10', end_date: '2026-01-20' },
        { id: 'cycle-2', name: 'Regression R2.0', status: 'completed', start_date: '2025-12-15', end_date: '2025-12-27' },
        { id: 'cycle-3', name: 'Regression R1.9', status: 'completed', start_date: '2025-11-20', end_date: '2025-12-04' },
        { id: 'cycle-4', name: 'Smoke Test Sprint 4', status: 'completed', start_date: '2026-01-05', end_date: '2026-01-07' },
        { id: 'cycle-5', name: 'UAT Release 2.0', status: 'completed', start_date: '2025-12-28', end_date: '2026-01-03' },
      ];
    },
    enabled: !!projectId,
  });
}
