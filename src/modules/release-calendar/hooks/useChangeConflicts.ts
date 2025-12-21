import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ChangeConflict, ConflictStatus } from '../types';
import { changeCardKeys } from './useChangeCards';

export const changeConflictKeys = {
  all: ['change-conflicts'] as const,
  lists: () => [...changeConflictKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...changeConflictKeys.lists(), filters] as const,
  byChange: (changeCardId: string) => [...changeConflictKeys.all, 'change', changeCardId] as const,
};

export function useChangeConflicts(filters?: {
  status?: ConflictStatus;
  severity?: string;
  conflict_type?: string;
}) {
  return useQuery({
    queryKey: changeConflictKeys.list(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('change_conflicts')
        .select(`
          *,
          change_cards!change_conflicts_change_card_id_fkey(id, change_number, title, planned_prod_date),
          related_change:change_cards!change_conflicts_related_change_id_fkey(id, change_number, title),
          related_window:release_windows!change_conflicts_related_window_id_fkey(id, title, window_type)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.conflict_type) {
        query = query.eq('conflict_type', filters.conflict_type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (ChangeConflict & { change_cards: any })[];
    },
  });
}

export function useChangeConflictsByCard(changeCardId: string) {
  return useQuery({
    queryKey: changeConflictKeys.byChange(changeCardId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_conflicts')
        .select(`
          *,
          related_change:change_cards!change_conflicts_related_change_id_fkey(id, change_number, title),
          related_window:release_windows!change_conflicts_related_window_id_fkey(id, title, window_type)
        `)
        .eq('change_card_id', changeCardId)
        .order('severity', { ascending: false });

      if (error) throw error;
      return data as ChangeConflict[];
    },
    enabled: !!changeCardId,
  });
}

export function useResolveConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      resolution_notes 
    }: { 
      id: string; 
      status: ConflictStatus; 
      resolution_notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('change_conflicts')
        .update({
          status,
          resolution_notes,
          resolved_by_user_id: status === 'resolved' ? user.id : null,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ChangeConflict;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: changeConflictKeys.all });
      queryClient.invalidateQueries({ queryKey: changeCardKeys.detail(data.change_card_id) });
    },
  });
}

export function useCreateConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<ChangeConflict, 'id' | 'created_at' | 'resolved_by_user_id' | 'resolved_at' | 'resolution_notes' | 'related_change' | 'related_window'>) => {
      const { data, error } = await supabase
        .from('change_conflicts')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as ChangeConflict;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: changeConflictKeys.all });
      queryClient.invalidateQueries({ queryKey: changeCardKeys.detail(data.change_card_id) });
    },
  });
}
