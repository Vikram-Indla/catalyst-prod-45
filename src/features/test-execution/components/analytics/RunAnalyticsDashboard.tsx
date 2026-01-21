/**
 * Module 4C-4: Main Run Analytics Dashboard
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Clock, Users, TrendingUp, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useRunSummaryAnalytics } from '../../hooks/useRunAnalytics';
import { RunExecutionTrendChart } from './RunExecutionTrendChart';
import { RunStatusPieChart } from './RunStatusPieChart';
import { RunTesterStatsTable } from './RunTesterStatsTable';
import { format } from 'date-fns';

interface RunAnalyticsDashboardProps {
  runId: string | null;
  className?: string;
}

export function RunAnalyticsDashboard({ runId, className }: RunAnalyticsDashboardProps) {
  const { data: summary, isLoading } = useRunSummaryAnalytics(runId);

  if (!runId) {
    return (
      <div className={cn('flex items-center justify-center h-64 rounded-lg border bg-card', className)}>
        <p className="text-sm text-muted-foreground">Select a run to view analytics</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={cn('flex items-center justify-center h-64 rounded-lg border bg-card', className)}>
        <p className="text-sm text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Run Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            {summary.runName} • Run #{summary.runNumber}
            {summary.startedAt && ` • Started ${format(new Date(summary.startedAt), 'MMM d, HH:mm')}`}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Pass Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {summary.passRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.passed} of {summary.passed + summary.failed + summary.blocked} executed
            </p>
          </CardContent>
        </Card>

        {/* Execution Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Execution Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {summary.executionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.totalCases - summary.notRun} of {summary.totalCases} cases
            </p>
          </CardContent>
        </Card>

        {/* Failed Tests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed / Blocked</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className="text-destructive">{summary.failed}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-warning">{summary.blocked}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.defectsLogged} defects logged
            </p>
          </CardContent>
        </Card>

        {/* Duration & Testers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time & Team</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(summary.avgDurationSeconds)}
              <span className="text-sm font-normal text-muted-foreground ml-1">avg</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.activeTesters} testers • {summary.totalDurationMinutes.toFixed(0)}m total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RunExecutionTrendChart runId={runId} />
        <RunStatusPieChart runId={runId} />
      </div>

      {/* Tester Stats Table */}
      <RunTesterStatsTable runId={runId} />
    </div>
  );
}
