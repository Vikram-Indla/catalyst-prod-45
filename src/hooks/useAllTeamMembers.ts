import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { User } from '@/components/work-manager/types';

export function useAllTeamMembers() {
  const queryClient = useQueryClient();

  // Set up real-time subscription to sync with profiles changes
  useEffect(() => {
    const channel = supabase
      .channel('all-team-members-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['all-team-members'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['all-team-members'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
            avatar_url,
            approval_status
          ),
          teams:team_id (
            id,
            name
          )
        `);

      if (error) throw error;

      // Filter to only include users with APPROVED status and transform to User[] format
      // Deduplicate by user_id to avoid showing the same user multiple times
      const userMap = new Map<string, User>();
      
      (data || [])
        .filter((member) => {
          const profile = member.profiles as { approval_status: string | null } | null;
          return profile?.approval_status === 'APPROVED';
        })
        .forEach((member) => {
          // Only add if we haven't seen this user_id before
          if (!userMap.has(member.user_id)) {
            const profile = member.profiles as { id: string; full_name: string | null; email: string | null; avatar_url: string | null } | null;
            const name = profile?.full_name || profile?.email || 'Unknown';
            const initials = name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            userMap.set(member.user_id, {
              id: member.user_id,
              name,
              initials,
              email: profile?.email || '',
              role: member.role || 'Member',
              teamId: member.team_id,
              teamName: (member.teams as { id: string; name: string } | null)?.name || '',
            });
          }
        });

      return Array.from(userMap.values());
    },
  });
}

// Hook to get team member IDs grouped by team (only APPROVED users)
export function useTeamMemberIds() {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('team-member-ids-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['team-member-ids'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['team-member-ids'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['team-member-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          user_id,
          team_id,
          profiles:user_id (
            approval_status
          )
        `);

      if (error) throw error;

      // Group member IDs by team (only APPROVED users)
      const teamMemberMap: Record<string, string[]> = {};
      (data || [])
        .filter((member) => {
          const profile = member.profiles as { approval_status: string | null } | null;
          return profile?.approval_status === 'APPROVED';
        })
        .forEach((member) => {
          if (!teamMemberMap[member.team_id]) {
            teamMemberMap[member.team_id] = [];
          }
          teamMemberMap[member.team_id].push(member.user_id);
        });

      return teamMemberMap;
    },
  });
}
