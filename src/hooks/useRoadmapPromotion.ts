import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery, typedRpc } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export function usePromoteToRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ request_id, roadmap_priority }: {
      request_id: string;
      roadmap_priority?: number;
    }) => {
      const { data, error } = await typedRpc('promote_to_roadmap', {
        p_initiative_id: request_id,
        p_user_id: null,
        p_roadmap_priority: roadmap_priority || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-requests'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-summary'] });
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      catalystToast.success('Request added to roadmap');
    },
    onError: () => {
      catalystToast.error('Failed to add to roadmap');
    },
  });
}

export function useRemoveFromRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request_id: string) => {
      const { data, error } = await typedRpc('remove_from_roadmap', {
        p_initiative_id: request_id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-requests'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-requests'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-summary'] });
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      catalystToast.success('Request removed from roadmap');
    },
    onError: () => {
      catalystToast.error('Failed to remove from roadmap');
    },
  });
}
