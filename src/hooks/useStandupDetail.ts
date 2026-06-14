/**
 * useStandupDetail — single-standup query for the detail page at
 * /project-hub/:key/standups/:standupId.
 *
 * Pulls the standups row + its three child relations in one cycle:
 *   - standup_events       (speaker timeline)
 *   - standup_status_changes (ticket moves during the standup)
 *   - profiles             (triggerer's full_name + avatar)
 *
 * transcript_chunks lives directly on the standups row as JSONB.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StandupSummaryStatus } from './useStandupHistory';

export interface StandupTranscriptChunk {
  ts: string;
  text: string;
}

export interface StandupTurn {
  id: string;
  speaker_name: string;
  started_at: string;
  ended_at: string | null;
  timer_seconds: number | null;
  notes: string | null;
}

export interface StandupStatusChange {
  id: string;
  speaker_name: string;
  issue_id: string;
  issue_key: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  ai_explanation: string | null;
  /** Auth-user id of whoever actually clicked drag/drop. */
  changed_by_user_id: string | null;
  /** Resolved from profiles on read. */
  changed_by_name: string | null;
  changed_by_avatar: string | null;
}

export interface StandupDetail {
  id: string;
  project_key: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  summary_md: string | null;
  summary_status: StandupSummaryStatus;
  triggered_by_id: string | null;
  triggered_by_name: string | null;
  triggered_by_avatar: string | null;
  transcript_chunks: StandupTranscriptChunk[];
  turns: StandupTurn[];
  status_changes: StandupStatusChange[];
}

export function useStandupDetail(standupId: string | undefined) {
  return useQuery<StandupDetail | null>({
    queryKey: ['standup-detail', standupId],
    enabled: !!standupId,
    /* Poll every 3s while the summary is still being generated or hasn't
       been kicked off yet, so the page surfaces the markdown the moment
       the edge function writes it — no manual refresh needed. The poll
       auto-stops once we're in a terminal state (ready / failed) by
       returning false. Returning false here disables the interval per
       React Query's contract. */
    refetchInterval: (query) => {
      const status = query.state.data?.summary_status;
      if (status === 'pending' || status === 'generating') return 3_000;
      return false;
    },
    /* Short staleTime so a freshly-generated summary surfaces on the
       next focus tick without a hard reload. */
    staleTime: 2_000,
    queryFn: async () => {
      if (!standupId) return null;

      const { data: standup, error } = await (supabase as any)
        .from('standups')
        .select('id, project_key, started_at, ended_at, started_by, summary_md, summary_status, transcript_chunks')
        .eq('id', standupId)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null; // row not found
        throw new Error(error.message);
      }
      if (!standup) return null;

      const [turnsRes, changesRawRes, profileRes] = await Promise.all([
        (supabase as any)
          .from('standup_events')
          .select('id, speaker_name, started_at, ended_at, timer_seconds, notes')
          .eq('standup_id', standupId)
          .order('started_at'),
        (supabase as any)
          .from('standup_status_changes')
          .select('id, speaker_name, issue_id, issue_key, from_status, to_status, changed_at, ai_explanation, changed_by_user_id')
          .eq('standup_id', standupId)
          .order('changed_at'),
        standup.started_by
          ? (supabase as any)
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', standup.started_by)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      /* Resolve changed_by_user_id → profile in one batched call so the
         status-changes list shows "by <actual user>" with avatar. */
      const changesRaw = (changesRawRes.data ?? []) as Array<{
        id: string; speaker_name: string; issue_id: string; issue_key: string;
        from_status: string | null; to_status: string; changed_at: string;
        ai_explanation: string | null; changed_by_user_id: string | null;
      }>;
      const actorIds = [...new Set(changesRaw.map(c => c.changed_by_user_id).filter(Boolean) as string[])];
      const actorProfileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      if (actorIds.length > 0) {
        const { data: actorRows } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', actorIds);
        for (const p of (actorRows ?? []) as Array<{ id: string; full_name: string | null; avatar_url: string | null }>) {
          actorProfileMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url });
        }
      }
      const status_changes: StandupStatusChange[] = changesRaw.map(c => {
        const actor = c.changed_by_user_id ? actorProfileMap.get(c.changed_by_user_id) : undefined;
        return {
          ...c,
          changed_by_name: actor?.full_name ?? null,
          changed_by_avatar: actor?.avatar_url ?? null,
        };
      });

      const duration = standup.ended_at
        ? Math.max(0, Math.floor((new Date(standup.ended_at).getTime() - new Date(standup.started_at).getTime()) / 1000))
        : null;

      return {
        id: standup.id,
        project_key: standup.project_key,
        started_at: standup.started_at,
        ended_at: standup.ended_at,
        duration_seconds: duration,
        summary_md: standup.summary_md,
        summary_status: standup.summary_status,
        triggered_by_id: standup.started_by,
        triggered_by_name: profileRes.data?.full_name ?? null,
        triggered_by_avatar: profileRes.data?.avatar_url ?? null,
        transcript_chunks: (standup.transcript_chunks ?? []) as StandupTranscriptChunk[],
        turns: (turnsRes.data ?? []) as StandupTurn[],
        status_changes,
      };
    },
  });
}
