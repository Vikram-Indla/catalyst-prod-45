// ============================================================
// PLANNER V9 DASHBOARD - FULL REDESIGN
// Per Design Audit: Compact, logical, no decoration
// Layout: KPI Strip → 3-column grid → Attention list
// ============================================================

import React, { useState } from 'react';
import { useDashboardData } from '../../hooks/usePlannerDashboard';
import { DashboardKPIStrip } from './DashboardKPIStrip';
import { DashboardStatusChartV2 } from './DashboardStatusChartV2';
import { DashboardWorkstreamHealthV2 } from './DashboardWorkstreamHealthV2';
import { DashboardUpcomingDeadlinesV2 } from './DashboardUpcomingDeadlinesV2';
import { DashboardTeamWorkloadV2 } from './DashboardTeamWorkloadV2';
import { DashboardSkeleton } from './DashboardSkeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, LayoutDashboard, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [dateRange, setDateRange] = useState('this-week');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchAll();
    setLastUpdated(new Date());
    setTimeout(() => setIsRefreshing(false), 800);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Format last updated time
  const formatLastUpdated = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="planner-v9 flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Dashboard Header - Per audit: Compact, with date selector */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <LayoutDashboard className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Planner Dashboard
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date range selector - Per audit: Missing enterprise feature */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-sprint">This Sprint</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Last updated indicator - Per audit: Missing enterprise feature */}
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Updated {formatLastUpdated()}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 h-8 text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Dashboard Content - Flex layout to expand Attention Required */}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto p-4 gap-4">
        {/* KPI Strip - Per audit: Single row, inline stats */}
        {metrics && (
          <DashboardKPIStrip 
            metrics={metrics} 
            unassignedCount={unassignedCount}
          />
        )}

        {/* Main Grid - Per audit: 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">
          {/* Status Distribution */}
          <DashboardStatusChartV2 data={statusDistribution} />
          
          {/* Workstream Health */}
          <DashboardWorkstreamHealthV2 data={workstreamHealth} />
          
          {/* Team Workload */}
          <DashboardTeamWorkloadV2 
            data={teamWorkload} 
            unassignedCount={unassignedCount} 
          />
        </div>

        {/* Attention Required - Full width, expands to fill remaining space */}
        <DashboardUpcomingDeadlinesV2 data={upcomingDeadlines} className="flex-1 min-h-[200px]" />
      </div>
    </div>
  );
}
