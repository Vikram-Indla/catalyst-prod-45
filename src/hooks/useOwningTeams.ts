import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OwningTeam {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useOwningTeams() {
  return useQuery({
    queryKey: ['owning-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owning_teams')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as OwningTeam[];
    },
  });
}

export function useAllOwningTeams() {
  return useQuery({
    queryKey: ['owning-teams', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owning_teams')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as OwningTeam[];
    },
  });
}

export function useCreateOwningTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (team: { name: string; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('owning_teams')
        .insert({ name: team.name, sort_order: team.sort_order || 0 })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owning-teams'] });
    },
  });
}

export function useUpdateOwningTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OwningTeam> }) => {
      const { data: updated, error } = await supabase
        .from('owning_teams')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owning-teams'] });
    },
  });
}

export function useDeleteOwningTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - just set is_active to false
      const { error } = await supabase
        .from('owning_teams')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owning-teams'] });
    },
  });
}
