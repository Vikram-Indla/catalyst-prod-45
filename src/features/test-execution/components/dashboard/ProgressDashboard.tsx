/**
 * Module 3B-3: Main Progress Dashboard container
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useProgressDashboard } from '../../hooks/useProgressDashboard';
import { ProgressRing } from './ProgressRing';
import { MetricsGrid } from './MetricsGrid';
import { StatusBreakdown } from './StatusBreakdown';
import { WorkerActivityGrid } from './WorkerActivityGrid';
import { RecentResults } from './RecentResults';
import { TrendChart } from './TrendChart';
import { LiveIndicator } from './LiveIndicator';
import { Loader2 } from 'lucide-react';

interface ProgressDashboardProps {
  runId: string | null;
  className?: string;
}

export function ProgressDashboard({ runId, className }: ProgressDashboardProps) {
  const {
    summary,
    statusBreakdown,
    workers,
    recentResults,
    trendData,
    isLive,
    isLoading,
    toggleLive,
  } = useProgressDashboard(runId);

  if (!runId) {
    return (
      <div className={cn('flex items-center justify-center h-64 rounded-lg border bg-card', className)}>
        <p className="text-sm text-muted-foreground">Select a run to view progress</p>
      </div>
    );
  }

  if (isLoading && !summary) {
    return (
      <div className={cn('flex items-center justify-center h-64 rounded-lg border bg-card', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {summary?.name || 'Test Run Progress'}
          </h2>
          {summary && (
            <p className="text-sm text-muted-foreground">
              Run #{summary.run_number} • {summary.environment}
            </p>
          )}
        </div>
        <LiveIndicator isLive={isLive} onToggle={toggleLive} />
      </div>

      {/* Main Progress Section */}
      <div className="grid gap-6 lg:grid-cols-[auto,1fr]">
        {/* Progress Ring */}
        <div className="flex items-center justify-center lg:justify-start">
          <ProgressRing 
            percentage={summary?.completion_percentage ?? 0}
            label="Complete"
            size={180}
          />
        </div>

        {/* Metrics Grid */}
        <MetricsGrid summary={summary} />
      </div>

      {/* Status Breakdown */}
      <StatusBreakdown breakdown={statusBreakdown} />

      {/* Workers and Results */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WorkerActivityGrid workers={workers} />
        <RecentResults results={recentResults} maxHeight={250} />
      </div>

      {/* Trend Chart */}
      <TrendChart trendData={trendData} height={180} />
    </div>
  );
}
