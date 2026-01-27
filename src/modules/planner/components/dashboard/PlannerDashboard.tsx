// ============================================================
// PLANNER V9 DASHBOARD - MAIN COMPONENT
// Ring-fenced design system with real-time metrics
// ============================================================

import React from 'react';
import { useDashboardData } from '../../hooks/usePlannerDashboard';
import { DashboardMetricCards } from './DashboardMetricCards';
import { DashboardStatusChart } from './DashboardStatusChart';
import { DashboardWorkstreamHealth } from './DashboardWorkstreamHealth';
import { DashboardUpcomingDeadlines } from './DashboardUpcomingDeadlines';
import { DashboardTeamWorkload } from './DashboardTeamWorkload';
import { DashboardSkeleton } from './DashboardSkeleton';

export function PlannerDashboard() {
  const {
    metrics,
    statusDistribution,
    workstreamHealth,
    upcomingDeadlines,
    teamWorkload,
    unassignedCount,
    isLoading,
  } = useDashboardData();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="planner-v9 flex flex-col h-full bg-slate-50 dark:bg-slate-900">
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
