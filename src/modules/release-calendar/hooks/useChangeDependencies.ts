import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ChangeDependency, DependencyStatus, DependencyType } from '../types';
import { changeCardKeys } from './useChangeCards';

export const changeDependencyKeys = {
  all: ['change-dependencies'] as const,
  lists: () => [...changeDependencyKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...changeDependencyKeys.lists(), filters] as const,
  byChange: (changeCardId: string) => [...changeDependencyKeys.all, 'change', changeCardId] as const,
};

export function useChangeDependencies(filters?: {
  status?: DependencyStatus;
}) {
  return useQuery({
    queryKey: changeDependencyKeys.list(filters || {}),
    queryFn: async () => {
      let query = supabase
        .from('change_dependencies')
        .select(`
          *,
          blocking_change:change_cards!change_dependencies_blocking_change_id_fkey(id, change_number, title, status, planned_prod_date, approved, risk_level),
          blocked_change:change_cards!change_dependencies_blocked_change_id_fkey(id, change_number, title, status, planned_prod_date, approved, risk_level)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ChangeDependency[];
    },
  });
}

export function useDependenciesByCard(changeCardId: string) {
  return useQuery({
    queryKey: changeDependencyKeys.byChange(changeCardId),
    queryFn: async () => {
      // Get dependencies where this card is blocking others
      const { data: blocking, error: blockingError } = await supabase
        .from('change_dependencies')
        .select(`
          *,
          blocked_change:change_cards!change_dependencies_blocked_change_id_fkey(id, change_number, title, status)
        `)
        .eq('blocking_change_id', changeCardId);

      if (blockingError) throw blockingError;

      // Get dependencies where this card is blocked by others
      const { data: blockedBy, error: blockedByError } = await supabase
        .from('change_dependencies')
        .select(`
          *,
          blocking_change:change_cards!change_dependencies_blocking_change_id_fkey(id, change_number, title, status)
        `)
        .eq('blocked_change_id', changeCardId);

      if (blockedByError) throw blockedByError;

      return {
        blocking: blocking as ChangeDependency[],
        blockedBy: blockedBy as ChangeDependency[],
      };
    },
    enabled: !!changeCardId,
  });
}

export function useCreateDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      blocking_change_id: string;
      blocked_change_id: string;
      dependency_type: DependencyType;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('change_dependencies')
        .insert({
          ...input,
          status: 'active',
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ChangeDependency;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: changeDependencyKeys.all });
      queryClient.invalidateQueries({ queryKey: changeCardKeys.detail(data.blocking_change_id) });
      queryClient.invalidateQueries({ queryKey: changeCardKeys.detail(data.blocked_change_id) });
    },
  });
}

export function useUpdateDependencyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status 
    }: { 
      id: string; 
      status: DependencyStatus;
    }) => {
      const { data, error } = await supabase
        .from('change_dependencies')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ChangeDependency;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: changeDependencyKeys.all });
    },
  });
}

export function useDeleteDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('change_dependencies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: changeDependencyKeys.all });
    },
  });
}
