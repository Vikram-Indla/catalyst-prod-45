/**
 * WorkHub Work Items — TanStack Query Hooks
 * Queries vw_wh_work_items_full view, mutations on wh_work_items table
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { WorkItemFull } from '@/types/workhub.types';

export interface WorkItemFilterConfig {
  types?: string[];
  statuses?: string[];
  release_ids?: string[];
  theme_ids?: string[];
  project_ids?: string[];
  assignee_ids?: string[];
  search_query?: string;
}

const QUERY_OPTIONS = { staleTime: 30_000, refetchInterval: 60_000 };

export function useWorkItems(filters?: Partial<WorkItemFilterConfig>) {
  return useQuery({
    queryKey: ['workhub', 'work-items', filters],
    queryFn: async () => {
      let q = supabase.from('vw_wh_work_items_full').select('*')
        .order('depth')
        .order('item_key');

      if (filters?.types?.length) q = q.in('item_type', filters.types);
      if (filters?.statuses?.length) q = q.in('status', filters.statuses);
      if (filters?.release_ids?.length) q = q.in('release_id', filters.release_ids);
      if (filters?.theme_ids?.length) q = q.in('theme_id', filters.theme_ids);
      if (filters?.project_ids?.length) q = q.in('jira_project_id', filters.project_ids);
      if (filters?.assignee_ids?.length) q = q.in('assignee_user_id', filters.assignee_ids);
      if (filters?.search_query) {
        const s = filters.search_query;
        q = q.or(`summary.ilike.%${s}%,item_key.ilike.%${s}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as WorkItemFull[];
    },
    ...QUERY_OPTIONS,
  });
}

export function useWorkItem(id: string) {
  return useQuery({
    queryKey: ['workhub', 'work-item', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_wh_work_items_full')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as WorkItemFull;
    },
    enabled: !!id,
    ...QUERY_OPTIONS,
  });
}

export function useWorkItemChildren(parentId: string) {
  return useQuery({
    queryKey: ['workhub', 'work-item-children', parentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_wh_work_items_full')
        .select('*')
        .eq('parent_id', parentId)
        .order('item_key');
      if (error) throw error;
      return (data ?? []) as unknown as WorkItemFull[];
    },
    enabled: !!parentId,
    ...QUERY_OPTIONS,
  });
}

export function useUpdateWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const { error } = await supabase
        .from('wh_work_items')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
    },
    onError: (err: Error) => {
      toast.error(`Update failed: ${err.message}`);
    },
  });
}

export function useBulkUpdateWorkItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemIds, field, value }: { itemIds: string[]; field: string; value: string }) => {
      const { error } = await supabase.rpc('fn_wh_bulk_update', {
        p_item_ids: itemIds,
        p_field: field,
        p_value: value,
        p_user_id: null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
      toast.success(`Updated ${vars.itemIds.length} items`);
    },
    onError: (err: Error) => {
      toast.error(`Bulk update failed: ${err.message}`);
    },
  });
}
