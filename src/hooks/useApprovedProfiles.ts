import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface ApprovedProfile {
  id: string;
  name: string;
  initials: string;
  email: string;
  avatarUrl?: string;
}

/**
 * Hook to fetch ALL approved profiles from the system.
 * This is different from useAllTeamMembers which only returns users in teams.
 * Use this for reassignment modals where any user can be assigned.
 */
export function useApprovedProfiles() {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('approved-profiles-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['approved-profiles'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['approved-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name', { ascending: true });

      if (error) throw error;

      return (data || []).map((profile) => {
        const name = profile.full_name || profile.email || 'Unknown';
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return {
          id: profile.id,
          name,
          initials,
          email: profile.email || '',
          avatarUrl: profile.avatar_url,
        } as ApprovedProfile;
      });
    },
  });
}
