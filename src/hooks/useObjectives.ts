import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditEntry } from '@/lib/auditLogger';

// Objectives Module - Proper Types per Technical Specification
// OKR Module ONLY supports Portfolio and Program tiers
export type ObjectiveTier = 'portfolio' | 'program';

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
  name: string; // Required DB field
  summary?: string;
  description?: string;
  tier: ObjectiveTier;
  status: ObjectiveStatus;
  health?: ObjectiveHealth;
  category?: ObjectiveCategory;
  type?: ObjectiveType;
  owner_id?: string;
  portfolio_id?: string;
  program_id?: string;
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

      // Portfolio context - include all children (portfolio + programs in portfolio)
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
          }
        }
      }

      // Program context - include program objectives
      if (filters?.programIds && filters.programIds.length > 0) {
        programIdsToQuery = [...programIdsToQuery, ...filters.programIds];
      }

      // Build the query with collected IDs
      let query = supabase
        .from('objectives')
        .select('*')
        .in('tier', ['portfolio', 'program']) // Only fetch Portfolio and Program tier objectives
        .order('created_at', { ascending: false });

      // Apply hierarchical filters using OR conditions
      const hierarchyFilters: string[] = [];
      if (portfolioIdsToQuery.length > 0) {
        hierarchyFilters.push(`portfolio_id.in.(${portfolioIdsToQuery.join(',')})`);
      }
      if (programIdsToQuery.length > 0) {
        hierarchyFilters.push(`program_id.in.(${programIdsToQuery.join(',')})`);
      }

      if (hierarchyFilters.length > 0) {
        query = query.or(hierarchyFilters.join(','));
      }

      // Apply tier filter (only allow portfolio and program)
      if (filters?.tier && filters.tier.length > 0) {
        const validTiers = filters.tier.filter(t => t === 'portfolio' || t === 'program');
        if (validTiers.length > 0) {
          query = query.in('tier', validTiers);
        }
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

      // Apply search filter - search in 'name' field (DB column)
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map DB 'name' field to 'summary' for display compatibility
      // and attach key results count to each objective
      const objectivesWithKRData = ((data || []) as any[]).map(obj => {
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
        const workProgress = obj.work_progress ?? krProgress;
        
        return {
          ...obj,
          summary: obj.name, // Map 'name' to 'summary' for UI compatibility
          keyResults,
          keyResultsCount: keyResults.length,
          work_progress: workProgress,
          key_result_progress: krProgress,
        } as Objective & { keyResults: any[]; keyResultsCount: number };
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
      
      // Map 'name' to 'summary' for UI compatibility
      return {
        ...data,
        summary: data.name,
      } as Objective;
    },
    enabled: !!objectiveId,
  });
};

// Create objective - single toast only, with audit logging
export const useCreateObjective = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objective: any) => {
      // Validate tier - only allow portfolio and program
      const tier = objective.tier;
      if (tier !== 'portfolio' && tier !== 'program') {
        throw new Error('Only Portfolio and Program tiers are supported');
      }

      // Build the insert payload with correct field mapping
      const insertPayload: any = {
        name: objective.summary || objective.name, // Map summary to name (required DB field)
        tier: tier,
        status: objective.status || 'pending',
        description: objective.description,
        health: objective.health,
        category: objective.category,
        type: objective.type,
        owner_id: objective.owner_id,
        portfolio_id: objective.portfolio_id,
        program_id: objective.program_id,
        parent_objective_id: objective.parent_objective_id,
        parent_key_result_id: objective.parent_key_result_id,
        theme_id: objective.theme_id,
        anchor_sprint_id: objective.anchor_sprint_id,
        start_date: objective.start_date,
        due_date: objective.due_date,
        program_increment_ids: objective.program_increment_ids || [],
        contributors: objective.contributors || [],
        planned_value: objective.planned_value,
        delivered_value: objective.delivered_value,
        is_blocked: objective.is_blocked || false,
        notes: objective.notes,
        tags: objective.tags || [],
        work_progress: objective.work_progress || 0,
        key_result_progress: objective.key_result_progress || 0,
      };

      // Remove undefined values
      Object.keys(insertPayload).forEach(key => {
        if (insertPayload[key] === undefined) {
          delete insertPayload[key];
        }
      });

      const { data, error } = await supabase
        .from('objectives')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-tree'] });
      queryClient.invalidateQueries({ queryKey: ['okr-heatmap'] });
      
      // Log audit entry for objective creation
      await logAuditEntry({
        entityType: 'objective',
        entityId: data.id,
        action: 'created',
        afterData: data,
      });
      
      toast.success('Objective created successfully');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to create objective';
      toast.error(message);
      console.error('Create objective error:', error);
    },
  });
};

// Update objective - single toast only, with audit logging
export const useUpdateObjective = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Objective> & { id: string }) => {
      // Fetch before state for audit
      const { data: beforeData } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', id)
        .single();

      // Map summary to name if provided
      const updatePayload: any = { ...updates };
      if (updatePayload.summary) {
        updatePayload.name = updatePayload.summary;
        delete updatePayload.summary;
      }

      const { data, error } = await supabase
        .from('objectives')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, beforeData };
    },
    onSuccess: async ({ data, beforeData }) => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      queryClient.invalidateQueries({ queryKey: ['objective', data.id] });
      queryClient.invalidateQueries({ queryKey: ['objective-detail', data.id] });
      queryClient.invalidateQueries({ queryKey: ['okr-tree'] });
      queryClient.invalidateQueries({ queryKey: ['okr-heatmap'] });
      
      // Determine action type - check if status changed
      const action = beforeData?.status !== data.status ? 'status_changed' : 'updated';
      
      // Log audit entry for objective update
      await logAuditEntry({
        entityType: 'objective',
        entityId: data.id,
        action,
        beforeData,
        afterData: data,
      });
      
      toast.success('Objective updated successfully');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to update objective';
      toast.error(message);
      console.error('Update objective error:', error);
    },
  });
};

// Delete objective - single toast only, with audit logging
export const useDeleteObjective = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      // Fetch before state for audit
      const { data: beforeData } = await supabase
        .from('objectives')
        .select('*')
        .eq('id', objectiveId)
        .single();

      const { error } = await supabase
        .from('objectives')
        .delete()
        .eq('id', objectiveId);

      if (error) throw error;
      return { objectiveId, beforeData };
    },
    onSuccess: async ({ objectiveId, beforeData }) => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-tree'] });
      queryClient.invalidateQueries({ queryKey: ['okr-heatmap'] });
      
      // Log audit entry for objective deletion
      await logAuditEntry({
        entityType: 'objective',
        entityId: objectiveId,
        action: 'deleted',
        beforeData,
      });
      
      toast.success('Objective deleted successfully');
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to delete objective';
      toast.error(message);
      console.error('Delete objective error:', error);
    },
  });
};
