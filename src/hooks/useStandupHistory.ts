/**
 * useStandupHistory — list view query for /project-hub/:key/standups
 *
 * Returns one row per past standup with derived counts:
 *   - n_speakers          — count(standup_events)
 *   - n_status_changes    — count(standup_status_changes)
 *   - triggered_by_name   — joined from profiles via started_by
 *   - triggered_by_avatar — joined from profiles via started_by
 *
 * Two-query strategy: fetch standups first, then fan-out child counts
 * and triggerer profiles via `.in()`. That keeps every call to one
 * round trip per source table — no N+1, no view dependency.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type StandupSummaryStatus = 'pending' | 'generating' | 'ready' | 'failed';

export interface StandupHistoryRow {
  id: string;
  project_key: string;
  started_at: string;
  ended_at: string | null;
  /** seconds between started_at and ended_at, null while still open */
  duration_seconds: number | null;
  summary_status: StandupSummaryStatus;
  summary_md: string | null;
  triggered_by_id: string | null;
  triggered_by_name: string | null;
  triggered_by_avatar: string | null;
  n_speakers: number;
  n_status_changes: number;
}

export function useStandupHistory(projectKey: string | undefined) {
  return useQuery<StandupHistoryRow[]>({
    queryKey: ['standup-history', projectKey],
    enabled: !!projectKey,
    queryFn: async () => {
      if (!projectKey) return [];

      const { data: standups, error } = await (supabase as any)
        .from('standups')
        .select('id, project_key, started_at, ended_at, started_by, summary_status, summary_md')
        .eq('project_key', projectKey)
        .order('started_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      const rows = (standups ?? []) as Array<{
        id: string;
        project_key: string;
        started_at: string;
        ended_at: string | null;
        started_by: string | null;
        summary_status: StandupSummaryStatus;
        summary_md: string | null;
      }>;
      if (rows.length === 0) return [];

      const standupIds = rows.map(r => r.id);
      const triggererIds = [...new Set(rows.map(r => r.started_by).filter(Boolean) as string[])];

      const [eventsRes, changesRes, profilesRes] = await Promise.all([
        (supabase as any).from('standup_events').select('standup_id').in('standup_id', standupIds),
        (supabase as any).from('standup_status_changes').select('standup_id').in('standup_id', standupIds),
        triggererIds.length
          ? (supabase as any).from('profiles').select('id, full_name, avatar_url').in('id', triggererIds)
          : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; avatar_url: string | null }> }),
      ]);

      const speakerCount = new Map<string, number>();
      for (const e of (eventsRes.data ?? []) as Array<{ standup_id: string }>) {
        speakerCount.set(e.standup_id, (speakerCount.get(e.standup_id) ?? 0) + 1);
      }
      const changeCount = new Map<string, number>();
      for (const c of (changesRes.data ?? []) as Array<{ standup_id: string }>) {
        changeCount.set(c.standup_id, (changeCount.get(c.standup_id) ?? 0) + 1);
      }
      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      for (const p of (profilesRes.data ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null }>) {
        profileMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url });
      }

      return rows.map(r => {
        const profile = r.started_by ? profileMap.get(r.started_by) : undefined;
        const duration = r.ended_at
          ? Math.max(0, Math.floor((new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 1000))
          : null;
        return {
          id: r.id,
          project_key: r.project_key,
          started_at: r.started_at,
          ended_at: r.ended_at,
          duration_seconds: duration,
          summary_status: r.summary_status,
          summary_md: r.summary_md,
          triggered_by_id: r.started_by,
          triggered_by_name: profile?.full_name ?? null,
          triggered_by_avatar: profile?.avatar_url ?? null,
          n_speakers: speakerCount.get(r.id) ?? 0,
          n_status_changes: changeCount.get(r.id) ?? 0,
        };
      });
    },
    staleTime: 30_000,
  });
}
