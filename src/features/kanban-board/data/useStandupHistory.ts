/**
 * useStandupHistory — lazy-loaded standup session history for a project.
 * Only the last 14 days are shown; older sessions are not surfaced.
 * `enabled` gates the fetch so the panel loads on open, not on mount.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StandupChange, StandupComment } from './standupCapture';

export interface StandupSession {
  id: string;
  project_key: string;
  driver_id: string;
  driver_name: string | null;
  driver_avatar_url: string | null;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  timer_set_sec: number | null;
  is_valid: boolean;
  summary_text: string | null;
  changes_json: StandupChange[];
  comments_json: StandupComment[];
  created_at: string;
}

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export function useStandupHistory(projectKey: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['standup-history', projectKey],
    enabled: enabled && !!projectKey,
    staleTime: 60_000,
    queryFn: async (): Promise<StandupSession[]> => {
      const since = new Date(Date.now() - FOURTEEN_DAYS_MS).toISOString();
      const { data, error } = await (supabase as any)
        .from('standup_sessions')
        .select('*')
        .eq('project_key', projectKey)
        .gte('started_at', since)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as StandupSession[];
    },
  });
}
