// ============================================================
// PLANNER V9 DASHBOARD - V2 REDESIGN
// Per V2 Spec: Role banner, workstream filter, NO "This Sprint"
// Layout: Role Banner → KPI Strip → 3-column grid → Attention
// ============================================================

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDashboardData } from '../../hooks/usePlannerDashboard';
import { usePlannerWorkstreams } from '../../hooks/usePlannerWorkstreams';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardWorkstreamFilter } from './DashboardWorkstreamFilter';
import { DashboardKPIStrip } from './DashboardKPIStrip';
import { DashboardStatusChartV2 } from './DashboardStatusChartV2';
import { DashboardWorkstreamHealthV2 } from './DashboardWorkstreamHealthV2';
import { DashboardUpcomingDeadlinesV2 } from './DashboardUpcomingDeadlinesV2';
import { DashboardTeamWorkloadV2 } from './DashboardTeamWorkloadV2';
import { DashboardSkeleton } from './DashboardSkeleton';
import { CreateTaskModal } from '../kanban';
import { TaskDetailDrawer } from '../TaskDetailDrawer/TaskDetailDrawer';
import { Button } from '@/components/ui/button';
import { RefreshCw, LayoutDashboard, Calendar, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function PlannerDashboard() {
  const { user } = useAuth();
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
  
  const { data: workstreams = [] } = usePlannerWorkstreams();

  // Check if user can access all workstreams via RPC
  const { data: canViewAll = false } = useQuery({
    queryKey: ['can-access-all-workstreams', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc('can_access_all_workstreams', {
        _user_id: user.id
      });
      if (error) {
        console.error('Error checking workstream access:', error);
        return false;
      }
      return data === true;
    },
    enabled: !!user?.id,
    staleTime: 60000, // Cache for 1 minute
  });

  // Get user role from profile table
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('this-week');
  const [workstreamFilter, setWorkstreamFilter] = useState<'my' | 'all' | string>('my');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleCloseDrawer = () => {
    setSelectedTaskId(null);
  };
  // Get user role from profile
  const userRole = userProfile?.role || 'member';
  
  // Get user's assigned workstreams
  const assignedWorkstreams = useMemo(() => {
    return workstreams.map(ws => ({
      id: ws.id,
      name: ws.name,
      color: ws.color || '#64748b',
    }));
  }, [workstreams]);

  // Determine if viewing all based on filter and role
  const isViewingAll = workstreamFilter === 'all' && canViewAll;

  // Filter dashboard data based on workstream filter
  const filteredWorkstreamHealth = useMemo(() => {
    if (workstreamFilter === 'all' || workstreamFilter === 'my') {
      return workstreamHealth;
    }
    return workstreamHealth.filter(ws => ws.workstream_id === workstreamFilter);
  }, [workstreamHealth, workstreamFilter]);

  const filteredUpcomingDeadlines = useMemo(() => {
    if (workstreamFilter === 'all' || workstreamFilter === 'my') {
      return upcomingDeadlines;
    }
    // Filter by workstream
    const selectedWs = workstreams.find(ws => ws.id === workstreamFilter);
    if (!selectedWs) return upcomingDeadlines;
    return upcomingDeadlines.filter(d => d.workstream_name === selectedWs.name);
  }, [upcomingDeadlines, workstreamFilter, workstreams]);

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
      {/* Dashboard Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <LayoutDashboard className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Planner Dashboard
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Workstream filter - Per V2 spec */}
          <DashboardWorkstreamFilter
            workstreams={assignedWorkstreams}
            selectedFilter={workstreamFilter}
            onFilterChange={setWorkstreamFilter}
            canViewAll={canViewAll}
          />
          
          {/* Date range selector - Per V2: NO "This Sprint" option */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              {/* NO "This Sprint" per V2 spec */}
            </SelectContent>
          </Select>
          
          {/* Last updated indicator - hide on mobile */}
          <span className="hidden md:inline text-xs text-slate-400 dark:text-slate-500">
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
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          
          {/* Add Task Button */}
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        </div>
      </div>

      {/* Dashboard Content - Responsive padding */}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto p-3 sm:p-4 gap-3 sm:gap-4">
        {/* KPI Strip with Role Context on right */}
        {metrics && (
          <DashboardKPIStrip 
            metrics={metrics} 
            unassignedCount={unassignedCount}
            userRole={userRole}
            assignedWorkstreams={assignedWorkstreams}
            isViewingAll={isViewingAll}
          />
        )}

        {/* Main Grid - 3-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 shrink-0">
          {/* Status Distribution */}
          <DashboardStatusChartV2 data={statusDistribution} />
          
          {/* Team Workload */}
          <DashboardTeamWorkloadV2 
            data={teamWorkload} 
            unassignedCount={unassignedCount} 
          />
          
          {/* Workstream Health */}
          <DashboardWorkstreamHealthV2 data={filteredWorkstreamHealth} />
        </div>

        {/* Attention Required - Full width */}
        <DashboardUpcomingDeadlinesV2 
          data={filteredUpcomingDeadlines} 
          className="flex-1 min-h-[200px]"
          onTaskClick={handleTaskClick}
        />
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
