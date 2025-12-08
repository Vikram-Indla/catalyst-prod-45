import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  query: string; // JSON stringified filter object
  type: string; // entity type: 'epic', 'feature', 'story', 'demand', 'risk'
  status: string | null;
  is_starred: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useSavedFilters(entityType: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: filters = [], isLoading } = useQuery({
    queryKey: ['saved-filters', entityType],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('saved_filters')
        .select('*')
        .eq('type', entityType)
        .eq('user_id', user.id)
        .order('is_starred', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as SavedFilter[];
    },
  });

  const saveFilter = useMutation({
    mutationFn: async ({ name, query, isDefault = false }: { name: string; query: object; isDefault?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // If setting as default, unset other defaults first
      if (isDefault) {
        await supabase
          .from('saved_filters')
          .update({ is_default: false })
          .eq('type', entityType)
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('saved_filters')
        .insert({
          user_id: user.id,
          name,
          query: JSON.stringify(query),
          type: entityType,
          is_default: isDefault,
          is_starred: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters', entityType] });
      toast({ title: 'Filter saved' });
    },
    onError: (error) => {
      toast({ title: 'Failed to save filter', description: error.message, variant: 'destructive' });
    },
  });

  const updateFilter = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<SavedFilter, 'name' | 'query' | 'is_starred' | 'is_default'>> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // If setting as default, unset other defaults first
      if (updates.is_default) {
        await supabase
          .from('saved_filters')
          .update({ is_default: false })
          .eq('type', entityType)
          .eq('user_id', user.id)
          .neq('id', id);
      }

      const updateData: Record<string, unknown> = { ...updates };
      if (updates.query && typeof updates.query === 'object') {
        updateData.query = JSON.stringify(updates.query);
      }

      const { error } = await supabase
        .from('saved_filters')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters', entityType] });
    },
    onError: (error) => {
      toast({ title: 'Failed to update filter', description: error.message, variant: 'destructive' });
    },
  });

  const deleteFilter = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('saved_filters')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters', entityType] });
      toast({ title: 'Filter deleted' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete filter', description: error.message, variant: 'destructive' });
    },
  });

  const getDefaultFilter = () => filters.find(f => f.is_default);

  const parseFilterQuery = (filter: SavedFilter): object => {
    try {
      return JSON.parse(filter.query);
    } catch {
      return {};
    }
  };

  return {
    filters,
    isLoading,
    saveFilter: saveFilter.mutate,
    updateFilter: updateFilter.mutate,
    deleteFilter: deleteFilter.mutate,
    getDefaultFilter,
    parseFilterQuery,
    isSaving: saveFilter.isPending,
  };
}
