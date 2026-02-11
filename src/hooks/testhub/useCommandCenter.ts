/**
 * useCommandCenter — Data hooks for TestHub Command Center (Group 16)
 */
import { useState, useEffect, useCallback } from 'react';
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

export function useCommandCenterKPIs(projectId: string) {
  const [data, setData] = useState<CommandCenterKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.rpc('get_command_center_kpis', {
        p_project_id: projectId,
      });
      if (error) throw new Error(error.message);
      setData(result as any);
    } catch (err) {
      console.error('KPI fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, refetch: fetch };
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
  const [releases, setReleases] = useState<ReleaseHealthItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('releases')
          .select('id, name, version, status, health, test_cases_total, test_cases_passed, test_cases_executed, test_cases_failed, defects_open, critical_defects, target_date, progress, vehicle:release_vehicles(name)')
          .eq('project_id', projectId)
          .not('status', 'in', '("released","archived")')
          .order('health', { ascending: true });
        if (error) throw new Error(error.message);
        setReleases((data as any[]) || []);
      } catch (err) {
        console.error('Health grid error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [projectId]);

  return { releases, isLoading };
}

// ── Defect Trends ─────────────────────────────────────────
export interface DefectTrendPoint {
  date: string;
  opened: number;
  closed: number;
}

export function useDefectTrends(projectId: string, days: number = 7) {
  const [data, setData] = useState<DefectTrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const { data: result, error } = await supabase.rpc('get_cc_defect_trends', {
          p_project_id: projectId,
          p_days: days,
        });
        if (error) throw new Error(error.message);
        setData((result as any[]) || []);
      } catch (err) {
        console.error('Defect trends error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [projectId, days]);

  return { data, isLoading };
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
  const [data, setData] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const { data: result, error } = await supabase.rpc('get_cc_team_performance', {
          p_project_id: projectId,
        });
        if (error) throw new Error(error.message);
        setData((result as any[]) || []);
      } catch (err) {
        console.error('Team performance error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [projectId]);

  return { data, isLoading };
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
  const [data, setData] = useState<UpcomingMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const { data: milestones, error } = await supabase
          .from('milestones')
          .select('id, title, milestone_type, end_date, state, release:releases(name, version)')
          .not('release_id', 'is', null)
          .not('state', 'eq', 'completed')
          .order('end_date', { ascending: true })
          .limit(10);
        if (error) throw new Error(error.message);
        setData(
          (milestones as any[] || []).map((m: any) => ({
            id: m.id,
            title: m.title,
            milestone_type: m.milestone_type,
            target_date: m.end_date,
            state: m.state || 'pending',
            release_name: m.release?.name || null,
            release_version: m.release?.version || null,
          }))
        );
      } catch (err) {
        console.error('Milestones error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [projectId]);

  return { data, isLoading };
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
