/**
 * useCommandCenter — Data hooks for TestHub Command Center (Group 16)
 * Migrated to TanStack React Query for caching, auto-refresh, and error handling.
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── KPIs ──────────────────────────────────────────────────
export interface CommandCenterKPIs {
  active_releases: number;
  total_test_cases: number;
  executed_test_cases: number;
  passed_test_cases: number;
  failed_test_cases: number;
  open_defects: number;
  critical_defects: number;
  active_testers: number;
}

export interface KPITrend {
  direction: 'up' | 'down' | 'flat';
  delta: number;
}

export interface KPIsWithTrends {
  current: CommandCenterKPIs;
  trends: {
    active_releases: KPITrend;
    pass_rate: KPITrend;
    exec_rate: KPITrend;
    open_defects: KPITrend;
    critical_defects: KPITrend;
    active_testers: KPITrend;
  };
}

function calcTrend(current: number, previous: number): KPITrend {
  const delta = current - previous;
  return {
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    delta: Math.abs(delta),
  };
}

function calcRateTrend(curNum: number, curDen: number, prevNum: number, prevDen: number): KPITrend {
  const curRate = curDen > 0 ? Math.round((curNum / curDen) * 100) : 0;
  const prevRate = prevDen > 0 ? Math.round((prevNum / prevDen) * 100) : 0;
  const delta = curRate - prevRate;
  return {
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    delta: Math.abs(delta),
  };
}

export function useCommandCenterKPIs(projectId: string) {
  return useQuery<KPIsWithTrends | null>({
    queryKey: ['command-center-kpis', projectId],
    queryFn: async () => {
      const [currentRes, prevRes] = await Promise.all([
        supabase.rpc('get_command_center_kpis', { p_project_id: projectId }),
        supabase.rpc('get_command_center_kpis_previous', { p_project_id: projectId }),
      ]);
      if (currentRes.error) throw new Error(currentRes.error.message);
      if (prevRes.error) throw new Error(prevRes.error.message);

      const current = currentRes.data as unknown as CommandCenterKPIs;
      const prev = prevRes.data as unknown as CommandCenterKPIs;

      return {
        current,
        trends: {
          active_releases: calcTrend(current.active_releases, prev.active_releases),
          pass_rate: calcRateTrend(current.passed_test_cases, current.executed_test_cases, prev.passed_test_cases, prev.executed_test_cases),
          exec_rate: calcRateTrend(current.executed_test_cases, current.total_test_cases, prev.executed_test_cases, prev.total_test_cases),
          open_defects: calcTrend(current.open_defects, prev.open_defects),
          critical_defects: calcTrend(current.critical_defects, prev.critical_defects),
          active_testers: calcTrend(current.active_testers, prev.active_testers),
        },
      };
    },
    refetchInterval: 30000, // Auto-refresh every 30s
    staleTime: 15000,
  });
}

// ── Release Health Grid ───────────────────────────────────
export interface ReleaseHealthItem {
  id: string;
  name: string;
  version: string;
  status: string;
  health: string;
  test_cases_total: number;
  test_cases_passed: number;
  test_cases_executed: number;
  test_cases_failed: number;
  defects_open: number;
  critical_defects: number;
  target_date: string | null;
  progress: number;
  vehicle?: { name: string } | null;
}

export function useReleaseHealthGrid(projectId: string) {
  const query = useQuery<ReleaseHealthItem[]>({
    queryKey: ['release-health-grid', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('id, name, version, status, health, test_cases_total, test_cases_passed, test_cases_executed, test_cases_failed, defects_open, critical_defects, target_date, progress, vehicle:release_vehicles(name)')
        .eq('project_id', projectId)
        .not('status', 'in', '("released","archived")')
        .order('health', { ascending: true });
      if (error) throw new Error(error.message);
      return (data as any[]) || [];
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  return { releases: query.data || [], isLoading: query.isLoading, error: query.error };
}

// ── Defect Trends ─────────────────────────────────────────
export interface DefectTrendPoint {
  date: string;
  opened: number;
  closed: number;
}

export function useDefectTrends(projectId: string, days: number = 7) {
  return useQuery<DefectTrendPoint[]>({
    queryKey: ['defect-trends', projectId, days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cc_defect_trends', {
        p_project_id: projectId,
        p_days: days,
      });
      if (error) throw new Error(error.message);
      return (data as any[]) || [];
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// ── Team Performance ──────────────────────────────────────
export interface TeamMember {
  id: string;
  name: string;
  avatar_url: string | null;
  tests_executed: number;
  tests_passed: number;
  pass_rate: number;
}

export function useTeamPerformance(projectId: string) {
  return useQuery<TeamMember[]>({
    queryKey: ['team-performance', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cc_team_performance', {
        p_project_id: projectId,
      });
      if (error) throw new Error(error.message);
      return (data as any[]) || [];
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// ── Upcoming Milestones ───────────────────────────────────
export interface UpcomingMilestone {
  id: string;
  title: string;
  milestone_type: string;
  target_date: string | null;
  state: string;
  release_name: string | null;
  release_version: string | null;
}

export function useUpcomingMilestones(projectId: string) {
  return useQuery<UpcomingMilestone[]>({
    queryKey: ['upcoming-milestones', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('id, title, milestone_type, end_date, state, release:releases(name, version)')
        .not('release_id', 'is', null)
        .not('state', 'eq', 'completed')
        .order('end_date', { ascending: true })
        .limit(10);
      if (error) throw new Error(error.message);
      return (data as any[] || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        milestone_type: m.milestone_type,
        target_date: m.end_date,
        state: m.state || 'pending',
        release_name: m.release?.name || null,
        release_version: m.release?.version || null,
      }));
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// ── Activity Feed (Realtime) ──────────────────────────────
export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  metadata: any;
  user_id: string | null;
  created_at: string;
}

export function useActivityFeed(projectId: string, isPaused: boolean = false) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial fetch
  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('cc_activity_log')
          .select('id, type, message, metadata, user_id, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) throw new Error(error.message);
        setItems((data as any[]) || []);
      } catch (err) {
        console.error('Activity feed error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [projectId]);

  // Realtime subscription
  useEffect(() => {
    if (isPaused) return;

    const channel = supabase
      .channel('cc-activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cc_activity_log',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newItem = payload.new as ActivityItem;
          setItems((prev) => [newItem, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, isPaused]);

  return { items, isLoading };
}
