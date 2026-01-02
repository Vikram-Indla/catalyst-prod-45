import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types matching actual DB schema
export interface TestNotification {
  id: string;
  user_id: string;
  program_id: string | null;
  event_type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_key: string | null;
  actor_id: string | null;
  actor_name: string | null;
  is_read: boolean | null;
  read_at: string | null;
  email_sent: boolean | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export function useNotificationPreferences() {
  const queryClient = useQueryClient();
  
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('test_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });
  
  const updatePreferences = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('test_notification_preferences')
        .upsert({ user_id: user.id, ...updates });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Preferences updated');
    },
  });
  
  return { preferences, isLoading, updatePreferences: updatePreferences.mutate, isUpdating: updatePreferences.isPending };
}

export function useTestNotifications() {
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);
  
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['test-notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('test_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as TestNotification[];
    },
  });
  
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.is_read).length);
  }, [notifications]);
  
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('test_notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['test-notifications'] }),
  });
  
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('test_notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', user.id).eq('is_read', false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['test-notifications'] }),
  });
  
  return { notifications, unreadCount, isLoading, markAsRead: markAsRead.mutate, markAllAsRead: markAllAsRead.mutate, refetch };
}

export function useCreateNotification() {
  return useMutation({
    mutationFn: async (params: { userId: string; eventType: string; title: string; message: string; entityType?: string; entityId?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('test_notifications').insert({
        user_id: params.userId,
        event_type: params.eventType,
        title: params.title,
        message: params.message,
        entity_type: params.entityType,
        entity_id: params.entityId,
        actor_id: user?.id,
        actor_name: user?.email,
      });
      if (error) throw error;
    },
  });
}
