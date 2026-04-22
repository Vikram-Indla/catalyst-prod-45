// ─────────────────────────────────────────────────────────────────────────────
// useNotificationsInfinite — cursor-paginated notifications + actor hydration
// Data source: Supabase `notifications` table (live, trigger-populated).
// Actor display names resolved via useActorProfiles in a single batch.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useActorProfiles } from '@/hooks/useActorProfiles';
import { getNotifications } from '../api/notificationsApi';
import type { NotificationTab, NotificationItem } from '../types';

export const NOTIF_QUERY_KEY = (tab: NotificationTab, onlyUnread: boolean) =>
  ['notif-feature', tab, onlyUnread] as const;

export function useNotificationsInfinite(tab: NotificationTab, onlyUnread: boolean) {
  // ── Step 1: fetch raw rows from Supabase ──────────────────────────────────
  const query = useInfiniteQuery({
    queryKey: NOTIF_QUERY_KEY(tab, onlyUnread),
    queryFn: ({ pageParam }) =>
      getNotifications({ tab, onlyUnread, cursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: last => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  // ── Step 2: flatten pages — memoize so downstream deps stay stable ────────
  const rawItems = useMemo(
    () => query.data?.pages.flatMap(p => p.items) ?? [],
    [query.data],
  );

  // ── Step 3: collect unique actor IDs for a single batch profile fetch ─────
  const actorIds = useMemo(
    () => [...new Set(rawItems.map(n => n.actor.id).filter(id => id !== 'system'))],
    [rawItems],
  );

  // ── Step 4: resolve display names + avatar URLs ───────────────────────────
  const { data: profiles } = useActorProfiles(actorIds);

  // ── Step 5: hydrate actor fields with resolved profile data ───────────────
  const notifications = useMemo(
    () =>
      rawItems.map((n): NotificationItem => {
        const profile = profiles?.get(n.actor.id);
        if (!profile) return n;
        return {
          ...n,
          actor: {
            ...n.actor,
            displayName: profile.full_name || 'Unknown',
            avatarUrl:   profile.avatar_url ?? undefined,
          },
        };
      }),
    [rawItems, profiles],
  );

  return { ...query, notifications };
}
