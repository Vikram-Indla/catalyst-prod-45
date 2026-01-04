/**
 * Reports Page
 * Comprehensive test management reports and analytics with multiple tabs
 */

import React, { useState } from 'react';
import { subDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// Mock project and cycle data
const MOCK_PROJECTS = [
  { id: 'proj-1', name: 'Mobile Banking App' },
  { id: 'proj-2', name: 'Web Portal' },
  { id: 'proj-3', name: 'API Gateway' },
];

const MOCK_CYCLES = [
  { id: 'CY-015', name: 'Sprint 24 Regression' },
  { id: 'CY-014', name: 'Sprint 23 Regression' },
  { id: 'CY-013', name: 'Q4 Release' },
  { id: 'CY-012', name: 'Security Audit' },
];

export function ReportsPage() {
  const [filters, setFilters] = useState<ReportFiltersState>({
    projectId: null,
    cycleId: null,
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    preset: '30days',
  });

  const [activeTab, setActiveTab] = useState('dashboard');

  const handleRefresh = () => {
    // Trigger refetch of data
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
        projects={MOCK_PROJECTS}
        cycles={MOCK_CYCLES}
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
          <DashboardTab />
        </TabsContent>

        <TabsContent value="execution" className="mt-6">
          <ExecutionTab />
        </TabsContent>

        <TabsContent value="traceability" className="mt-6">
          <TraceabilityTab />
        </TabsContent>

        <TabsContent value="burndown" className="mt-6">
          <BurndownTab />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ReportsPage;
