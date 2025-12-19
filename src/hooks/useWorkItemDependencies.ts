/**
 * useWorkItemDependencies - Bidirectional dependency hook
 * 
 * Fetches both outgoing (this item depends on others) and incoming (others depend on this item)
 * dependencies for any work item (Epic or Feature).
 * 
 * Direction is derived, not stored:
 * - Outgoing: requesting_work_item_id === currentWorkItemId
 * - Incoming: depends_on_work_item_id === currentWorkItemId
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  WorkItemDependencyType, 
  DependencyLevelV2, 
  DependencyTypeV2, 
  DependencyStatus,
  RiskLevel 
} from '@/lib/dependencies/types';

export type DependencyDirection = 'outgoing' | 'incoming';

export interface WorkItemDependency {
  id: string;
  direction: DependencyDirection;
  
  // Source work item
  source_id: string;
  source_type: WorkItemDependencyType;
  source_key: string;
  source_name: string;
  source_container_name: string | null;
  
  // Target work item
  target_id: string;
  target_type: WorkItemDependencyType;
  target_key: string;
  target_name: string;
  target_container_name: string | null;
  
  // Classification
  dependency_level: DependencyLevelV2 | string | null;
  dependency_type: DependencyTypeV2 | string | null;
  is_cross_level: boolean;
  
  // Scheduling
  quarter: string;
  needed_by_date: string | null;
  committed_by_date: string | null;
  
  // Status & Risk
  status: DependencyStatus | string | null;
  risk_level: RiskLevel | null;
  
  // Blocked flags
  source_blocked: boolean;
  target_delayed: boolean;
  
  // Description
  description: string | null;
  
  // Timestamps
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateDependencyParams {
  requesting_work_item_id: string;
  requesting_work_item_type: WorkItemDependencyType;
  depends_on_work_item_id: string;
  depends_on_work_item_type: WorkItemDependencyType;
  dependency_type: DependencyTypeV2;
  needed_by_date: string;
  quarter: string;
  risk_level?: RiskLevel;
  description?: string;
  status?: DependencyStatus;
}

export function useWorkItemDependencies(
  workItemType: WorkItemDependencyType,
  workItemId: string
) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['work-item-dependencies', workItemType, workItemId],
    queryFn: async () => {
      if (!workItemId) return { outgoing: [], incoming: [] };

      // Get dependencies where this item is the source (outgoing)
      // Use new fields if available, fallback to legacy from_feature_id
      const { data: outgoingDeps, error: outError } = await supabase
        .from('dependencies')
        .select(`
          *,
          from_feature:features!dependencies_from_feature_id_fkey(id, name, display_id, epic_id),
          to_feature:features!dependencies_to_feature_id_fkey(id, name, display_id, epic_id)
        `)
        .or(
          workItemType === 'epic'
            ? `requesting_work_item_id.eq.${workItemId},and(requesting_work_item_type.eq.epic)`
            : `requesting_work_item_id.eq.${workItemId},from_feature_id.eq.${workItemId}`
        );

      if (outError) throw outError;

      // Get dependencies where this item is the target (incoming)
      const { data: incomingDeps, error: inError } = await supabase
        .from('dependencies')
        .select(`
          *,
          from_feature:features!dependencies_from_feature_id_fkey(id, name, display_id, epic_id),
          to_feature:features!dependencies_to_feature_id_fkey(id, name, display_id, epic_id)
        `)
        .or(
          workItemType === 'epic'
            ? `depends_on_work_item_id.eq.${workItemId},and(depends_on_work_item_type.eq.epic)`
            : `depends_on_work_item_id.eq.${workItemId},to_feature_id.eq.${workItemId}`
        );

      if (inError) throw inError;

      // Also fetch epic data for epic-level dependencies
      const epicIds = new Set<string>();
      [...(outgoingDeps || []), ...(incomingDeps || [])].forEach(dep => {
        if (dep.requesting_work_item_type === 'epic' && dep.requesting_work_item_id) {
          epicIds.add(dep.requesting_work_item_id);
        }
        if (dep.depends_on_work_item_type === 'epic' && dep.depends_on_work_item_id) {
          epicIds.add(dep.depends_on_work_item_id);
        }
      });

      let epicsMap: Record<string, { id: string; name: string; epic_key: string; program_id: string }> = {};
      if (epicIds.size > 0) {
        const { data: epics } = await supabase
          .from('epics')
          .select('id, name, epic_key, program_id')
          .in('id', Array.from(epicIds));
        if (epics) {
          epicsMap = Object.fromEntries(epics.map(e => [e.id, e]));
        }
      }

      // Transform outgoing dependencies
      const outgoing: WorkItemDependency[] = (outgoingDeps || [])
        .filter(dep => {
          // Ensure this is actually outgoing
          if (workItemType === 'epic') {
            return dep.requesting_work_item_id === workItemId || dep.from_feature?.epic_id === workItemId;
          }
          return dep.requesting_work_item_id === workItemId || dep.from_feature_id === workItemId;
        })
        .map(dep => transformDependency(dep, 'outgoing', workItemId, workItemType, epicsMap));

      // Transform incoming dependencies
      const incoming: WorkItemDependency[] = (incomingDeps || [])
        .filter(dep => {
          // Ensure this is actually incoming
          if (workItemType === 'epic') {
            return dep.depends_on_work_item_id === workItemId || dep.to_feature?.epic_id === workItemId;
          }
          return dep.depends_on_work_item_id === workItemId || dep.to_feature_id === workItemId;
        })
        .map(dep => transformDependency(dep, 'incoming', workItemId, workItemType, epicsMap));

      return { outgoing, incoming };
    },
    enabled: !!workItemId,
  });

  // Create dependency mutation
  const createDependency = useMutation({
    mutationFn: async (params: CreateDependencyParams) => {
      // Derive dependency level
      let dependency_level_v2: DependencyLevelV2;
      let is_cross_level = false;
      
      if (params.requesting_work_item_type === 'epic' && params.depends_on_work_item_type === 'epic') {
        dependency_level_v2 = 'execution';
      } else if (params.requesting_work_item_type === 'feature' && params.depends_on_work_item_type === 'feature') {
        dependency_level_v2 = 'delivery';
      } else {
        dependency_level_v2 = 'cross_level';
        is_cross_level = true;
      }

      const payload: any = {
        requesting_work_item_id: params.requesting_work_item_id,
        requesting_work_item_type: params.requesting_work_item_type,
        depends_on_work_item_id: params.depends_on_work_item_id,
        depends_on_work_item_type: params.depends_on_work_item_type,
        dependency_level_v2,
        is_cross_level_exception: is_cross_level,
        type: params.dependency_type,
        needed_by_date: params.needed_by_date,
        quarter: params.quarter,
        risk_level: params.risk_level || 'med',
        description: params.description || null,
        status: params.status || 'draft',
        // Legacy fields for backwards compatibility
        from_feature_id: params.requesting_work_item_type === 'feature' 
          ? params.requesting_work_item_id 
          : params.depends_on_work_item_id, // fallback
        to_feature_id: params.depends_on_work_item_type === 'feature'
          ? params.depends_on_work_item_id
          : params.requesting_work_item_id, // fallback
      };

      const { data, error } = await supabase
        .from('dependencies')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['dependencies-grid'] });
      toast.success('Dependency created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create dependency: ${error.message}`);
    },
  });

  // Update dependency mutation
  const updateDependency = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateDependencyParams & { 
      source_blocked?: boolean;
      target_delayed?: boolean;
      committed_by_date?: string;
    }>) => {
      const { error } = await supabase
        .from('dependencies')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['dependencies-grid'] });
      toast.success('Dependency updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update dependency: ${error.message}`);
    },
  });

  // Delete dependency mutation
  const deleteDependency = useMutation({
    mutationFn: async (dependencyId: string) => {
      const { error } = await supabase
        .from('dependencies')
        .delete()
        .eq('id', dependencyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['dependencies-grid'] });
      toast.success('Dependency deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete dependency: ${error.message}`);
    },
  });

  return {
    outgoing: data?.outgoing || [],
    incoming: data?.incoming || [],
    allDependencies: [...(data?.outgoing || []), ...(data?.incoming || [])],
    isLoading,
    error,
    createDependency: createDependency.mutate,
    updateDependency: updateDependency.mutate,
    deleteDependency: deleteDependency.mutate,
    isCreating: createDependency.isPending,
    isUpdating: updateDependency.isPending,
    isDeleting: deleteDependency.isPending,
  };
}

/**
 * Transform raw dependency data into WorkItemDependency
 */
