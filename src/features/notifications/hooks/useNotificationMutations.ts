// ─────────────────────────────────────────────────────────────────────────────
// useNotificationMutations — optimistic mark-read / mark-all-read / unread
// Calls real Supabase via notificationsApi (live as of Jira-sync wiring).
// On settle: invalidates both the feature cache AND NotificationPanel's cache
// so the unread-count badge and panel list both update atomically.
// ─────────────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  markNotificationRead,
  markNotificationUnread,
  markAllRead,
} from '../api/notificationsApi';
import type { NotificationTab, NotificationsResponse, NotificationItem } from '../types';
import { NOTIF_QUERY_KEY } from './useNotificationsInfinite';

// Cross-invalidate keys owned by NotificationPanel / useNotificationsNew
const PANEL_KEYS = [['notifications'], ['notifications-unread-count']];

type InfiniteCache = { pages: NotificationsResponse[]; pageParams: unknown[] };

const patchPages = (
  data: InfiniteCache | undefined,
  patch: (n: NotificationItem) => NotificationItem,
): InfiniteCache | undefined => {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map(page => ({
      ...page,
      items: page.items.map(patch),
    })),
  };
};

// ── useMarkRead ───────────────────────────────────────────────────────────────
export function useMarkRead(tab: NotificationTab, onlyUnread: boolean) {
  const qc = useQueryClient();
  const key = NOTIF_QUERY_KEY(tab, onlyUnread);

  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<InfiniteCache>(key);
      const now = new Date().toISOString();
      qc.setQueryData<InfiniteCache>(key, old =>
        patchPages(old, n => (n.id === id ? { ...n, readAt: now } : n)),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      PANEL_KEYS.forEach(k => qc.invalidateQueries({ queryKey: k }));
    },
  });
}

// ── useMarkUnread ─────────────────────────────────────────────────────────────
export function useMarkUnread(tab: NotificationTab, onlyUnread: boolean) {
  const qc = useQueryClient();
  const key = NOTIF_QUERY_KEY(tab, onlyUnread);

  return useMutation({
    mutationFn: markNotificationUnread,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<InfiniteCache>(key);
      qc.setQueryData<InfiniteCache>(key, old =>
        patchPages(old, n => (n.id === id ? { ...n, readAt: null } : n)),
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      PANEL_KEYS.forEach(k => qc.invalidateQueries({ queryKey: k }));
    },
  });
}

// ── useMarkAllRead ────────────────────────────────────────────────────────────
export function useMarkAllRead(tab: NotificationTab, onlyUnread: boolean) {
  const qc = useQueryClient();
  const key = NOTIF_QUERY_KEY(tab, onlyUnread);

  return useMutation({
    mutationFn: () => markAllRead({ tab }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<InfiniteCache>(key);
      const now = new Date().toISOString();
      qc.setQueryData<InfiniteCache>(key, old =>
        patchPages(old, n => (n.readAt === null ? { ...n, readAt: now } : n)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      PANEL_KEYS.forEach(k => qc.invalidateQueries({ queryKey: k }));
    },
  });
}
