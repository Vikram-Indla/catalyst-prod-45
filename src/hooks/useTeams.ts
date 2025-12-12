import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Team, TeamFilters, CreateTeamInput, UpdateTeamInput } from '@/types/team.types';

export function useTeams(filters?: TeamFilters) {
  return useQuery({
    queryKey: ['teams', filters],
    queryFn: async () => {
      let query = supabase
        .from('teams')
        .select('*, projects!project_id(id, name), programs!parent_program_id(id, name)')
        .order('name');

      if (filters?.programIds && filters.programIds.length > 0) {
        query = query.in('project_id', filters.programIds);
      }

      if (filters?.teamTypes && filters.teamTypes.length > 0) {
        query = query.in('team_type', filters.teamTypes);
      }

      if (filters?.status) {
        query = query.eq('is_active', filters.status === 'active');
      }

      if (filters?.regionIds && filters.regionIds.length > 0) {
        query = query.in('region_id', filters.regionIds);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,short_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching teams:', error);
        throw error;
      }

      return data as Team[];
    },
  });
}

export function useTeam(teamId?: string) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      if (!teamId) return null;

      const { data, error } = await supabase
        .from('teams')
        .select('*, projects!project_id(id, name), programs!parent_program_id(id, name)')
        .eq('id', teamId)
        .single();

      if (error) {
        console.error('Error fetching team:', error);
        throw error;
      }

      return data as Team;
    },
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTeamInput) => {
      const { data, error } = await supabase
        .from('teams')
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team created successfully');
    },
    onError: (error) => {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTeamInput) => {
      const { data, error } = await supabase
        .from('teams')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team', variables.id] });
      toast.success('Team updated successfully');
    },
    onError: (error) => {
      console.error('Error updating team:', error);
      toast.error('Failed to update team');
    },
  });
}

export function useDeleteTeams() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamIds: string[]) => {
      const { error } = await supabase
        .from('teams')
        .delete()
        .in('id', teamIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Teams deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting teams:', error);
      toast.error('Failed to delete teams');
    },
  });
}

export function useUpdateTeamsStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamIds, isActive }: { teamIds: string[]; isActive: boolean }) => {
      const { error } = await supabase
        .from('teams')
        .update({ is_active: isActive })
        .in('id', teamIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team status updated successfully');
    },
    onError: (error) => {
      console.error('Error updating team status:', error);
      toast.error('Failed to update team status');
    },
  });
}

export function useToggleTeamSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if subscription exists
      const { data: existing } = await supabase
        .from('team_subscriptions')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Unsubscribe
        const { error } = await supabase
          .from('team_subscriptions')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { subscribed: false };
      } else {
        // Subscribe
        const { error } = await supabase
          .from('team_subscriptions')
          .insert([{ team_id: teamId, user_id: user.id }]);

        if (error) throw error;
        return { subscribed: true };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-subscriptions'] });
      toast.success(data.subscribed ? 'Subscribed to team' : 'Unsubscribed from team');
    },
    onError: (error) => {
      console.error('Error toggling team subscription:', error);
      toast.error('Failed to update subscription');
    },
  });
}
