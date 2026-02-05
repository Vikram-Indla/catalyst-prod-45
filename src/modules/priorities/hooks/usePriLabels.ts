// ============================================================
// File: src/modules/priorities/hooks/usePriLabels.ts
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PriLabel, PriCreateLabelInput } from '../types';
import { PRI_QUERY_KEYS } from '../utils';

/**
 * Fetch all labels for a list
 */
export function usePriLabels(listId: string | undefined) {
  return useQuery({
    queryKey: PRI_QUERY_KEYS.labels(listId ?? ''),
    queryFn: async (): Promise<PriLabel[]> => {
      if (!listId) return [];
      const { data, error } = await supabase
        .from('pri_labels')
        .select('*')
        .eq('list_id', listId)
        .order('name');

      if (error) throw error;
      return (data ?? []) as PriLabel[];
    },
    enabled: !!listId,
  });
}

/**
 * Create a new label
 */
export function useCreatePriLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PriCreateLabelInput) => {
      const { data, error } = await supabase
        .from('pri_labels')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: PRI_QUERY_KEYS.labels(variables.list_id),
      });
    },
  });
}

/**
 * Delete a label
 */
export function useDeletePriLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      labelId,
      listId,
    }: {
      labelId: string;
      listId: string;
    }) => {
      const { error } = await supabase
        .from('pri_labels')
        .delete()
        .eq('id', labelId);

      if (error) throw error;
      return listId;
    },
    onSuccess: (listId) => {
      queryClient.invalidateQueries({
        queryKey: PRI_QUERY_KEYS.labels(listId),
      });
    },
  });
}

/**
 * Update labels on an item (replace all)
 */
export function useUpdatePriItemLabels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      labelIds,
      weekId,
    }: {
      itemId: string;
      labelIds: string[];
      weekId: string;
    }) => {
      // Remove all existing
      await supabase
        .from('pri_item_labels')
        .delete()
        .eq('item_id', itemId);

      // Insert new
      if (labelIds.length > 0) {
        const rows = labelIds.map((labelId) => ({
          item_id: itemId,
          label_id: labelId,
        }));

        const { error } = await supabase
          .from('pri_item_labels')
          .insert(rows);

        if (error) throw error;
      }

      return weekId;
    },
    onSuccess: (weekId) => {
      queryClient.invalidateQueries({
        queryKey: PRI_QUERY_KEYS.items(weekId),
      });
    },
  });
}
