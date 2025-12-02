import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Objectives Module - Proper Types per Technical Specification
export type ObjectiveTier = 'portfolio' | 'program' | 'team';

export type ObjectiveStatus = 
  | 'pending'
  | 'in_progress'
  | 'on_track'
  | 'at_risk'
  | 'off_track'
  | 'paused'
  | 'completed'
  | 'canceled'
  | 'missed';

export type ObjectiveHealth = 'good' | 'fair' | 'poor' | 'at_risk';

export type ObjectiveCategory = 'critical_path' | 'stretch_goal';

export type ObjectiveType = 
  | 'feature_finisher'
  | 'non_code'
  | 'incremental_delivery'
  | 'event';

export interface Objective {
  id: string;
  summary: string;
  description?: string;
  tier: ObjectiveTier;
  status: ObjectiveStatus;
  health?: ObjectiveHealth;
  category?: ObjectiveCategory;
  type?: ObjectiveType;
  owner_id?: string;
  portfolio_id?: string;
  program_id?: string;
  team_id?: string;
  parent_objective_id?: string;
  parent_key_result_id?: string;
  theme_id?: string;
  anchor_sprint_id?: string;
  start_date?: string;
  due_date?: string;
  program_increment_ids: string[];
  contributors: string[];
  planned_value?: number;
  delivered_value?: number;
  is_blocked: boolean;
  notes?: string;
  tags: string[];
  score?: number;
  confidence_score?: number;
  work_progress: number;
  key_result_progress: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ObjectiveFilters {
  tier?: ObjectiveTier[];
  portfolioIds?: string[];
  programIds?: string[];
  teamIds?: string[];
  piIds?: string[];
  statuses?: ObjectiveStatus[];
  ownerIds?: string[];
  search?: string;
  myObjectives?: boolean;
  blockedOnly?: boolean;
  includeParentHierarchy?: boolean;
  includeChildTeams?: boolean;
  includeAllChildren?: boolean;
}

// Fetch objectives with filters
export const useObjectives = (filters?: ObjectiveFilters) => {
  return useQuery({
    queryKey: ['objectives', filters],
    queryFn: async () => {
      // Fetch key results data separately for all objectives using key_results_v2
      const { data: allKeyResults } = await supabase
        .from('key_results_v2')
        .select('id, objective_id, baseline_value, current_value, goal_value, summary, metric_type');

      const keyResultsByObjective = new Map<string, any[]>();
      allKeyResults?.forEach(kr => {
        if (!keyResultsByObjective.has(kr.objective_id)) {
          keyResultsByObjective.set(kr.objective_id, []);
        }
        keyResultsByObjective.get(kr.objective_id)!.push(kr);
      });

  // Handle hierarchical filtering by fetching related entity IDs
  let portfolioIdsToQuery: string[] = [];
  let programIdsToQuery: string[] = [];
  let teamIdsToQuery: string[] = [];

  // Portfolio context - include all children (portfolio + programs + teams in portfolio)
  if (filters?.portfolioIds && filters.portfolioIds.length > 0) {
    portfolioIdsToQuery = filters.portfolioIds;
    
    if (filters.includeAllChildren) {
      // Fetch programs in this portfolio
      const { data: programs } = await supabase
        .from('programs')
        .select('id')
        .in('portfolio_id', filters.portfolioIds);
      
      if (programs && programs.length > 0) {
        programIdsToQuery = programs.map(p => p.id);
        
        // Fetch teams in these programs
        const { data: teams } = await supabase
          .from('teams')
          .select('id')
          .in('program_id', programIdsToQuery);
        
        if (teams && teams.length > 0) {
          teamIdsToQuery = teams.map(t => t.id);
        }
      }
    }
  }

  // Program context - include program objectives and child team objectives
  if (filters?.programIds && filters.programIds.length > 0) {
    programIdsToQuery = [...programIdsToQuery, ...filters.programIds];
    
    if (filters.includeChildTeams) {
      // Fetch teams in this program
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .in('program_id', filters.programIds);
      
      if (teams && teams.length > 0) {
        teamIdsToQuery = [...teamIdsToQuery, ...teams.map(t => t.id)];
      }
    }
  }

  // Team context - include team objectives and optionally parent hierarchy
  if (filters?.teamIds && filters.teamIds.length > 0) {
    teamIdsToQuery = [...teamIdsToQuery, ...filters.teamIds];
    
    if (filters.includeParentHierarchy) {
      // Fetch parent program for this team
      const { data: teams } = await supabase
        .from('teams')
        .select('program_id')
        .in('id', filters.teamIds);
      
      if (teams && teams.length > 0) {
        const parentProgramIds = teams.map(t => t.program_id).filter(Boolean) as string[];
        programIdsToQuery = [...programIdsToQuery, ...parentProgramIds];
        
        // Fetch parent portfolio for these programs
        const { data: programs } = await supabase
          .from('programs')
          .select('portfolio_id')
          .in('id', parentProgramIds);
        
        if (programs && programs.length > 0) {
          const parentPortfolioIds = programs.map(p => p.portfolio_id).filter(Boolean) as string[];
          portfolioIdsToQuery = [...portfolioIdsToQuery, ...parentPortfolioIds];
        }
      }
    }
  }

  // Build the query with collected IDs
  let query = supabase
    .from('objectives')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply hierarchical filters using OR conditions
  const hierarchyFilters: string[] = [];
  if (portfolioIdsToQuery.length > 0) {
    hierarchyFilters.push(`portfolio_id.in.(${portfolioIdsToQuery.join(',')})`);
  }
  if (programIdsToQuery.length > 0) {
    hierarchyFilters.push(`program_id.in.(${programIdsToQuery.join(',')})`);
  }
  if (teamIdsToQuery.length > 0) {
    hierarchyFilters.push(`team_id.in.(${teamIdsToQuery.join(',')})`);
  }

  if (hierarchyFilters.length > 0) {
    query = query.or(hierarchyFilters.join(','));
  }

  // Apply tier filter
  if (filters?.tier && filters.tier.length > 0) {
    query = query.in('tier', filters.tier);
  }

  // Apply status filter
  if (filters?.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses);
  }

  // Apply owner filter
  if (filters?.ownerIds && filters.ownerIds.length > 0) {
    query = query.in('owner_id', filters.ownerIds);
  }

  // Apply blocked filter
  if (filters?.blockedOnly) {
    query = query.eq('is_blocked', true);
  }

  // Apply search filter
  if (filters?.search) {
    query = query.or(`summary.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
      if (error) throw error;

      // Attach key results count to each objective
      // Calculate progress values for each objective
      const objectivesWithKRData = (data as Objective[]).map(obj => {
        const keyResults = keyResultsByObjective.get(obj.id) || [];
        
        // Calculate Key Results Progress (average of all KR progress)
        let krProgress = 0;
        if (keyResults.length > 0) {
          let totalProgress = 0;
          keyResults.forEach(kr => {
            const baseline = kr.baseline_value || 0;
            const current = kr.current_value || baseline;
            const goal = kr.goal_value;
            
            if (goal !== baseline) {
              const progress = (current - baseline) / (goal - baseline);
              totalProgress += Math.max(0, Math.min(1, progress));
            }
          });
          krProgress = totalProgress / keyResults.length;
        }
        
        // Work Progress would need work item alignments data
        // For now, use the stored value or default to krProgress as fallback
        const workProgress = obj.work_progress ?? krProgress;
        
        return {
          ...obj,
          keyResults,
          keyResultsCount: keyResults.length,
          work_progress: workProgress,
          key_result_progress: krProgress,
        };
      });

      return objectivesWithKRData;
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
