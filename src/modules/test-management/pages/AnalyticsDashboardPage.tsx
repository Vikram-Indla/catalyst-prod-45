/**
 * Analytics Dashboard Page - Main reports and analytics view
 * Route: /tests/analytics
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Download, 
  FileText,
  CheckSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  Loader2,
} from 'lucide-react';
import { KPICard } from '../components/reports/KPICard';
import { ExecutionTrendChart } from '../components/reports/ExecutionTrendChart';
import { PassRateDonut } from '../components/reports/PassRateDonut';
import { CoverageCard } from '../components/reports/CoverageCard';
import { CycleComparisonTable } from '../components/reports/CycleComparisonTable';
import { DateRangePicker } from '../components/reports/DateRangePicker';
import { 
  useExecutionSummary, 
  useExecutionTrend, 
  useCoverageStats,
  useCycleComparison,
} from '../hooks/useReports';
import type { DateRangePreset } from '../api/types';

// Demo project ID - replace with actual project context
const PROJECT_ID = '40000000-0001-0001-0001-000000000001';

export function AnalyticsDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRangePreset>('last_14_days');
  const [activeTab, setActiveTab] = useState('overview');

  // Data fetching
  const { data: summary, isLoading: summaryLoading } = useExecutionSummary(PROJECT_ID, dateRange);
  const { data: trendData, isLoading: trendLoading } = useExecutionTrend(PROJECT_ID, dateRange, 'day');
  const { data: coverage, isLoading: coverageLoading } = useCoverageStats(PROJECT_ID);
  const { data: cycles, isLoading: cyclesLoading } = useCycleComparison(PROJECT_ID, 5);

  const isLoading = summaryLoading || trendLoading || coverageLoading || cyclesLoading;

  // Calculate trends (mock for now - would compare with previous period)
  const trends = {
    executions: 12,
    passRate: 5.2,
    failed: -18,
    defects: 8,
    coverage: 0,
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-background to-muted/30 border-b">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-foreground">Reports & Analytics</h1>
          <span className="text-xs text-muted-foreground">
            Test execution insights • Last updated 5 min ago
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
          
          <Button size="sm" className="gap-2 bg-primary">
            <BarChart3 className="h-4 w-4" />
            Create Report
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b bg-background">
        <div className="px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-11 bg-transparent border-0 p-0 gap-1">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="execution"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                Execution
              </TabsTrigger>
              <TabsTrigger 
                value="coverage"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                Coverage
              </TabsTrigger>
              <TabsTrigger 
                value="defects"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                Defects
              </TabsTrigger>
              <TabsTrigger 
                value="trends"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
              >
                Trends
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading analytics...</p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <KPICard
                label="Total Executions"
                value={summary?.total_executions?.toLocaleString() || '0'}
                trend={{ value: trends.executions, direction: 'up' }}
                icon={CheckSquare}
                iconColor="blue"
                animationDelay={0}
              />
              <KPICard
                label="Pass Rate"
                value={`${summary?.pass_rate?.toFixed(1) || '0'}%`}
                trend={{ value: trends.passRate, direction: 'up' }}
                icon={CheckCircle2}
                iconColor="teal"
                valueColor="teal"
                animationDelay={50}
              />
              <KPICard
                label="Failed Tests"
                value={summary?.failed_count || 0}
                trend={{ value: trends.failed, direction: 'down' }}
                icon={XCircle}
                iconColor="red"
                valueColor="red"
                animationDelay={100}
              />
              <KPICard
                label="Open Defects"
                value={summary?.defects_found || 0}
                trend={{ value: trends.defects, direction: 'up' }}
                icon={AlertCircle}
                iconColor="orange"
                animationDelay={150}
              />
              <KPICard
                label="Test Coverage"
                value={`${coverage?.execution_coverage_pct?.toFixed(0) || '0'}%`}
                trend={{ value: trends.coverage, direction: 'neutral' }}
                icon={Shield}
                iconColor="purple"
                animationDelay={200}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-5 mb-6">
              <ExecutionTrendChart 
                data={trendData || []} 
                className="col-span-2"
                height={300}
              />
              <PassRateDonut 
                data={summary || {
                  total_executions: 0,
                  passed_count: 0,
                  failed_count: 0,
                  blocked_count: 0,
                  skipped_count: 0,
                  pass_rate: 0,
                  total_duration_seconds: 0,
                  defects_found: 0,
                  unique_cases_executed: 0,
                }}
              />
            </div>

            {/* Coverage Row */}
            <div className="grid grid-cols-3 gap-5 mb-6">
              <CoverageCard
                title="Test Coverage"
                value={coverage?.executed_test_cases || 0}
                total={coverage?.total_test_cases || 0}
                percentage={coverage?.execution_coverage_pct || 0}
              />
              <CoverageCard
                title="Automation Rate"
                value={coverage?.automated_test_cases || 0}
                total={coverage?.total_test_cases || 0}
                percentage={coverage?.automation_rate_pct || 0}
              />
              <CoverageCard
                title="Requirements Coverage"
                value={coverage?.covered_requirements || 0}
                total={coverage?.total_requirements || 100}
                percentage={coverage?.requirements_coverage_pct || 0}
              />
            </div>

            {/* Cycle Comparison */}
            <CycleComparisonTable cycles={cycles || []} />
          </>
        )}
      </main>
    </div>
  );
}

export default AnalyticsDashboardPage;
