import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SummaryCards } from '@/components/test-management/SummaryCards';
import { PassFailChart } from '@/components/test-management/PassFailChart';
import { ExecutionTrendChart } from '@/components/test-management/ExecutionTrendChart';
import { TestCoverageBar } from '@/components/test-management/TestCoverageBar';
import { RecentExecutions } from '@/components/test-management/RecentExecutions';
import { CoverageGapAnalyzer } from '@/components/test-management/CoverageGapAnalyzer';
import { TestSuggestions } from '@/components/test-management/TestSuggestions';
import { TestMetrics, ExecutionTrend, FeatureCoverage, RecentExecution } from '@/types/reports.types';
import { Loader2 } from 'lucide-react';

export function TestReportsPage() {
  // Fetch test metrics
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['test-metrics'],
    queryFn: async (): Promise<TestMetrics> => {
      const { data: testCases } = await supabase.from('test_cases').select('id');
      const { data: executions } = await supabase
        .from('test_executions')
        .select('status')
        .order('executed_at', { ascending: false });

      const totalTests = testCases?.length || 0;
      const passedTests = executions?.filter(e => e.status === 'passed').length || 0;
      const failedTests = executions?.filter(e => e.status === 'failed').length || 0;
      const notRunTests = totalTests - (passedTests + failedTests);
      const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

      return { totalTests, passedTests, failedTests, notRunTests, passRate };
    },
  });

  // Fetch execution trend (last 30 days)
  const { data: trendData = [] } = useQuery({
    queryKey: ['execution-trend'],
    queryFn: async (): Promise<ExecutionTrend[]> => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: executions } = await supabase
        .from('test_executions')
        .select('execution_date, status')
        .gte('execution_date', thirtyDaysAgo.toISOString())
        .order('execution_date', { ascending: true });

      if (!executions) return [];

      // Group by date
      const groupedByDate: Record<string, { passed: number; failed: number; notRun: number }> = {};
      
      executions.forEach(execution => {
        const date = new Date(execution.execution_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!groupedByDate[date]) {
          groupedByDate[date] = { passed: 0, failed: 0, notRun: 0 };
        }
        
        if (execution.status === 'passed') groupedByDate[date].passed++;
        else if (execution.status === 'failed') groupedByDate[date].failed++;
        else groupedByDate[date].notRun++;
      });

      return Object.entries(groupedByDate).map(([date, counts]) => ({
        date,
        ...counts,
      }));
    },
  });

  // Fetch coverage data
  const { data: coverageData = [] } = useQuery({
    queryKey: ['test-coverage'],
    queryFn: async (): Promise<FeatureCoverage[]> => {
      const { data: testCases } = await supabase
        .from('test_cases')
        .select('id, linked_work_item_id, linked_work_item_type');

      if (!testCases) return [];

      // Get unique feature IDs
      const featureIds = [...new Set(
        testCases
          .filter(tc => tc.linked_work_item_type === 'feature' && tc.linked_work_item_id)
          .map(tc => tc.linked_work_item_id)
      )];

      if (featureIds.length === 0) return [];

      // Fetch feature names
      const { data: features } = await supabase
        .from('features')
        .select('id, name')
        .in('id', featureIds);

      if (!features) return [];

      // Calculate coverage per feature
      return features.map(feature => {
        const featureTestCases = testCases.filter(tc => tc.linked_work_item_id === feature.id);
        const totalTests = featureTestCases.length;
        
        // For now, assume all linked tests are "completed" (you can enhance this logic)
        const completedTests = totalTests;
        const coveragePercentage = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

        return {
          featureId: feature.id,
          featureName: feature.name,
          totalTests,
          completedTests,
          coveragePercentage,
        };
      });
    },
  });

  // Fetch recent executions
  const { data: recentExecutions = [] } = useQuery({
    queryKey: ['recent-executions'],
    queryFn: async (): Promise<RecentExecution[]> => {
      const { data } = await supabase
        .from('test_executions')
        .select(`
          id,
          test_case_id,
          status,
          execution_date,
          execution_time_seconds,
          test_cases (
            title
          )
        `)
        .order('execution_date', { ascending: false })
        .limit(10);

      if (!data) return [];

      return data.map(execution => ({
        id: execution.id,
        testCaseId: execution.test_case_id,
        testCaseTitle: (execution.test_cases as any)?.title || 'Unknown Test',
        executedBy: 'User', // You can fetch from profiles if needed
        executedAt: execution.execution_date,
        status: execution.status as 'passed' | 'failed' | 'blocked' | 'skipped',
        duration: execution.execution_time_seconds,
      }));
    },
  });

  if (loadingMetrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Test Reports</h1>
          <p className="text-muted-foreground mt-1">
            Overview of test execution metrics and trends
          </p>
        </div>

        {/* Summary Cards */}
        {metrics && (
          <SummaryCards
            totalTests={metrics.totalTests}
            passedTests={metrics.passedTests}
            failedTests={metrics.failedTests}
            passRate={metrics.passRate}
          />
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {metrics && (
            <PassFailChart
              passed={metrics.passedTests}
              failed={metrics.failedTests}
              notRun={metrics.notRunTests}
            />
          )}
          <ExecutionTrendChart data={trendData} />
        </div>

        {/* Coverage and Recent Executions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TestCoverageBar coverageData={coverageData} />
          <RecentExecutions executions={recentExecutions} />
        </div>

        {/* AI-Powered Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CoverageGapAnalyzer />
          <TestSuggestions />
        </div>
      </div>
    </div>
  );
}
