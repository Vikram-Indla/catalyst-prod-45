import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export function usePromoteToRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ initiative_id, initiative_type_key, roadmap_priority }: {
      initiative_id: string;
      initiative_type_key?: string;
      roadmap_priority?: number;
    }) => {
      const { data, error } = await typedRpc('promote_to_roadmap', {
        p_initiative_id: initiative_id,
        p_user_id: null,
        p_initiative_type_key: initiative_type_key || null,
        p_roadmap_priority: roadmap_priority || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-summary'] });
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      catalystToast.success('Initiative added to roadmap');
    },
    onError: () => {
      catalystToast.error('Failed to add to roadmap');
    },
  });
}

export function useRemoveFromRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (initiative_id: string) => {
      const { data, error } = await typedRpc('remove_from_roadmap', {
        p_initiative_id: initiative_id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-summary'] });
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      catalystToast.success('Initiative removed from roadmap');
    },
    onError: () => {
      catalystToast.error('Failed to remove from roadmap');
    },
  });
}
