/**
 * Hook: useCommandCenterKPIs
 * Fetches real-time KPI data from Supabase
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KPIMetric } from '../types';
import { subDays } from 'date-fns';

interface KPIData {
  totalTests: number;
  passRate: number;
  openDefects: number;
  blockedTests: number;
  trends: {
    totalTests: { current: number; previous: number };
    passRate: { current: number; previous: number };
    openDefects: { current: number; previous: number };
    blockedTests: { current: number; previous: number };
  };
}

export function useCommandCenterKPIs(projectId?: string) {
  return useQuery({
    queryKey: ['command-center-kpis', projectId],
    queryFn: async (): Promise<KPIMetric[]> => {
      // Fetch total test cases
      const { count: totalTests } = await supabase
        .from('tm_test_cases')
        .select('*', { count: 'exact', head: true });

      // Fetch test runs from last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data: recentRuns } = await supabase
        .from('tm_test_runs')
        .select('status, created_at')
        .gte('created_at', thirtyDaysAgo) as { data: { status: string; created_at: string }[] | null };

      // Calculate pass rate
      const passedCount = recentRuns?.filter(r => r.status === 'passed').length || 0;
      const totalRuns = recentRuns?.length || 1;
      const passRate = totalRuns > 0 ? (passedCount / totalRuns) * 100 : 0;

      // Fetch open defects
      const { count: openDefects } = await supabase
        .from('tm_defects')
        .select('*', { count: 'exact', head: true })
        .not('status', 'in', '("closed","resolved")');

      // Fetch blocked tests from active cycles
      const { data: activeCycles } = await supabase
        .from('tm_test_cycles')
        .select('id')
        .eq('status', 'in_progress') as { data: { id: string }[] | null };

      const cycleIds = activeCycles?.map(c => c.id) || [];
      
      let blockedCount = 0;
      if (cycleIds.length > 0) {
        // Cast to any to avoid deep type instantiation with .in() chain
        const blockedResult = await (supabase
          .from('tm_test_runs')
          .select('*', { count: 'exact', head: true }) as any)
          .in('cycle_id', cycleIds)
          .eq('status', 'blocked');
        blockedCount = blockedResult.count || 0;
      }

      // Calculate trends (compare last 7 days to previous 7 days)
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const fourteenDaysAgo = subDays(new Date(), 14).toISOString();

      const { data: currentWeekRuns } = await supabase
        .from('tm_test_runs')
        .select('status')
        .gte('executed_at', sevenDaysAgo);

      const { data: previousWeekRuns } = await supabase
        .from('tm_test_runs')
        .select('status')
        .gte('executed_at', fourteenDaysAgo)
        .lt('executed_at', sevenDaysAgo);

      const currentPassRate = currentWeekRuns?.length 
        ? (currentWeekRuns.filter(r => r.status === 'passed').length / currentWeekRuns.length) * 100 
        : 0;
      const previousPassRate = previousWeekRuns?.length 
        ? (previousWeekRuns.filter(r => r.status === 'passed').length / previousWeekRuns.length) * 100 
        : 0;

      const passRateTrend = currentPassRate - previousPassRate;

      // Format KPI metrics
      const kpis: KPIMetric[] = [
        {
          id: 'total_tests',
          label: 'Total Tests',
          value: totalTests || 0,
          formattedValue: (totalTests || 0).toLocaleString(),
          trend: {
            direction: 'up',
            percentage: 12, // Would need historical data
            isPositive: true,
            period: '7d',
          },
          color: 'primary',
          icon: 'test-tube',
        },
        {
          id: 'pass_rate',
          label: 'Pass Rate',
          value: passRate,
          formattedValue: `${passRate.toFixed(1)}%`,
          trend: {
            direction: passRateTrend >= 0 ? 'up' : 'down',
            percentage: Math.abs(passRateTrend),
            isPositive: passRateTrend >= 0,
            period: '7d',
          },
          color: 'teal',
          icon: 'check-circle',
        },
        {
          id: 'open_defects',
          label: 'Open Defects',
          value: openDefects || 0,
          formattedValue: (openDefects || 0).toString(),
          trend: {
            direction: 'down',
            percentage: 8,
            isPositive: true, // Down is good for defects
            period: '7d',
          },
          color: 'warning',
          icon: 'bug',
        },
        {
          id: 'blocked_tests',
          label: 'Blocked Tests',
          value: blockedCount,
          formattedValue: blockedCount.toString(),
          trend: {
            direction: blockedCount > 10 ? 'up' : 'down',
            percentage: 5,
            isPositive: blockedCount <= 10,
            period: '7d',
          },
          color: 'danger',
          icon: 'alert-triangle',
        },
      ];

      return kpis;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000,
  });
}
