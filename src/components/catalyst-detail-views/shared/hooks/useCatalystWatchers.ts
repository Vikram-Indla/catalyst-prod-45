/**
 * useCatalystWatchers — read + toggle watcher state on a ph_issues row.
 *
 * Backed by ph_issue_watchers (issue_key text, user_id uuid).
 *
 * Migration: see supabase/migrations/20260511124646_create_ph_issue_watchers.sql
 *   - SELECT: all authenticated users (so the watcher count is shared visibility)
 *   - INSERT/DELETE: only user.id = auth.uid() (you can only add/remove yourself)
 *
 * Note on `(supabase as any)` cast: ph_issue_watchers is not yet present in
 * `src/integrations/supabase/types.ts`. The cast is structurally necessary
 * until types are regenerated via Lovable. Runtime queries work — TypeScript
 * just can't verify column shapes. Once types are regenerated, remove the
 * casts at lines 35, 76, 83.
 *
 * History:
 *   2026-05-03 — table first created via Lovable SQL editor; never committed
 *   2026-05-08 — onError toast added; CLAUDE.md lesson noted cast was a smell
 *   2026-05-11 — Vikram re-ran SQL via Lovable; migration committed to repo
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface WatcherProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export interface WatcherSummary {
  count: number;
  isWatching: boolean;
  watchers: WatcherProfile[];
}

export function useCatalystWatchers(issueKey: string | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['cv-watchers', issueKey],
    enabled: !!issueKey,
    queryFn: async (): Promise<WatcherSummary> => {
      if (!issueKey) return { count: 0, isWatching: false, watchers: [] };
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await (supabase as any)
        .from('ph_issue_watchers')
        .select('user_id')
        .eq('issue_key', issueKey);

      if (error) {
        // ph_issue_watchers may not be in the schema cache yet — gracefully degrade.
        console.warn('[useCatalystWatchers] watchers unavailable:', error.message);
        return { count: 0, isWatching: false, watchers: [] };
      }

      const rows = data ?? [];

      // Hydrate profiles for the manage-watchers popover.
      let watchers: WatcherProfile[] = [];
      if (rows.length > 0) {
        const ids = rows.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', ids);
        watchers = (profiles ?? []).map(p => ({
          user_id: p.id, full_name: p.full_name, avatar_url: p.avatar_url, email: p.email,
        }));
      }

      return {
        count: rows.length,
        isWatching: !!user && rows.some(r => r.user_id === user.id),
        watchers,
      };
    },
    staleTime: 15_000,
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!issueKey) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const isWatching = query.data?.isWatching ?? false;
      if (isWatching) {
        const { error } = await (supabase as any)
          .from('ph_issue_watchers')
          .delete()
          .eq('issue_key', issueKey)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('ph_issue_watchers')
          .insert({ issue_key: issueKey, user_id: user.id });
        if (error) throw error;
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['cv-watchers', issueKey] }),
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Could not update watchers: ${msg}`);
    },
  });

  return { ...query, toggle };
}
