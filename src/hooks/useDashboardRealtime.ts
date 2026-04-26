/**
 * useDashboardRealtime — Supabase realtime → React Query invalidation bridge
 * for the Project Hub Dashboard.
 *
 * Why a dedicated hook?
 *   The dashboard fans out across ~10 widgets, each with its own query key.
 *   Polling every 15 minutes (current staleTime) leaves a stale window where
 *   the dashboard lies to the user. Subscribing to postgres_changes on the
 *   three source tables (ph_issues, tm_defects, catalyst_status_history)
 *   and invalidating any cache key starting with `ph-dashboard-` collapses
 *   that lag to near-zero without per-widget rewiring.
 *
 *   We use `predicate` invalidation rather than enumerating keys so newly-
 *   added widgets don't have to register here — anything namespaced under
 *   `ph-dashboard-*` automatically refreshes.
 *
 * Filter scoping:
 *   ph_issues.project_key + tm_defects.project_key are scoped via the
 *   Realtime `filter` arg so we only get events for the current project.
 *   catalyst_status_history rows arrive unfiltered (no project_key column
 *   on it) but the trigger on ph_issues always fires alongside, so the
 *   resulting cascade only invalidates current-project widgets that
 *   actually re-fetch.
 *
 * Mounted at the page level (ProjectDashboardPage), one channel total —
 * not per widget.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseDashboardRealtimeOptions {
  projectId?: string | null;
  projectKey?: string | null;
  enabled?: boolean;
}

export function useDashboardRealtime({
  projectId,
  projectKey,
  enabled = true,
}: UseDashboardRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !projectKey) return;

    const channelName = `ph-dashboard-rt-${projectKey}`;
    const invalidate = () => {
      // Predicate: anything starting with `ph-dashboard-` for this projectId.
      // We purposely don't filter by exact key — broad invalidation is cheap
      // (queries refetch on next observer access) and keeps the surface
      // future-proof.
      queryClient.invalidateQueries({
        predicate: (query) => {
          const head = query.queryKey?.[0];
          if (typeof head !== 'string') return false;
          if (!head.startsWith('ph-dashboard-')) return false;
          // Optional: when projectId is known, narrow further to only the
          // current project's caches. Skip narrowing if projectId is null
          // (early mount) so every dashboard query refreshes safely.
          if (projectId) {
            return query.queryKey.includes(projectId);
          }
          return true;
        },
      });
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ph_issues',
          filter: `project_key=eq.${projectKey}`,
        },
        invalidate,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_defects',
          filter: `project_key=eq.${projectKey}`,
        },
        invalidate,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'catalyst_status_history',
        },
        invalidate,
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, projectKey, enabled, queryClient]);
}
