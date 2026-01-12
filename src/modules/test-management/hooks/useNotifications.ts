/**
 * useNotifications - Hook for managing Test Management notifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from './useAuth';

export interface TMNotification {
  id: string;
  userId: string;
  type: 'assignment' | 'mention' | 'status_change' | 'comment' | 'due_date';
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationKeys = {
  all: ['tm-notifications'] as const,
  list: (userId: string) => [...notificationKeys.all, 'list', userId] as const,
  unread: (userId: string) => [...notificationKeys.all, 'unread', userId] as const,
  count: (userId: string) => [...notificationKeys.all, 'count', userId] as const,
};

export function useNotifications() {
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id;

  return useQuery({
    queryKey: notificationKeys.list(userId || ''),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('tm_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      return (data || []).map(n => ({
        id: n.id,
        userId: n.user_id,
        type: n.type as TMNotification['type'],
        title: n.title,
        message: n.message,
        entityType: n.entity_type,
        entityId: n.entity_id,
        isRead: n.is_read,
        createdAt: n.created_at,
      })) as TMNotification[];
    },
    enabled: !!userId,
  });
}

export function useUnreadNotificationCount() {
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id;

  return useQuery({
    queryKey: notificationKeys.count(userId || ''),
    queryFn: async () => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('tm_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id;

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('tm_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) });
        queryClient.invalidateQueries({ queryKey: notificationKeys.count(userId) });
      }
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id;

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tm_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) });
        queryClient.invalidateQueries({ queryKey: notificationKeys.count(userId) });
      }
      toast({
        title: 'Notifications marked as read',
        description: 'All notifications have been marked as read.',
      });
    },
  });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id;

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('tm_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) });
        queryClient.invalidateQueries({ queryKey: notificationKeys.count(userId) });
      }
    },
  });
}

// Realtime subscription hook for notifications
export function useRealtimeNotifications() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id;

  useQuery({
    queryKey: ['tm-notifications-realtime', userId],
    queryFn: () => {
      if (!userId) return null;

      const channel = supabase
        .channel(`tm-notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tm_notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) });
            queryClient.invalidateQueries({ queryKey: notificationKeys.count(userId) });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    enabled: !!userId,
    staleTime: Infinity,
  });
}
