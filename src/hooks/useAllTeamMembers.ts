import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@/components/work-manager/types';

export function useAllTeamMembers() {
  return useQuery({
    queryKey: ['all-team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          team_id,
          role,
          allocation_percentage,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          ),
          teams:team_id (
            id,
            name
          )
        `);

      if (error) throw error;

      // Transform to User[] format expected by WorkManagerTeams
      const users: User[] = (data || []).map((member) => {
        const profile = member.profiles as { id: string; full_name: string | null; email: string | null; avatar_url: string | null } | null;
        const name = profile?.full_name || profile?.email || 'Unknown';
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return {
          id: member.user_id,
          name,
          initials,
          email: profile?.email || '',
          role: member.role || 'Member',
          teamId: member.team_id,
          teamName: (member.teams as { id: string; name: string } | null)?.name || '',
        };
      });

      return users;
    },
  });
}
