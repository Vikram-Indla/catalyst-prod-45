// ============================================================
// PLANNER V9 DASHBOARD - MAIN COMPONENT
// Ring-fenced design system with real-time metrics
// ============================================================

import React, { useState } from 'react';
import { useDashboardData } from '../../hooks/usePlannerDashboard';
import { DashboardMetricCards } from './DashboardMetricCards';
import { DashboardStatusChart } from './DashboardStatusChart';
import { DashboardWorkstreamHealth } from './DashboardWorkstreamHealth';
import { DashboardUpcomingDeadlines } from './DashboardUpcomingDeadlines';
import { DashboardTeamWorkload } from './DashboardTeamWorkload';
import { DashboardSkeleton } from './DashboardSkeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PlannerDashboard() {
  const {
    metrics,
    statusDistribution,
    workstreamHealth,
    upcomingDeadlines,
    teamWorkload,
    unassignedCount,
    isLoading,
    refetchAll,
  } = useDashboardData();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchAll();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="planner-v9 flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
            <LayoutDashboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Planner Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Real-time task metrics and team performance
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Metric Cards Row */}
        {metrics && <DashboardMetricCards metrics={metrics} />}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution Donut */}
          <DashboardStatusChart data={statusDistribution} />
          
          {/* Workstream Health */}
          <DashboardWorkstreamHealth data={workstreamHealth} />
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Deadlines */}
          <DashboardUpcomingDeadlines data={upcomingDeadlines} />
          
          {/* Team Workload */}
          <DashboardTeamWorkload 
            data={teamWorkload} 
            unassignedCount={unassignedCount} 
          />
        </div>
      </div>
    </div>
  );
}
