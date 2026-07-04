import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TestHubInsight {
  type: 'coverage_drop' | 'exec_efficiency' | 'flaky_trend' | 'defect_velocity';
  title: string;
  value: string;
  trend?: string;
  severity?: 'info' | 'warning' | 'danger';
}

export function useTestHubInsights() {
  return useQuery({
    queryKey: ['testhub-insights'],
    queryFn: async (): Promise<TestHubInsight[]> => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Coverage drop: compare current vs 30-day average
      const { data: coverageData, error: coverageError } = await supabase
        .from('tm_coverage_history')
        .select('coverage_percentage, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(60);

      if (coverageError) throw coverageError;

      const latestCoverage = coverageData?.[0]?.coverage_percentage ?? 0;
      const avgCoverage =
        (coverageData?.reduce((sum, r) => sum + (r.coverage_percentage ?? 0), 0) ?? 0) /
        (coverageData?.length ?? 1);
      const coverageDrop = Math.round((avgCoverage - latestCoverage) * 10) / 10;

      const coverageInsight: TestHubInsight = {
        type: 'coverage_drop',
        title: 'Coverage Status',
        value: `${latestCoverage}%`,
        trend: coverageDrop > 1 ? `↓ ${coverageDrop}% vs 30d avg` : undefined,
        severity: coverageDrop > 5 ? 'danger' : coverageDrop > 2 ? 'warning' : 'info',
      };

      // Execution efficiency: slowest test cases
      const { data: slowTests, error: slowError } = await supabase
        .from('tm_test_runs')
        .select('test_case_id, duration_ms, tm_test_cases(key, title)')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('duration_ms', { ascending: false })
        .limit(10);

      if (slowError) throw slowError;

      const avgDuration =
        (slowTests?.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) ?? 0) /
        (slowTests?.length ?? 1);
      const slowestCase = slowTests?.[0];
      const slowestLabel = slowestCase
        ? `${(slowestCase as any).tm_test_cases?.key || 'Unknown'} (${slowestCase.duration_ms}ms)`
        : 'None';

      const execInsight: TestHubInsight = {
        type: 'exec_efficiency',
        title: 'Execution Speed',
        value: `${Math.round(avgDuration)}ms avg`,
        trend: slowestLabel,
        severity: avgDuration > 5000 ? 'warning' : 'info',
      };

      // Flaky trend: 7-day vs 30-day rate
      const { data: flaky7d, error: flaky7Error } = await supabase
        .from('tm_test_runs')
        .select('status', { count: 'exact' })
        .gte('created_at', sevenDaysAgo.toISOString())
        .eq('status', 'failed');

      if (flaky7Error) throw flaky7Error;

      const { data: total7d, error: total7Error } = await supabase
        .from('tm_test_runs')
        .select('id', { count: 'exact' })
        .gte('created_at', sevenDaysAgo.toISOString());

      if (total7Error) throw total7Error;

      const { data: flaky30d, error: flaky30Error } = await supabase
        .from('tm_test_runs')
        .select('status', { count: 'exact' })
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('status', 'failed');

      if (flaky30Error) throw flaky30Error;

      const { data: total30d, error: total30Error } = await supabase
        .from('tm_test_runs')
        .select('id', { count: 'exact' })
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (total30Error) throw total30Error;

      const failRate7d = ((flaky7d?.count ?? 0) / (total7d?.count ?? 1)) * 100;
      const failRate30d = ((flaky30d?.count ?? 0) / (total30d?.count ?? 1)) * 100;
      const failTrend = Math.round((failRate7d - failRate30d) * 10) / 10;

      const flakyInsight: TestHubInsight = {
        type: 'flaky_trend',
        title: 'Failure Rate Trend',
        value: `${Math.round(failRate7d)}% (7d)`,
        trend: failTrend > 0 ? `↑ ${failTrend}% vs 30d` : undefined,
        severity: failRate7d > 20 ? 'danger' : failRate7d > 10 ? 'warning' : 'info',
      };

      // Defect closure velocity
      const { data: closed, error: closedError } = await supabase
        .from('tm_defects')
        .select('id', { count: 'exact' })
        .gte('closed_at', thirtyDaysAgo.toISOString())
        .eq('status', 'closed');

      if (closedError) throw closedError;

      const { data: created, error: createdError } = await supabase
        .from('tm_defects')
        .select('id', { count: 'exact' })
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (createdError) throw createdError;

      const closureRate = created?.count ? ((closed?.count ?? 0) / (created?.count ?? 1)) * 100 : 0;

      const velocityInsight: TestHubInsight = {
        type: 'defect_velocity',
        title: 'Defect Closure Velocity',
        value: `${Math.round(closureRate)}%`,
        trend: `${closed?.count ?? 0}/${created?.count ?? 0} closed (30d)`,
        severity: closureRate < 50 ? 'warning' : 'info',
      };

      return [coverageInsight, execInsight, flakyInsight, velocityInsight];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
