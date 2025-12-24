import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface ActiveUser {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

/**
 * Fetches active users (APPROVED status) from profiles table
 * with real-time subscription for sync with admin/users
 */
export function useActiveUsers() {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          // Invalidate query to refetch on any profile change
          queryClient.invalidateQueries({ queryKey: ['active-users'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['active-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name');

      if (error) throw error;
      return (data || []) as ActiveUser[];
    },
    staleTime: 1000 * 60, // 1 minute
  });
}
