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
  theme_id?: string; // LEGACY: Use objective_theme_links junction table instead
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

// Define "done" statuses for work items
const DONE_STATUSES = ['done', 'completed', 'accepted', 'closed', 'released', 'deployed'];

// Helper: compute own work progress for an objective from its aligned work items
// Returns 0-1 value or null if no aligned work items
function computeOwnWorkProgressForObjective(
  objectiveId: string,
  featureLinksByObjective: Map<string, any[]>,
  workItemAlignmentsByObjective: Map<string, any[]>,
  featuresById: Map<string, any>,
  storiesById: Map<string, any>
): number | null {
  const linkedFeatures = featureLinksByObjective.get(objectiveId) || [];
  const workAlignments = workItemAlignmentsByObjective.get(objectiveId) || [];
  
  let totalItems = 0;
  let completedItems = 0;
  
  // Count features linked via objective_feature_links
  linkedFeatures.forEach(link => {
    const feature = featuresById.get(link.feature_id);
    if (feature) {
      totalItems++;
      if (DONE_STATUSES.includes(feature.status?.toLowerCase())) {
        completedItems++;
      }
    }
  });
  
  // Count work items linked via objective_work_item_alignments
  workAlignments.forEach(alignment => {
    totalItems++;
    // Determine status based on work_item_type
    let status: string | null = null;
    if (alignment.work_item_type === 'feature') {
      const feature = featuresById.get(alignment.work_item_id);
      status = feature?.status;
    } else if (alignment.work_item_type === 'story') {
      const story = storiesById.get(alignment.work_item_id);
      status = story?.status;
    }
    // For other types, we'd need to fetch from respective tables
    // For now, if we can't determine status, we don't count as completed
    if (status && DONE_STATUSES.includes(status.toLowerCase())) {
      completedItems++;
    }
  });
  
  if (totalItems === 0) return null;
  return completedItems / totalItems;
}

