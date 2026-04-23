import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const LS_KEY = 'catalyst_notif_last_viewed';

/** Call this when the notification panel opens to reset the badge. */
export function markNotificationsViewed() {
  try {
    localStorage.setItem(LS_KEY, new Date().toISOString());
  } catch (_) { /* localStorage blocked */ }
}

/** Returns the ISO timestamp of the last time the user opened the panel, or null. */
export function getLastViewed(): string | null {
  try {
    return localStorage.getItem(LS_KEY);
  } catch (_) {
    return null;
  }
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      // Badge = Direct-tab notifications created AFTER the last time the user opened the panel.
      // Matches Jira exactly: open the panel → badge resets to 0; new arrivals increment it.
      // Falls back to a 24h window on first-ever visit (no lastViewed in localStorage).
      const lastViewed = getLastViewed()
        ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_user_id', user.id)
        .eq('tab', 'direct')
        .is('read_at', null)
        .eq('entity_deleted', false)
        .gt('created_at', lastViewed)
        .or('snoozed_until.is.null,snoozed_until.lt.' + new Date().toISOString());

      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 0,
  });
}

export default useUnreadCount;
