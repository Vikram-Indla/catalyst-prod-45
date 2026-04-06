import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_user_id', user.id)
        .is('read_at', null)
        .eq('entity_deleted', false)
        .or('snoozed_until.is.null,snoozed_until.lt.' + new Date().toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 0,
  });
}

export default useUnreadCount;
