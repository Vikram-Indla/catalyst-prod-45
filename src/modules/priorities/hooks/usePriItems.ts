// ============================================================
// File: src/modules/priorities/hooks/usePriItems.ts
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  PriItemFull,
  PriItemsSplit,
  PriCreateItemInput,
  PriUpdateItemInput,
} from '../types';
import { PRI_QUERY_KEYS, splitItems } from '../utils';

/**
 * Fetch all items for a week (enriched view)
 */
export function usePriItems(weekId: string | undefined) {
  return useQuery({
    queryKey: PRI_QUERY_KEYS.items(weekId ?? ''),
    queryFn: async (): Promise<PriItemFull[]> => {
      if (!weekId) return [];
      const { data, error } = await supabase
        .from('pri_items_full')
        .select('*')
        .eq('week_id', weekId)
        .order('rank', { ascending: true });

      if (error) throw error;
      
      // Parse labels from JSON to array
      return (data ?? []).map((item) => ({
        ...item,
        labels: Array.isArray(item.labels) 
          ? item.labels 
          : (typeof item.labels === 'string' ? JSON.parse(item.labels) : []),
      })) as PriItemFull[];
    },
    enabled: !!weekId,
  });
}

/**
 * Fetch items split into top 10 and overflow
 */
export function usePriItemsSplit(weekId: string | undefined) {
  const query = usePriItems(weekId);

  const split: PriItemsSplit = query.data
    ? splitItems(query.data)
    : { top: [], overflow: [], all: [] };

  return {
    ...query,
    split,
  };
}

/**
 * Create a new priority item
 */
export function useCreatePriItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PriCreateItemInput) => {
      // Get next rank
      const { data: existing } = await supabase
        .from('pri_items')
        .select('rank')
        .eq('week_id', input.week_id)
        .order('rank', { ascending: false })
        .limit(1);

      const nextRank = existing && existing.length > 0
        ? existing[0].rank + 1
        : 1;

      const { data, error } = await supabase
        .from('pri_items')
        .insert({
          list_id: input.list_id,
          week_id: input.week_id,
          title: input.title,
          description: input.description ?? null,
          assignee_id: input.assignee_id ?? null,
          task_key: input.task_key ?? null,
          rank: nextRank,
          status: 'todo',
          is_carryover: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Audit
      await supabase.from('pri_item_history').insert({
        item_id: data.id,
        action: 'created',
        new_value: input.title,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: PRI_QUERY_KEYS.items(variables.week_id),
      });
      queryClient.invalidateQueries({ queryKey: PRI_QUERY_KEYS.lists });
    },
  });
}

/**
 * Update an existing item
 */
export function useUpdatePriItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PriUpdateItemInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('pri_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: PRI_QUERY_KEYS.items(data.week_id),
      });
    },
  });
}

/**
 * Cycle item status via database function
 */
export function useCyclePriItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      weekId,
    }: {
      itemId: string;
      weekId: string;
    }) => {
      const { data, error } = await supabase.rpc('pri_cycle_item_status', {
        p_item_id: itemId,
      });

      if (error) throw error;
      return { newStatus: data as string, weekId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: PRI_QUERY_KEYS.items(result.weekId),
      });
      queryClient.invalidateQueries({ queryKey: PRI_QUERY_KEYS.lists });
    },
  });
}

/**
 * Reorder items via database function
 */
export function useReorderPriItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      weekId,
      itemIds,
    }: {
      weekId: string;
      itemIds: string[];
    }) => {
      const { error } = await supabase.rpc('pri_reorder_items', {
        p_week_id: weekId,
        p_item_ids: itemIds,
      });

      if (error) throw error;
      return weekId;
    },
    onSuccess: (weekId) => {
      queryClient.invalidateQueries({
        queryKey: PRI_QUERY_KEYS.items(weekId),
      });
    },
  });
}

/**
 * Delete an item
 */
export function useDeletePriItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      weekId,
    }: {
      itemId: string;
      weekId: string;
    }) => {
      // Audit before delete
      await supabase.from('pri_item_history').insert({
        item_id: itemId,
        action: 'deleted',
      });

      const { error } = await supabase
        .from('pri_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return weekId;
    },
    onSuccess: (weekId) => {
      queryClient.invalidateQueries({
        queryKey: PRI_QUERY_KEYS.items(weekId),
      });
      queryClient.invalidateQueries({ queryKey: PRI_QUERY_KEYS.lists });
    },
  });
}

/**
 * Confirm carryover items (mark them as acknowledged)
 */
export function useConfirmCarryover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      weekId,
      itemIds,
    }: {
      weekId: string;
      itemIds: string[];
    }) => {
      // Just mark is_carryover = false (acknowledged)
      const { error } = await supabase
        .from('pri_items')
        .update({ is_carryover: false })
        .in('id', itemIds);

      if (error) throw error;
      return weekId;
    },
    onSuccess: (weekId) => {
      queryClient.invalidateQueries({
        queryKey: PRI_QUERY_KEYS.items(weekId),
      });
    },
  });
}
