// ============================================================
// CATALYST NOTIFICATION SYSTEM - useNotifications Hook
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { catalystToast } from '@/lib/catalystToast';

// ============================================================
// TYPES
// ============================================================

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  severity: 'info' | 'warning' | 'critical';
  channel: 'in_app' | 'slack' | 'email';
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  actor?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export type NotificationType = 
  | 'assignment'
  | 'unassignment'
  | 'reporter'
  | 'mention'
  | 'comment'
  | 'watcher_update'
  | 'status_change'
  | 'test_failed'
  | 'cycle_started'
  | 'cycle_completed';

export interface NotificationFilters {
  type?: NotificationType | NotificationType[];
  isRead?: boolean;
  limit?: number;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refetch: () => void;
  isConnected: boolean;
}

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

export function useNotifications(
  filters: NotificationFilters = {}
): UseNotificationsReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  
  const { limit = 50, type, isRead } = filters;

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('user_notifications')
        .select(`
          *,
          actor:profiles!user_notifications_actor_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (type) {
        if (Array.isArray(type)) {
          query = query.in('type', type);
        } else {
          query = query.eq('type', type);
        }
      }

      if (isRead !== undefined) {
        query = query.eq('is_read', isRead);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      return (data || []) as Notification[];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification received:', payload);
          
          queryClient.setQueryData<Notification[]>(
            ['notifications', user.id, filters],
            (old = []) => {
              const newNotification = payload.new as Notification;
              if (old.some((n) => n.id === newNotification.id)) {
                return old;
              }
              return [newNotification, ...old].slice(0, limit);
            }
          );

          catalystToast.info(
            (payload.new as Notification).title,
            (payload.new as Notification).message,
            (payload.new as Notification).link
              ? {
                  label: 'View',
                  onClick: () => {
                    window.location.href = (payload.new as Notification).link!;
                  },
                }
              : undefined
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.setQueryData<Notification[]>(
            ['notifications', user.id, filters],
            (old = []) =>
              old.map((n) =>
                n.id === payload.new.id ? { ...n, ...payload.new } : n
              )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.setQueryData<Notification[]>(
            ['notifications', user.id, filters],
            (old = []) => old.filter((n) => n.id !== payload.old.id)
          );
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [user?.id, queryClient, filters, limit]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      
      queryClient.setQueryData<Notification[]>(
        ['notifications', user?.id, filters],
        (old = []) =>
          old.map((n) =>
            n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          )
      );
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
      catalystToast.error('Failed to mark notification as read');
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAsRead = useCallback(
    async (id: string) => {
      await markAsReadMutation.mutateAsync(id);
    },
    [markAsReadMutation]
  );

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      
      queryClient.setQueryData<Notification[]>(
        ['notifications', user?.id, filters],
        (old = []) =>
          old.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    },
    onSuccess: () => {
      catalystToast.success('All notifications marked as read');
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error);
      catalystToast.error('Failed to mark all as read');
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      
      queryClient.setQueryData<Notification[]>(
        ['notifications', user?.id, filters],
        (old = []) => old.filter((n) => n.id !== id)
      );
    },
    onError: (error) => {
      console.error('Error deleting notification:', error);
      catalystToast.error('Failed to delete notification');
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const deleteNotification = useCallback(
    async (id: string) => {
      await deleteNotificationMutation.mutateAsync(id);
    },
    [deleteNotificationMutation]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    error: error as Error | null,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch,
    isConnected,
  };
}

// ============================================================
// UTILITY HOOK: UNREAD COUNT ONLY
// ============================================================

export function useUnreadNotificationCount(): number {
  const { user } = useAuth();
  
  const { data: count = 0 } = useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  return count;
}

// ============================================================
// NOTIFICATION TYPE HELPERS
// ============================================================

export const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  {
    icon: string;
    color: string;
    label: string;
  }
> = {
  assignment: {
    icon: 'UserPlus',
    color: 'text-primary',
    label: 'Assignment',
  },
  unassignment: {
    icon: 'UserMinus',
    color: 'text-muted-foreground',
    label: 'Unassignment',
  },
  reporter: {
    icon: 'FileText',
    color: 'text-primary',
    label: 'Reporter',
  },
  mention: {
    icon: 'AtSign',
    color: 'text-primary',
    label: 'Mention',
  },
  comment: {
    icon: 'MessageSquare',
    color: 'text-primary',
    label: 'Comment',
  },
  watcher_update: {
    icon: 'Eye',
    color: 'text-muted-foreground',
    label: 'Watched Item',
  },
  status_change: {
    icon: 'RefreshCw',
    color: 'text-warning',
    label: 'Status Change',
  },
  test_failed: {
    icon: 'XCircle',
    color: 'text-destructive',
    label: 'Test Failed',
  },
  cycle_started: {
    icon: 'Play',
    color: 'text-teal-500',
    label: 'Cycle Started',
  },
  cycle_completed: {
    icon: 'CheckCircle',
    color: 'text-teal-500',
    label: 'Cycle Completed',
  },
};

export function getNotificationTypeConfig(type: NotificationType) {
  return NOTIFICATION_TYPE_CONFIG[type] || NOTIFICATION_TYPE_CONFIG.assignment;
}
