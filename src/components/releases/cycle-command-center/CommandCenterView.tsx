/**
 * Command Center Dashboard View
 * Main dashboard with metrics, charts, and activity feed
 */

import React from 'react';
import { 
  Layers, CheckCircle, XCircle, AlertTriangle, 
  PlayCircle, Clock, BarChart3, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CATALYST_V5, TEST_STATUS_COLORS } from '@/lib/catalyst-colors';
import type { TestCycle, CycleStats } from '@/hooks/test-cycles/useCycleDetails';
import { SummaryMetricCards } from './SummaryMetricCards';
import { StatusDonutChart } from './StatusDonutChart';
import { ExecutionProgressChart } from './ExecutionProgressChart';
import { TeamWorkloadBars } from './TeamWorkloadBars';
import { ActivityFeed } from './ActivityFeed';

interface CommandCenterViewProps {
  cycle: TestCycle | undefined;
  stats: CycleStats | undefined;
  isLoading: boolean;
  onStatusFilter: (status: string | null) => void;
}

export function CommandCenterView({ 
  cycle, 
  stats, 
  isLoading, 
  onStatusFilter 
}: CommandCenterViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Metrics Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        
        {/* Bottom Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Summary Metric Cards */}
      <SummaryMetricCards stats={stats} onStatusFilter={onStatusFilter} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Execution Progress Chart */}
        <ExecutionProgressChart cycleId={cycle?.id || ''} />
        
        {/* Status Donut Chart */}
        <StatusDonutChart stats={stats} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Workload */}
        <TeamWorkloadBars cycleId={cycle?.id || ''} />
        
        {/* Activity Feed */}
        <ActivityFeed cycleId={cycle?.id || ''} />
      </div>
    </div>
  );
}
