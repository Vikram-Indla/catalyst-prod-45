import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NotificationTab } from '@/types/notifications';
import { NOTIFICATIONS_PER_PAGE } from '@/constants/notificationConstants';

function useUserId() {
  return useQuery({
    queryKey: ['auth-user-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useNotificationsQuery(
  tab: NotificationTab,
  unreadOnly: boolean,
  enabled = true,
) {
  const { data: userId } = useUserId();

  return useInfiniteQuery({
    queryKey: ['notifications', userId, tab, unreadOnly],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('recipient_user_id', userId!)
      .eq('entity_deleted', false)
      .eq('is_dismissed', false)
      .or('snoozed_until.is.null,snoozed_until.lt.' + new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(NOTIFICATIONS_PER_PAGE);

      query = query.eq('tab', tab);
      if (unreadOnly) {
        query = query.is('read_at', null);
      }
      if (pageParam) {
        query = query.lt('created_at', pageParam);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.length === NOTIFICATIONS_PER_PAGE
        ? lastPage[lastPage.length - 1].created_at
        : undefined,
    enabled: !!userId && enabled,
    staleTime: 0,
  });
}

export function useUnreadCountQuery() {
  const { data: userId } = useUserId();

  return useQuery({
    queryKey: ['notifications-unread-count', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_user_id', userId!)
        .is('read_at', null)
        .eq('entity_deleted', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: 0,
  });
}

export function useMarkAsRead() {
  const { data: userId } = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('recipient_user_id', userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useMarkAllAsRead() {
  const { data: userId } = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_user_id', userId!)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useSnoozeNotification() {
  const { data: userId } = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, until }: { id: string; until: Date | null }) => {
      const { error } = await supabase
        .from('notifications')
        .update({ snoozed_until: until?.toISOString() ?? null })
        .eq('id', id)
        .eq('recipient_user_id', userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
