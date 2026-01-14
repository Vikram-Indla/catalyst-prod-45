import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import type { Notification, NotificationPreference, NotificationType, NotificationChannel } from '@/types/integrations.types';

// Mock data for notifications
const generateMockNotifications = (userId: string): Notification[] => [
  {
    id: '1',
    user_id: userId,
    type: 'assignment',
    title: 'New test assigned',
    message: 'TC-005: Login Authentication has been assigned to you',
    reference_type: 'test_case',
    reference_id: 'tc-005',
    is_read: false,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    user_id: userId,
    type: 'status_change',
    title: 'Test status updated',
    message: 'TC-003 changed from In Progress to Passed',
    reference_type: 'test_case',
    reference_id: 'tc-003',
    is_read: false,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    user_id: userId,
    type: 'deadline',
    title: 'Deadline approaching',
    message: 'Regression R2.1 ends in 2 days with 15 tests remaining',
    reference_type: 'cycle',
    reference_id: 'cycle-1',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    user_id: userId,
    type: 'mention',
    title: 'You were mentioned',
    message: 'Ahmed S. mentioned you in a comment on TC-012',
    reference_type: 'test_case',
    reference_id: 'tc-012',
    is_read: true,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    user_id: userId,
    type: 'cycle_complete',
    title: 'Cycle completed',
    message: 'Smoke Test Sprint 4 completed with 95% pass rate',
    reference_type: 'cycle',
    reference_id: 'cycle-2',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    user_id: userId,
    type: 'defect_linked',
    title: 'Defect linked',
    message: 'JIRA-456 linked to TC-008: Payment Processing',
    reference_type: 'test_case',
    reference_id: 'tc-008',
    is_read: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const generateMockPreferences = (userId: string): NotificationPreference[] => {
  const eventTypes: NotificationType[] = [
    'assignment',
    'status_change',
    'cycle_complete',
    'deadline',
    'mention',
    'defect_linked',
  ];
  const channels: NotificationChannel[] = ['in_app', 'email', 'slack'];
  
  return eventTypes.flatMap((eventType, i) =>
    channels.map((channel, j) => ({
      id: `pref-${i}-${j}`,
      user_id: userId,
      channel,
      event_type: eventType,
      is_enabled: channel === 'in_app' ? true : Math.random() > 0.5,
    }))
  );
};

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // In production, fetch from Supabase:
      // const { data, error } = await supabase
      //   .from('notifications')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .order('created_at', { ascending: false })
      //   .limit(50);
      
      return generateMockNotifications(user.id);
    },
    enabled: !!user?.id,
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setLocalNotifications((prev) => [newNotification, ...prev]);
          toast.info(newNotification.title, {
            description: newNotification.message || undefined,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const allNotifications = [...localNotifications, ...notifications];
  const unreadCount = allNotifications.filter((n) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      // In production:
      // await supabase
      //   .from('notifications')
      //   .update({ is_read: true })
      //   .eq('id', notificationId);
      
      await new Promise((resolve) => setTimeout(resolve, 200));
      return notificationId;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) =>
        old?.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      
      setLocalNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      // In production:
      // await supabase
      //   .from('notifications')
      //   .update({ is_read: true })
      //   .eq('user_id', user.id)
      //   .eq('is_read', false);
      
      await new Promise((resolve) => setTimeout(resolve, 300));
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] | undefined) =>
        old?.map((n) => ({ ...n, is_read: true }))
      );
      
      setLocalNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    },
    onSuccess: () => {
      toast.success('All notifications marked as read');
    },
  });

  return {
    notifications: allNotifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    isMarkingRead: markAsRead.isPending,
    isMarkingAllRead: markAllAsRead.isPending,
  };
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // In production, fetch from Supabase
      return generateMockPreferences(user.id);
    },
    enabled: !!user?.id,
  });

  const updatePreference = useMutation({
    mutationFn: async ({
      eventType,
      channel,
      isEnabled,
    }: {
      eventType: NotificationType;
      channel: NotificationChannel;
      isEnabled: boolean;
    }) => {
      // In production:
      // await supabase
      //   .from('notification_preferences')
      //   .upsert({
      //     user_id: user?.id,
      //     event_type: eventType,
      //     channel,
      //     is_enabled: isEnabled,
      //   });
      
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { eventType, channel, isEnabled };
    },
    onMutate: async ({ eventType, channel, isEnabled }) => {
      await queryClient.cancelQueries({ queryKey: ['notification-preferences', user?.id] });
      
      queryClient.setQueryData(
        ['notification-preferences', user?.id],
        (old: NotificationPreference[] | undefined) =>
          old?.map((p) =>
            p.event_type === eventType && p.channel === channel
              ? { ...p, is_enabled: isEnabled }
              : p
          )
      );
    },
    onSuccess: () => {
      toast.success('Preference updated');
    },
  });

  const getPreference = useCallback(
    (eventType: NotificationType, channel: NotificationChannel) => {
      return preferences.find(
        (p) => p.event_type === eventType && p.channel === channel
      )?.is_enabled ?? false;
    },
    [preferences]
  );

  return {
    preferences,
    isLoading,
    updatePreference: updatePreference.mutate,
    getPreference,
    isUpdating: updatePreference.isPending,
  };
}
