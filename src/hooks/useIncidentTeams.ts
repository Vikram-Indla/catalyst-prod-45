import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IncidentTeam {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Fetch all active incident teams
export function useIncidentTeams() {
  return useQuery({
    queryKey: ['incident-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_teams')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as IncidentTeam[];
    },
  });
}

// Fetch all incident teams (including inactive) for admin
export function useAllIncidentTeams() {
  return useQuery({
    queryKey: ['incident-teams-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_teams')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as IncidentTeam[];
    },
  });
}

// Create incident team
export function useCreateIncidentTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get max sort order
      const { data: existing } = await supabase
        .from('incident_teams')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);
      
      const maxOrder = existing?.[0]?.sort_order ?? 0;

      const { data: team, error } = await supabase
        .from('incident_teams')
        .insert({
          name: data.name,
          description: data.description || null,
          sort_order: maxOrder + 1,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-teams'] });
      queryClient.invalidateQueries({ queryKey: ['incident-teams-all'] });
    },
  });
}

// Update incident team
export function useUpdateIncidentTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<IncidentTeam> }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: team, error } = await supabase
        .from('incident_teams')
        .update({
          ...data,
          updated_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-teams'] });
      queryClient.invalidateQueries({ queryKey: ['incident-teams-all'] });
    },
  });
}

// Deactivate incident team
export function useDeactivateIncidentTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('incident_teams')
        .update({
          is_active: false,
          updated_by: user?.id,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-teams'] });
      queryClient.invalidateQueries({ queryKey: ['incident-teams-all'] });
    },
  });
}
