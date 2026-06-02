import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserStatus } from '@/lib/presence';

/**
 * Fetches effective presence status for a list of user IDs.
 * Subscribes to postgres_changes on user_presence for live updates.
 * RLS on v_user_effective_status / user_presence restricts the result
 * to users the viewer shares a project or product with.
 */
export function useUserStatus(userIds: string[]) {
  const queryClient = useQueryClient();
  const key = ['user-status', ...userIds.slice().sort()];

  const query = useQuery<UserStatus[]>({
    queryKey: key,
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from('v_user_effective_status')
        .select('*')
        .in('user_id', userIds);
      if (error) throw error;
      return (data ?? []) as UserStatus[];
    },
    staleTime: 30_000,
    enabled: userIds.length > 0,
  });

  // Realtime: invalidate whenever any of these users' presence rows change
  useEffect(() => {
    if (userIds.length === 0) return;

    const channel = supabase
      .channel('user-presence-status-' + userIds.slice().sort().join('-'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        (payload) => {
          const changedId = (payload.new as { user_id?: string })?.user_id
                         ?? (payload.old as { user_id?: string })?.user_id;
          if (!changedId || !userIds.includes(changedId)) return;
          queryClient.invalidateQueries({ queryKey: key });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIds.join(',')]);

  return query;
}
