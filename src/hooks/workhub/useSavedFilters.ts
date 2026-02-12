/**
 * Saved Filters Hooks — Phase 9
 * CRUD for wh_saved_filters (ph_saved_filters table)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SavedFilter {
  id: string;
  name: string;
  user_id?: string;
  is_shared: boolean;
  filter_config: Record<string, any>;
  page: string;
  created_at: string;
  updated_at: string;
}

export function useSavedFilters(page?: string) {
  return useQuery({
    queryKey: ['workhub', 'saved-filters', page],
    queryFn: async () => {
      let query = supabase.from('ph_saved_filters').select('*').order('name');
      if (page) query = query.eq('page', page);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SavedFilter[];
    },
    staleTime: 30_000,
  });
}

export function useCreateSavedFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; filter_config: Record<string, any>; page?: string; is_shared?: boolean }) => {
      const { data, error } = await supabase
        .from('ph_saved_filters')
        .insert({
          name: params.name,
          filter_config: params.filter_config,
          page: params.page || 'workitems',
          is_shared: params.is_shared || false,
        } as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub', 'saved-filters'] });
      toast.success('Filter saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateSavedFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<{ name: string; filter_config: Record<string, any>; is_shared: boolean }> }) => {
      const { error } = await supabase
        .from('ph_saved_filters')
        .update(updates as any)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub', 'saved-filters'] });
      toast.success('Filter updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteSavedFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ph_saved_filters')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub', 'saved-filters'] });
      toast.success('Filter deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
