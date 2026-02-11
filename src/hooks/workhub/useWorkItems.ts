/**
 * WorkHub Work Items — TanStack Query Hooks
 * Server-side pagination + count query for performance
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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

export interface PaginationConfig {
  page: number;
  pageSize: number;
}

const QUERY_OPTIONS = { staleTime: 30_000, refetchInterval: 60_000 };

/** Build a filtered query (reusable for both data + count) */
function buildFilteredQuery(
  baseQuery: any,
  filters?: Partial<WorkItemFilterConfig>,
) {
  let q = baseQuery;
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
  return q;
}

/**
 * Paginated work items with server-side count.
 * Uses keepPreviousData for smooth pagination transitions.
 */
export function useWorkItems(
  filters?: Partial<WorkItemFilterConfig>,
  pagination?: PaginationConfig,
) {
  const page = pagination?.page ?? 0;
  const pageSize = pagination?.pageSize ?? 50;

  return useQuery({
    queryKey: ['workhub', 'work-items', filters, page, pageSize],
    queryFn: async () => {
      // Data query with range
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from('vw_wh_work_items_full')
        .select('*', { count: 'exact' })
        .order('depth')
        .order('item_key')
        .range(from, to);

      q = buildFilteredQuery(q, filters);

      const { data, error, count } = await q;
      if (error) throw error;

      return {
        items: (data ?? []) as unknown as WorkItemFull[],
        totalCount: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      };
    },
    placeholderData: keepPreviousData,
    ...QUERY_OPTIONS,
  });
}

/** Total count only — lightweight query for KPIs */
export function useWorkItemCount(filters?: Partial<WorkItemFilterConfig>) {
  return useQuery({
    queryKey: ['workhub', 'work-items-count', filters],
    queryFn: async () => {
      let q = supabase
        .from('vw_wh_work_items_full')
        .select('*', { count: 'exact', head: true });

      q = buildFilteredQuery(q, filters);

      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
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