function transformDependency(
  dep: any,
  direction: DependencyDirection,
  currentWorkItemId: string,
  currentWorkItemType: WorkItemDependencyType,
  epicsMap: Record<string, { id: string; name: string; epic_key: string; program_id: string }>
): WorkItemDependency {
  // Determine source and target based on direction
  const isOutgoing = direction === 'outgoing';
  
  // Get source info
  let source_id: string;
  let source_type: WorkItemDependencyType;
  let source_key: string;
  let source_name: string;
  let source_container_name: string | null = null;

  // Get target info
  let target_id: string;
  let target_type: WorkItemDependencyType;
  let target_key: string;
  let target_name: string;
  let target_container_name: string | null = null;

  // New model fields available
  if (dep.requesting_work_item_id && dep.depends_on_work_item_id) {
    source_id = dep.requesting_work_item_id;
    source_type = dep.requesting_work_item_type || 'feature';
    target_id = dep.depends_on_work_item_id;
    target_type = dep.depends_on_work_item_type || 'feature';

    if (source_type === 'epic' && epicsMap[source_id]) {
      source_key = epicsMap[source_id].epic_key || source_id.slice(0, 8);
      source_name = epicsMap[source_id].name;
    } else if (source_type === 'feature' && dep.from_feature) {
      source_key = dep.from_feature.display_id || source_id.slice(0, 8);
      source_name = dep.from_feature.name;
    } else {
      source_key = source_id.slice(0, 8);
      source_name = 'Unknown';
    }

    if (target_type === 'epic' && epicsMap[target_id]) {
      target_key = epicsMap[target_id].epic_key || target_id.slice(0, 8);
      target_name = epicsMap[target_id].name;
    } else if (target_type === 'feature' && dep.to_feature) {
      target_key = dep.to_feature.display_id || target_id.slice(0, 8);
      target_name = dep.to_feature.name;
    } else {
      target_key = target_id.slice(0, 8);
      target_name = 'Unknown';
    }
  } else {
    // Legacy model - use from_feature_id / to_feature_id
    source_id = dep.from_feature_id;
    source_type = 'feature';
    target_id = dep.to_feature_id;
    target_type = 'feature';

    source_key = dep.from_feature?.display_id || source_id?.slice(0, 8) || 'N/A';
    source_name = dep.from_feature?.name || 'Unknown Feature';
    target_key = dep.to_feature?.display_id || target_id?.slice(0, 8) || 'N/A';
    target_name = dep.to_feature?.name || 'Unknown Feature';
  }

  return {
    id: dep.id,
    direction,
    source_id,
    source_type,
    source_key,
    source_name,
    source_container_name,
    target_id,
    target_type,
    target_key,
    target_name,
    target_container_name,
    dependency_level: dep.dependency_level_v2 || dep.dependency_level,
    dependency_type: dep.type,
    is_cross_level: dep.is_cross_level_exception || false,
    quarter: dep.quarter || '',
    needed_by_date: dep.needed_by_date,
    committed_by_date: dep.committed_by_date,
    status: dep.status,
    risk_level: dep.risk_level,
    source_blocked: dep.source_blocked || dep.blocked_requestor || false,
    target_delayed: dep.target_delayed || dep.blocked_respondent || false,
    description: dep.description,
    created_at: dep.created_at,
    updated_at: dep.updated_at,
  };
}
