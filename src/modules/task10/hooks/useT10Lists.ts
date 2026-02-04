// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useT10Lists
// Purpose: CRUD operations for Task¹⁰ lists
// ═══════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  T10ListSummary,
  T10ListCreateInput,
  T10ListUpdateInput,
  T10FilterState,
} from '../types';

// Query keys for cache management
export const t10ListKeys = {
  all: ['t10-lists'] as const,
  lists: () => [...t10ListKeys.all, 'list'] as const,
  list: (id: string) => [...t10ListKeys.lists(), id] as const,
  filtered: (filters: T10FilterState) => [...t10ListKeys.lists(), { filters }] as const,
};

/**
 * Fetch all lists with summary data
 */
export function useT10Lists(filters?: T10FilterState) {
  return useQuery({
    queryKey: filters ? t10ListKeys.filtered(filters) : t10ListKeys.lists(),
    queryFn: async (): Promise<T10ListSummary[]> => {
      let query = supabase
        .from('t10_list_summary')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters) {
        // Status filter
        if (filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }

        // Search filter (list name)
        if (filters.search) {
          query = query.ilike('name', `%${filters.search}%`);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching T10 lists:', error);
        throw new Error(error.message);
      }

      // Log for Stage D verification
      console.log('[T10] Lists fetched:', data?.length, 'results');

      return (data as unknown as T10ListSummary[]) || [];
    },
  });
}

/**
 * Fetch single list by ID (alias for backward compatibility)
 */
export function useT10List(listId: string | null) {
  return useQuery({
    queryKey: t10ListKeys.list(listId || ''),
    queryFn: async (): Promise<T10ListSummary | null> => {
      if (!listId) return null;

      const { data, error } = await supabase
        .from('t10_list_summary')
        .select('*')
        .eq('id', listId)
        .maybeSingle(); // Use maybeSingle() to return null instead of error when no row found

      if (error) {
        console.error('Error fetching T10 list:', error);
        throw new Error(error.message);
      }

      if (!data) {
        console.log('[T10] List not found:', listId);
        return null;
      }

      console.log('[T10] List fetched:', data?.key);

      return data as unknown as T10ListSummary;
    },
    enabled: !!listId,
  });
}

// Alias for backward compatibility
export const useT10ListById = useT10List;

/**
 * Create new list
 */
export function useT10CreateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: T10ListCreateInput): Promise<T10ListSummary> => {
      // Generate key using database function
      const { data: keyData, error: keyError } = await supabase
        .rpc('generate_t10_key');

      if (keyError) {
        console.error('Error generating T10 key:', keyError);
        throw new Error(keyError.message);
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert list
      const { data, error } = await supabase
        .from('t10_lists')
        .insert({
          key: keyData,
          name: input.name,
          description: input.description || null,
          status: input.status || 'active',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating T10 list:', error);
        throw new Error(error.message);
      }

      console.log('[T10] List created:', data.key);

      // Fetch the full summary
      const { data: summary } = await supabase
        .from('t10_list_summary')
        .select('*')
        .eq('id', data.id)
        .single();

      return summary as unknown as T10ListSummary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: t10ListKeys.all });
    },
  });
}

// Alias for backward compatibility
export const useCreateT10List = useT10CreateList;

/**
 * Update existing list
 */
export function useT10UpdateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: T10ListUpdateInput): Promise<T10ListSummary> => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('t10_lists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating T10 list:', error);
        throw new Error(error.message);
      }

      console.log('[T10] List updated:', data.key);

      // Fetch the full summary
      const { data: summary } = await supabase
        .from('t10_list_summary')
        .select('*')
        .eq('id', data.id)
        .single();

      return summary as unknown as T10ListSummary;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: t10ListKeys.all });
      queryClient.setQueryData(t10ListKeys.list(data.id), data);
    },
  });
}

/**
 * Rename list (convenience wrapper)
 */
export function useRenameT10List() {
  const updateList = useT10UpdateList();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ listId, name }: { listId: string; name: string }) => {
      return updateList.mutateAsync({ id: listId, name });
    },
    onSuccess: () => {
      // Task10 landing uses separate query keys (list-cards views)
      queryClient.invalidateQueries({ queryKey: ['t10'] });
    },
  });
}

/**
 * Delete list
 */
export function useT10DeleteList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string): Promise<void> => {
      const { error } = await supabase
        .from('t10_lists')
        .delete()
        .eq('id', listId);

      if (error) {
        console.error('Error deleting T10 list:', error);
        throw new Error(error.message);
      }

      console.log('[T10] List deleted:', listId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: t10ListKeys.all });
      // Task10 landing uses separate query keys (list-cards views)
      queryClient.invalidateQueries({ queryKey: ['t10'] });
    },
  });
}

// Alias for backward compatibility
export const useDeleteT10List = useT10DeleteList;
