import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchHierarchyTree, fetchRootEpics } from '@/services/hierarchyService';
import { supabase } from '@/integrations/supabase/client';

// ALL hooks accept projectId — read from useParams() in the page component
// and pass down. NEVER hardcode a project ID.

export function useRootEpics(projectId: string) {
  return useQuery({
    queryKey: ['hierarchy', projectId, 'roots'],
    queryFn: () => fetchRootEpics(projectId),
    enabled: !!projectId,
  });
}

export function useHierarchyTree(rootId: string | null) {
  return useQuery({
    queryKey: ['hierarchy', 'tree', rootId],
    queryFn: () => fetchHierarchyTree(rootId!),
    enabled: !!rootId,
  });
}

export function useCreateWorkItem(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      hierarchyLevel: number;
      parentId?: string;
      statusId: string;
      priorityId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('hi_work_items' as any).insert({
        project_id: projectId,
        title: input.title,
        hierarchy_level: input.hierarchyLevel,
        parent_id: input.parentId || null,
        status_id: input.statusId,
        priority_id: input.priorityId || null,
        reporter_id: user!.id,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy', projectId] });
    },
  });
}

export function useMoveWorkItem(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, newParentId }: { itemId: string; newParentId: string }) => {
      const { data: isValid } = await supabase.rpc('hi_validate_hierarchy_move', {
        p_node_id: itemId,
        p_new_parent_id: newParentId,
      } as any);
      if (!isValid) throw new Error('Invalid hierarchy move');
      const { error } = await supabase.from('hi_work_items' as any)
        .update({ parent_id: newParentId } as any)
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy', projectId] });
    },
  });
}

export function useStatuses(projectId: string) {
  return useQuery({
    queryKey: ['hierarchy', projectId, 'statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hi_statuses' as any)
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function usePriorities() {
  return useQuery({
    queryKey: ['hierarchy', 'priorities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hi_priorities' as any)
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}
