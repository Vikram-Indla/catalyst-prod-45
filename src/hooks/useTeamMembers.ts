import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import type { TeamMember } from '@/types/team.types';

export function useTeamMembers(teamId?: string) {
  const queryClient = useQueryClient();

  // Set up real-time subscription to sync with profiles changes
  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel(`team-members-${teamId}-sync`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
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
          queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, queryClient]);

  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from('team_members')
        .select('*, profiles!user_id(id, full_name, email, approval_status)')
        .eq('team_id', teamId)
        .order('created_at');

      if (error) {
        console.error('Error fetching team members:', error);
        throw error;
      }

      // Filter to only include users with APPROVED status
      const approvedMembers = (data || []).filter((member) => {
        const profile = member.profiles as { approval_status: string | null } | null;
        return profile?.approval_status === 'APPROVED';
      });

      return approvedMembers as TeamMember[];
    },
    enabled: !!teamId,
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      userId,
      role,
      allocation,
    }: {
      teamId: string;
      userId: string;
      role: string;
      allocation: number;
    }) => {
      const { data, error } = await supabase
        .from('team_members')
        .insert([
          {
            team_id: teamId,
            user_id: userId,
            role,
            allocation_percentage: allocation,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-member-ids'] });
      queryClient.invalidateQueries({ queryKey: ['all-team-members'] });
      toast.success('Team member added successfully');
    },
    onError: (error: any) => {
      console.error('Error adding team member:', error);
      if (error?.code !== '23505') {
        toast.error('Failed to add team member');
      }
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      teamId,
      role,
      allocation,
    }: {
      id: string;
      teamId: string;
      role?: string;
      allocation?: number;
    }) => {
      const updates: any = {};
      if (role !== undefined) updates.role = role;
      if (allocation !== undefined) updates.allocation_percentage = allocation;

      const { data, error } = await supabase
        .from('team_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', variables.teamId] });
      toast.success('Team member updated successfully');
    },
    onError: (error) => {
      console.error('Error updating team member:', error);
      toast.error('Failed to update team member');
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase.from('team_members').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-member-ids'] });
      queryClient.invalidateQueries({ queryKey: ['all-team-members'] });
      toast.success('Team member removed successfully');
    },
    onError: (error) => {
      console.error('Error removing team member:', error);
      toast.error('Failed to remove team member');
    },
  });
}
