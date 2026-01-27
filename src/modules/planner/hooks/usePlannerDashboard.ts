/**
 * Planner Dashboard Hooks - V9
 * TanStack Query hooks for dashboard data
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  DashboardMetrics,
  StatusDistribution,
  WorkstreamHealth,
  UpcomingDeadline,
  TeamWorkload,
} from '../types/planner-dashboard';

const STALE_TIME = 30 * 1000; // 30 seconds
const REFETCH_INTERVAL = 60 * 1000; // 60 seconds

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useDashboardMetrics
// ═══════════════════════════════════════════════════════════════════════════════
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['planner', 'dashboard', 'metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      const { data, error } = await supabase
        .from('planner_dashboard_metrics')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as unknown as DashboardMetrics;
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useStatusDistribution
// ═══════════════════════════════════════════════════════════════════════════════
export function useStatusDistribution() {
  return useQuery({
    queryKey: ['planner', 'dashboard', 'status-distribution'],
    queryFn: async (): Promise<StatusDistribution[]> => {
      const { data, error } = await supabase
        .from('planner_dashboard_status_distribution')
        .select('*')
        .order('position');
      
      if (error) throw error;
      return (data || []) as StatusDistribution[];
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useWorkstreamHealth
// ═══════════════════════════════════════════════════════════════════════════════
export function useWorkstreamHealth() {
  return useQuery({
    queryKey: ['planner', 'dashboard', 'workstream-health'],
    queryFn: async (): Promise<WorkstreamHealth[]> => {
      const { data, error } = await supabase
        .from('planner_dashboard_workstream_health')
        .select('*');
      
      if (error) throw error;
      return (data || []) as unknown as WorkstreamHealth[];
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useUpcomingDeadlines
// ═══════════════════════════════════════════════════════════════════════════════
export function useUpcomingDeadlines() {
  return useQuery({
    queryKey: ['planner', 'dashboard', 'upcoming-deadlines'],
    queryFn: async (): Promise<UpcomingDeadline[]> => {
      const { data, error } = await supabase
        .from('planner_dashboard_upcoming_deadlines')
        .select('*');
      
      if (error) throw error;
      return (data || []) as unknown as UpcomingDeadline[];
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useTeamWorkload
// ═══════════════════════════════════════════════════════════════════════════════
export function useTeamWorkload() {
  return useQuery({
    queryKey: ['planner', 'dashboard', 'team-workload'],
    queryFn: async (): Promise<TeamWorkload[]> => {
      const { data, error } = await supabase
        .from('planner_dashboard_team_workload')
        .select('*');
      
      if (error) throw error;
      return (data || []) as TeamWorkload[];
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useUnassignedCount
// ═══════════════════════════════════════════════════════════════════════════════
export function useUnassignedCount() {
  return useQuery({
    queryKey: ['planner', 'dashboard', 'unassigned-count'],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .rpc('get_unassigned_task_count');
      
      if (error) throw error;
      return data ?? 0;
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useDashboardData (Combined)
// ═══════════════════════════════════════════════════════════════════════════════
export function useDashboardData() {
  const queryClient = useQueryClient();
  
  const metrics = useDashboardMetrics();
  const statusDistribution = useStatusDistribution();
  const workstreamHealth = useWorkstreamHealth();
  const upcomingDeadlines = useUpcomingDeadlines();
  const teamWorkload = useTeamWorkload();
  const unassignedCount = useUnassignedCount();
  
  const refetchAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['planner', 'dashboard'] }),
    ]);
  };
  
  const isLoading = 
    metrics.isLoading || 
    statusDistribution.isLoading || 
    workstreamHealth.isLoading ||
    upcomingDeadlines.isLoading ||
    teamWorkload.isLoading;
  
  const isError = 
    metrics.isError || 
    statusDistribution.isError || 
    workstreamHealth.isError ||
    upcomingDeadlines.isError ||
    teamWorkload.isError;

  return {
    metrics: metrics.data,
    statusDistribution: statusDistribution.data ?? [],
    workstreamHealth: workstreamHealth.data ?? [],
    upcomingDeadlines: upcomingDeadlines.data ?? [],
    teamWorkload: teamWorkload.data ?? [],
    unassignedCount: unassignedCount.data ?? 0,
    isLoading,
    isError,
    refetchAll,
  };
}
