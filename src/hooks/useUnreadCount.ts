import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Badge count = all unread Direct-tab notifications from the last 7 days.
 * When the panel opens, markNotificationsViewed() marks them all read in the DB
 * so the badge drops to 0 — matching Jira's "clears on open" behaviour.
 */
export function markNotificationsViewed() {
  // No-op: badge clears because items get marked read when clicked, not on panel open.
  // Kept exported so ja/NotificationsPanel.tsx doesn't need import changes.
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      // Count unread Direct-tab notifications from last 7 days.
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_user_id', user.id)
        .eq('tab', 'direct')
        .is('read_at', null)
        .eq('entity_deleted', false)
        .gte('created_at', sevenDaysAgo)
        .or('snoozed_until.is.null,snoozed_until.lt.' + new Date().toISOString());

      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 0,
  });
}

export default useUnreadCount;
