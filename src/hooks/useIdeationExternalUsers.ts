// ==============================================
// IDEATION EXTERNAL USERS HOOKS
// Per Jira Align "Manage Ideation Users" spec
// ==============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IdeationExternalUser } from '@/types/ideation';
import { toast } from 'sonner';

export interface ExternalUserFilters {
  search?: string;
  groupId?: string;
  showDisabled?: boolean;
}

export function useIdeationExternalUsers(filters?: ExternalUserFilters) {
  return useQuery({
    queryKey: ['ideation-external-users', filters],
    queryFn: async () => {
      let query = supabase
        .from('ideation_external_users')
        .select('*')
        .order('last_name', { ascending: true });

      // Filter by enabled status
      if (!filters?.showDisabled) {
        query = query.eq('is_enabled', true);
      }

      // Filter by group
      if (filters?.groupId) {
        query = query.contains('registered_group_ids', [filters.groupId]);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []) as IdeationExternalUser[];

      // Apply search filter (client-side for flexibility)
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(
          (user) =>
            user.email.toLowerCase().includes(searchLower) ||
            user.first_name.toLowerCase().includes(searchLower) ||
            user.last_name.toLowerCase().includes(searchLower) ||
            user.id.toLowerCase().includes(searchLower)
        );
      }

      return results;
    },
  });
}

export function useIdeationExternalUser(userId: string | null) {
  return useQuery({
    queryKey: ['ideation-external-user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('ideation_external_users')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data as IdeationExternalUser;
    },
    enabled: !!userId,
  });
}

export function useUpdateExternalUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      is_enabled?: boolean;
      is_approved?: boolean;
      first_name?: string;
      last_name?: string;
    }) => {
      const { data, error } = await supabase
        .from('ideation_external_users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as IdeationExternalUser;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ideation-external-users'] });
      queryClient.invalidateQueries({ queryKey: ['ideation-external-user', data.id] });
      toast.success('User updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });
}

export function useDeleteExternalUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('ideation_external_users')
        .delete()
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideation-external-users'] });
      toast.success('User deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete user: ${error.message}`);
    },
  });
}
