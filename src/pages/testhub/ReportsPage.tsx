/**
 * Reports & Analytics Page — G24
 * Route: /testhub/reports
 */
import { useState } from 'react';
import { subDays } from 'date-fns';
import { BarChart3, TrendingUp, Target, FileText, Bug, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { KPICard } from '@/components/reports/KPICard';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ExecutionTrendChart } from '@/components/reports/ExecutionTrendChart';
import { ResultsPieChart } from '@/components/reports/ResultsPieChart';
import { ModuleBarChart } from '@/components/reports/ModuleBarChart';
import { TesterLeaderboard } from '@/components/reports/TesterLeaderboard';
import { SavedReportsList } from '@/components/reports/SavedReportsList';
import { ExportModal } from '@/components/reports/ExportModal';
import { useExecutionMetrics, useExecutionTrend, useCoverageMetrics, useResultsByFolder, useTesterPerformance } from '@/hooks/useReportAnalytics';
import { DateRange } from '@/types/reports';
import { ExportData } from '@/lib/reportExportUtils';

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30), end: new Date(), label: 'Last 30 days',
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showExport, setShowExport] = useState(false);

  const { data: execMetrics, isLoading: loadingExec, refetch: refetchExec } = useExecutionMetrics(dateRange.start, dateRange.end);
  const { data: trendData, isLoading: loadingTrend } = useExecutionTrend(dateRange.start, dateRange.end);
  const { data: coverageMetrics, isLoading: loadingCoverage } = useCoverageMetrics();
  const { data: folderMetrics, isLoading: loadingFolders } = useResultsByFolder(dateRange.start, dateRange.end);
  const { data: testerMetrics, isLoading: loadingTesters } = useTesterPerformance(dateRange.start, dateRange.end);

  const isLoading = loadingExec || loadingTrend || loadingCoverage;

  const exportData: ExportData = {
    title: 'Test Execution Report',
    generatedAt: new Date(),
    metrics: execMetrics as any,
    tableData: {
      headers: ['Module', 'Total', 'Passed', 'Failed', 'Pass Rate'],
      rows: (folderMetrics || []).map(f => [f.folder_name || 'Uncategorized', f.total, f.passed, f.failed, `${f.pass_rate}%`]),
    },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-xl font-semibold">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground">Track testing progress and metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ReportFilters dateRange={dateRange} onDateRangeChange={setDateRange} onRefresh={() => refetchExec()} isLoading={isLoading} />
          <Button variant="outline" onClick={() => setShowExport(true)}><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="saved">Saved Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <div className="grid grid-cols-4 gap-4">
            {loadingExec ? <>{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</> : <>
              <KPICard title="Pass Rate" value={`${execMetrics?.pass_rate || 0}%`} trend={{ direction: 'up', value: 'vs last period', isPositive: true }} icon={<TrendingUp className="h-5 w-5 text-green-600" />} />
              <KPICard title="Tests Executed" value={execMetrics?.total_executed?.toLocaleString() || '0'} subtitle={`${execMetrics?.passed || 0} passed, ${execMetrics?.failed || 0} failed`} icon={<Target className="h-5 w-5 text-blue-600" />} />
              <KPICard title="Execution Coverage" value={`${coverageMetrics?.execution_coverage || 0}%`} subtitle={`${coverageMetrics?.executed_tests || 0} of ${coverageMetrics?.total_tests || 0}`} icon={<FileText className="h-5 w-5 text-purple-600" />} />
              <KPICard title="Automation Coverage" value={`${coverageMetrics?.automation_coverage || 0}%`} subtitle={`${coverageMetrics?.automated_tests || 0} automated`} icon={<Bug className="h-5 w-5 text-orange-600" />} />
            </>}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <ExecutionTrendChart data={trendData || []} isLoading={loadingTrend} />
            <ResultsPieChart metrics={execMetrics} isLoading={loadingExec} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <ModuleBarChart data={folderMetrics || []} isLoading={loadingFolders} />
            <TesterLeaderboard data={testerMetrics || []} isLoading={loadingTesters} />
          </div>
        </TabsContent>

        <TabsContent value="execution" className="mt-6">
          <ExecutionTrendChart data={trendData || []} isLoading={loadingTrend} fullWidth />
        </TabsContent>

        <TabsContent value="coverage" className="mt-6">
          <div className="grid grid-cols-2 gap-6">
            <KPICard title="Execution Coverage" value={`${coverageMetrics?.execution_coverage || 0}%`} subtitle={`${coverageMetrics?.executed_tests || 0} of ${coverageMetrics?.total_tests || 0} test cases executed`} />
            <KPICard title="Automation Coverage" value={`${coverageMetrics?.automation_coverage || 0}%`} subtitle={`${coverageMetrics?.automated_tests || 0} automated, ${coverageMetrics?.manual_tests || 0} manual`} />
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          <SavedReportsList />
        </TabsContent>
      </Tabs>

      <ExportModal open={showExport} onClose={() => setShowExport(false)} data={exportData} />
    </div>
  );
}
