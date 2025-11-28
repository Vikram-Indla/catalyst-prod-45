import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Objective {
  id: string;
  summary: string;
  description?: string;
  tier: 'portfolio' | 'solution' | 'program' | 'team';
  portfolio_id?: string;
  program_id?: string;
  team_id?: string;
  parent_goal_id?: string;
  parent_objective_id?: string;
  parent_key_result_id?: string;
  status: string;
  health: string;
  blocked: boolean;
  start_date?: string;
  due_date?: string;
  program_increment_ids: string[];
  owner_id?: string;
  contributors: string[];
  score?: number;
  confidence_score?: number;
  work_progress: number;
  key_result_progress: number;
  category?: string;
  objective_type?: string;
  theme_id?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ObjectiveFilters {
  tier?: string[];
  portfolioIds?: string[];
  programIds?: string[];
  teamIds?: string[];
  piIds?: string[];
  statuses?: string[];
  ownerIds?: string[];
  search?: string;
  myObjectives?: boolean;
  blockedOnly?: boolean;
}

// Fetch objectives with filters
export const useObjectives = (filters?: ObjectiveFilters) => {
  return useQuery({
    queryKey: ['objectives', filters],
    queryFn: async () => {
      let query = supabase
        .from('objectives')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.tier && filters.tier.length > 0) {
        query = query.in('tier', filters.tier);
      }

      if (filters?.portfolioIds && filters.portfolioIds.length > 0) {
        query = query.in('portfolio_id', filters.portfolioIds);
      }

      if (filters?.programIds && filters.programIds.length > 0) {
        query = query.in('program_id', filters.programIds);
      }

      if (filters?.teamIds && filters.teamIds.length > 0) {
        query = query.in('team_id', filters.teamIds);
      }

      if (filters?.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses);
      }

      if (filters?.ownerIds && filters.ownerIds.length > 0) {
        query = query.in('owner_id', filters.ownerIds);
      }

      if (filters?.blockedOnly) {
        query = query.eq('blocked', true);
      }

      if (filters?.search) {
        query = query.or(`summary.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Objective[];
    },
  });
};

// Fetch single objective
export const useObjective = (objectiveId?: string) => {
  return useQuery({
    queryKey: ['objective', objectiveId],
    queryFn: async () => {
      if (!objectiveId) return null;

      const { data, error } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', objectiveId)
        .single();

      if (error) throw error;
      return data as Objective;
    },
    enabled: !!objectiveId,
  });
};

// Create objective
export const useCreateObjective = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objective: any) => {
      const { data, error } = await supabase
        .from('objectives')
        .insert(objective)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast.success('Objective created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create objective');
      console.error(error);
    },
  });
};

// Update objective
export const useUpdateObjective = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Objective> & { id: string }) => {
      const { data, error } = await supabase
        .from('objectives')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      queryClient.invalidateQueries({ queryKey: ['objective', data.id] });
      toast.success('Objective updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update objective');
      console.error(error);
    },
  });
};

// Delete objective
export const useDeleteObjective = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      const { error } = await supabase
        .from('objectives')
        .delete()
        .eq('id', objectiveId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      toast.success('Objective deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete objective');
      console.error(error);
    },
  });
};
