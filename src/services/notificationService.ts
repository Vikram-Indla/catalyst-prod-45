import { supabase } from '@/integrations/supabase/client';

export const notificationService = {
  async fetchNotifications(userId: string, tab: string, unreadOnly: boolean, cursor?: string) {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', userId)
      .eq('entity_deleted', false)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(20);

    query = query.eq('tab', tab);
    if (unreadOnly) {
      query = query.is('read_at', null);
    }
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async markAsRead(notificationId: string, userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('recipient_user_id', userId);
    if (error) throw error;
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_user_id', userId)
      .is('read_at', null);
    if (error) throw error;
  },
};
