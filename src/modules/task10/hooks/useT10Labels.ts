// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useT10Labels
// Purpose: CRUD operations for Task¹⁰ labels
// ═══════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10Label, T10LabelCreateInput } from '../types';

// Query keys
export const t10LabelKeys = {
  all: ['t10-labels'] as const,
  labels: () => [...t10LabelKeys.all, 'list'] as const,
  label: (id: string) => [...t10LabelKeys.labels(), id] as const,
};

/**
 * Fetch all labels
 */
export function useT10Labels() {
  return useQuery({
    queryKey: t10LabelKeys.labels(),
    queryFn: async (): Promise<T10Label[]> => {
      const { data, error } = await supabase
        .from('t10_labels')
        .select('id, name, color, description')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching T10 labels:', error);
        throw new Error(error.message);
      }

      // Log for Stage D verification
      console.log('[T10] Labels fetched:', data?.length);

      return (data as T10Label[]) || [];
    },
    staleTime: 60000,
  });
}

/**
 * Create new label
 */
export function useT10CreateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: T10LabelCreateInput): Promise<T10Label> => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('t10_labels')
        .insert({
          name: input.name,
          color: input.color,
          description: input.description || null,
          created_by: user?.id,
        })
        .select('id, name, color, description')
        .single();

      if (error) {
        console.error('Error creating T10 label:', error);
        throw new Error(error.message);
      }

      console.log('[T10] Label created:', data.name, data.color);

      return data as T10Label;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: t10LabelKeys.all });
    },
  });
}

// Alias for backward compatibility
export function useCreateT10Label() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }): Promise<T10Label> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('t10_labels')
        .insert({ 
          name, 
          color,
          created_by: user?.id 
        })
        .select('id, name, color, description')
        .single();
      
      if (error) throw error;
      return data as T10Label;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-labels'] });
    },
  });
}

/**
 * Delete label
 */
export function useT10DeleteLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (labelId: string): Promise<void> => {
      const { error } = await supabase
        .from('t10_labels')
        .delete()
        .eq('id', labelId);

      if (error) {
        console.error('Error deleting T10 label:', error);
        throw new Error(error.message);
      }

      console.log('[T10] Label deleted:', labelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: t10LabelKeys.all });
    },
  });
}
