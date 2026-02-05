// ============================================================
// File: src/modules/priorities/hooks/usePriLists.ts
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  PriListFull,
  PriCreateListInput,
  PriUpdateListInput,
} from '../types';
import { PRI_QUERY_KEYS } from '../utils';

/**
 * Fetch all priority lists (enriched view)
 */
export function usePriLists() {
  return useQuery({
    queryKey: PRI_QUERY_KEYS.lists,
    queryFn: async (): Promise<PriListFull[]> => {
      const { data, error } = await supabase
        .from('pri_lists_full')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as PriListFull[];
    },
  });
}

/**
 * Fetch a single priority list by ID
 */
export function usePriList(id: string | undefined) {
  return useQuery({
    queryKey: PRI_QUERY_KEYS.list(id ?? ''),
    queryFn: async (): Promise<PriListFull | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('pri_lists_full')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as PriListFull;
    },
    enabled: !!id,
  });
}

/**
 * Create a new priority list
 */
export function useCreatePriList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PriCreateListInput) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('pri_lists')
        .insert({
          title: input.title,
          description: input.description ?? null,
          workstream: input.workstream ?? null,
          owner_id: user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-create first week
      if (data) {
        await supabase.rpc('pri_get_or_create_current_week', {
          p_list_id: data.id,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRI_QUERY_KEYS.lists });
    },
  });
}

/**
 * Update an existing priority list
 */
export function useUpdatePriList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PriUpdateListInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('pri_lists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PRI_QUERY_KEYS.lists });
      queryClient.invalidateQueries({
        queryKey: PRI_QUERY_KEYS.list(variables.id),
      });
    },
  });
}

/**
 * Delete a priority list (and all related data via CASCADE)
 */
export function useDeletePriList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('pri_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRI_QUERY_KEYS.lists });
    },
  });
}
