/**
 * Reports Page
 * Comprehensive test management reports and analytics with multiple tabs
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { subDays, format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ReportFilters,
  ReportFiltersState,
  DashboardTab,
  ExecutionTab,
  TraceabilityTab,
  BurndownTab,
  TeamTab,
  ExportDropdown,
} from '../components/reports';
import { 
  useReportSummary, 
  useExecutionTrend, 
  useExecutionReport,
  useTraceabilityMatrix, 
  useBurndownData, 
  useTeamPerformance, 
  useRecentActivity,
  useCycleProgress,
  useTestCycles,
  useProjects
} from '@/hooks/test-management';
import { useProjectStore } from '../stores/projectStore';

export function ReportsPage() {
  const [searchParams] = useSearchParams();
  
  // Get project ID from store or search params
  const selectedProjectId = useProjectStore(s => s.selectedProjectId);
  const projectId = selectedProjectId || searchParams.get('projectId') || undefined;

  const [filters, setFilters] = useState<ReportFiltersState>({
    projectId: projectId || null,
    cycleId: null,
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    preset: '30days',
  });

  const [activeTab, setActiveTab] = useState('dashboard');

  // Convert date range to string format for hooks
  const dateRange = useMemo(() => ({
    from: filters.dateRange.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
    to: filters.dateRange.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
  }), [filters.dateRange]);

  // Fetch data using hooks
  const { data: summary, isLoading: summaryLoading } = useReportSummary(projectId, dateRange);
  const { data: trendData = [], isLoading: trendLoading } = useExecutionTrend(projectId, dateRange, filters.cycleId || undefined);
  const { data: executionReport, isLoading: reportLoading } = useExecutionReport(projectId, filters.cycleId || undefined);
  const { data: traceability, isLoading: traceLoading } = useTraceabilityMatrix(projectId);
  const { data: burndown, isLoading: burndownLoading } = useBurndownData(filters.cycleId || undefined);
  const { data: teamPerformance = [], isLoading: teamLoading } = useTeamPerformance(projectId, dateRange);
  const { data: recentActivity = [], isLoading: activityLoading } = useRecentActivity(projectId, 10);
  const { data: cycleProgress = [], isLoading: progressLoading } = useCycleProgress(projectId);
  const { data: cycles = [] } = useTestCycles(projectId);
  const { data: projects = [] } = useProjects();

  // Map projects to dropdown format
  const projectOptions = useMemo(() => 
    projects.map(p => ({ id: p.id, name: p.name })),
    [projects]
  );

  // Map cycles to dropdown format
  const cycleOptions = useMemo(() => 
    cycles.map(c => ({ id: c.id, name: `${c.key}: ${c.name}` })),
    [cycles]
  );

  const handleRefresh = () => {
    // React Query will refetch when filters change
    console.log('Refreshing reports with filters:', filters);
  };

  const handleExport = (format: string) => {
    console.log('Exporting report as:', format, 'with filters:', filters);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Actions (title is in module header) */}
      <div className="flex items-center justify-end">
        <ExportDropdown onExport={handleExport} />
      </div>

      {/* Global Filters */}
      <ReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={handleRefresh}
        projects={projectOptions}
        cycles={cycleOptions}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="traceability">Traceability</TabsTrigger>
          <TabsTrigger value="burndown">Burndown</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <DashboardTab 
            summary={summary}
            summaryLoading={summaryLoading}
            trendData={trendData}
            trendLoading={trendLoading}
            cycleProgress={cycleProgress}
            progressLoading={progressLoading}
            recentActivity={recentActivity}
            activityLoading={activityLoading}
          />
        </TabsContent>

        <TabsContent value="execution" className="mt-6">
          <ExecutionTab 
            summary={summary}
            summaryLoading={summaryLoading}
            executionReport={executionReport}
            reportLoading={reportLoading}
          />
        </TabsContent>

        <TabsContent value="traceability" className="mt-6">
          <TraceabilityTab 
            traceability={traceability as any}
            isLoading={traceLoading}
          />
        </TabsContent>

        <TabsContent value="burndown" className="mt-6">
          <BurndownTab 
            burndown={burndown}
            isLoading={burndownLoading}
            cycles={cycleOptions}
            selectedCycleId={filters.cycleId}
            onCycleChange={(cycleId) => setFilters({ ...filters, cycleId })}
          />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamTab 
            teamPerformance={teamPerformance}
            isLoading={teamLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ReportsPage;