// Fetch objectives with filters - returns hierarchical tree structure
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

      // ============================================
      // PHASE 5: Fetch work alignment data for work progress calculation
      // ============================================
      
      // Fetch objective_feature_links
      const { data: allFeatureLinks } = await supabase
        .from('objective_feature_links')
        .select('id, objective_id, feature_id');
      
      const featureLinksByObjective = new Map<string, any[]>();
      allFeatureLinks?.forEach(link => {
        if (!featureLinksByObjective.has(link.objective_id)) {
          featureLinksByObjective.set(link.objective_id, []);
        }
        featureLinksByObjective.get(link.objective_id)!.push(link);
      });
      
      // Fetch objective_work_item_alignments
      const { data: allWorkAlignments } = await supabase
        .from('objective_work_item_alignments')
        .select('id, objective_id, work_item_id, work_item_type');
      
      const workItemAlignmentsByObjective = new Map<string, any[]>();
      allWorkAlignments?.forEach(alignment => {
        if (!workItemAlignmentsByObjective.has(alignment.objective_id)) {
          workItemAlignmentsByObjective.set(alignment.objective_id, []);
        }
        workItemAlignmentsByObjective.get(alignment.objective_id)!.push(alignment);
      });
      
      // Fetch all features for status lookup
      const { data: allFeatures } = await supabase
        .from('features')
        .select('id, status');
      const featuresById = new Map(allFeatures?.map(f => [f.id, f]) || []);
      
      // Fetch all stories for status lookup
      const { data: allStories } = await supabase
        .from('stories')
        .select('id, status');
      const storiesById = new Map(allStories?.map(s => [s.id, s]) || []);

      // Fetch portfolio and program names for context display
      const { data: portfoliosData } = await supabase
        .from('portfolios')
        .select('id, name');
      const portfolioMap = new Map(portfoliosData?.map(p => [p.id, p.name]) || []);

      const { data: programsData } = await supabase
        .from('programs')
        .select('id, name');
      const programMap = new Map(programsData?.map(p => [p.id, p.name]) || []);

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
      // Store ownKrProgress and ownWorkProgress for each objective (computed from its own data only)
      const objectivesWithKRData = ((data || []) as any[]).map(obj => {
        const keyResults = keyResultsByObjective.get(obj.id) || [];
        
        // Calculate Own Key Results Progress (from this objective's own KRs only)
        let ownKrProgress: number | null = null;
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
          ownKrProgress = totalProgress / keyResults.length;
        }
        
        // ============================================
        // PHASE 5: Calculate Own Work Progress (from aligned work items only)
        // ============================================
        const ownWorkProgress = computeOwnWorkProgressForObjective(
          obj.id,
          featureLinksByObjective,
          workItemAlignmentsByObjective,
          featuresById,
          storiesById
        );
        
        return {
          ...obj,
          summary: obj.name, // Map 'name' to 'summary' for UI compatibility
          keyResults,
          keyResultsCount: keyResults.length,
          ownKrProgress, // Store own KR progress for roll-up calculation
          ownWorkProgress, // Store own work progress for roll-up calculation
          work_progress: ownWorkProgress || 0, // Will be overwritten with rolled-up value for Portfolio
          key_result_progress: ownKrProgress || 0, // Will be overwritten with rolled-up value for Portfolio
          portfolio_name: obj.portfolio_id ? portfolioMap.get(obj.portfolio_id) : undefined,
          program_name: obj.program_id ? programMap.get(obj.program_id) : undefined,
        } as Objective & { keyResults: any[]; keyResultsCount: number; portfolio_name?: string; program_name?: string; ownKrProgress: number | null; ownWorkProgress: number | null };
      });

      // Build hierarchical tree structure
      // Portfolio objectives are roots (level 0), Program objectives with parent_objective_id are children (level 1)
      const objectiveMap = new Map<string, any>();
      objectivesWithKRData.forEach(obj => {
        objectiveMap.set(obj.id, { ...obj, children: [], level: 0, has_children: false });
      });

      const roots: any[] = [];
      
      objectivesWithKRData.forEach(obj => {
        const node = objectiveMap.get(obj.id)!;
        
        if (obj.parent_objective_id && objectiveMap.has(obj.parent_objective_id)) {
          // This is a child - attach to parent
          const parent = objectiveMap.get(obj.parent_objective_id)!;
          node.level = parent.level + 1;
          parent.children.push(node);
          parent.has_children = true;
        } else {
          // This is a root (Portfolio objectives or orphan Program objectives)
          roots.push(node);
        }
      });

      // ============================================
      // PHASE 4: KR Roll-Up Logic (Program → Portfolio)
      // ============================================
      // For Portfolio tier objectives: compute rolledUpKrProgress
      // = average of (portfolio's own KR progress + each child Program's own KR progress)
      // For Program tier objectives: rolledUpKrProgress = ownKrProgress (no children aggregated)
      
      const computeRolledUpKrProgress = (node: any): number | null => {
        // For Program tier (or any non-portfolio), just use own progress
        if (node.tier !== 'portfolio') {
          node.rolledUpKrProgress = node.ownKrProgress;
          node.key_result_progress = node.ownKrProgress || 0;
          return node.ownKrProgress;
        }
        
        // For Portfolio tier: aggregate own progress + child Program progress
        const progressValues: number[] = [];
        
        // Include own KR progress if it exists (has KRs)
        if (node.ownKrProgress !== null && !Number.isNaN(node.ownKrProgress)) {
          progressValues.push(node.ownKrProgress);
        }
        
        // Include each child's KR progress
        if (node.children && node.children.length > 0) {
          node.children.forEach((child: any) => {
            // Recursively compute child's rolled-up progress first
            const childProgress = computeRolledUpKrProgress(child);
            if (childProgress !== null && !Number.isNaN(childProgress)) {
              progressValues.push(childProgress);
            }
          });
        }
        
        // Calculate average of all progress values
        if (progressValues.length > 0) {
          const average = progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length;
          node.rolledUpKrProgress = average;
          node.key_result_progress = average; // UI uses key_result_progress
        } else {
          node.rolledUpKrProgress = null;
          node.key_result_progress = 0;
        }
        
        return node.rolledUpKrProgress;
      };
      
      // ============================================
      // PHASE 5: Work Progress Roll-Up Logic (Program → Portfolio)
      // ============================================
      // For Portfolio tier objectives: compute rolledUpWorkProgress
      // = average of (portfolio's own work progress + each child Program's work progress)
      // For Program tier objectives: rolledUpWorkProgress = ownWorkProgress (no children aggregated)
      
      const computeRolledUpWorkProgress = (node: any): number | null => {
        // For Program tier (or any non-portfolio), just use own progress
        if (node.tier !== 'portfolio') {
          node.rolledUpWorkProgress = node.ownWorkProgress;
          node.work_progress = node.ownWorkProgress || 0;
          return node.ownWorkProgress;
        }
        
        // For Portfolio tier: aggregate own progress + child Program progress
        const progressValues: number[] = [];
        
        // Include own work progress if it exists (has aligned work items)
        if (node.ownWorkProgress !== null && !Number.isNaN(node.ownWorkProgress)) {
          progressValues.push(node.ownWorkProgress);
        }
        
        // Include each child's work progress
        if (node.children && node.children.length > 0) {
          node.children.forEach((child: any) => {
            // Recursively compute child's rolled-up work progress first
            const childProgress = computeRolledUpWorkProgress(child);
            if (childProgress !== null && !Number.isNaN(childProgress)) {
              progressValues.push(childProgress);
            }
          });
        }
        
        // Calculate average of all progress values
        if (progressValues.length > 0) {
          const average = progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length;
          node.rolledUpWorkProgress = average;
          node.work_progress = average; // UI uses work_progress
        } else {
          node.rolledUpWorkProgress = null;
          node.work_progress = 0;
        }
        
        return node.rolledUpWorkProgress;
      };
      
      // Apply both roll-ups to all root nodes (and their descendants)
      roots.forEach(root => {
        computeRolledUpKrProgress(root);
        computeRolledUpWorkProgress(root);
      });

      // Sort roots: Portfolio tier first, then by created_at
      roots.sort((a, b) => {
        if (a.tier === 'portfolio' && b.tier !== 'portfolio') return -1;
        if (a.tier !== 'portfolio' && b.tier === 'portfolio') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Sort children within each parent
      const sortChildren = (nodes: any[]) => {
        nodes.forEach(node => {
          if (node.children.length > 0) {
            node.children.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            sortChildren(node.children);
          }
        });
      };
      sortChildren(roots);

      // Flatten tree for display while preserving hierarchy info
      const flattenTree = (nodes: any[], result: any[] = []): any[] => {
        nodes.forEach(node => {
          result.push(node);
          // Children will be rendered conditionally based on expanded state
        });
        return result;
      };

      return { tree: roots, flat: flattenTree(roots) };
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
      // IMPORTANT: Use 'name' as canonical field, support 'summary' for backward compat
      // DO NOT write to theme_id - use objective_theme_links junction table instead
      const insertPayload: any = {
        name: objective.name || objective.summary, // Prefer name, fallback to summary
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
        // theme_id: REMOVED - use objective_theme_links junction table instead
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
// IMPORTANT: Do NOT update theme_id - use objective_theme_links junction table
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

      // Map summary to name if provided (backward compatibility)
      const updatePayload: any = { ...updates };
      if (updatePayload.summary) {
        updatePayload.name = updatePayload.summary;
        delete updatePayload.summary;
      }
      
      // NEVER write to theme_id - use junction table instead
      delete updatePayload.theme_id;

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
