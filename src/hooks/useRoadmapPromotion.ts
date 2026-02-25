import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePromoteToRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ initiative_id, initiative_type_key, roadmap_priority }: {
      initiative_id: string;
      initiative_type_key?: string;
      roadmap_priority?: number;
    }) => {
      const { data, error } = await (supabase as any).rpc('promote_to_roadmap', {
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
      toast.success('Initiative added to roadmap');
    },
    onError: () => {
      toast.error('Failed to add to roadmap');
    },
  });
}

export function useRemoveFromRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (initiative_id: string) => {
      const { data, error } = await (supabase as any).rpc('remove_from_roadmap', {
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
      toast.success('Initiative removed from roadmap');
    },
    onError: () => {
      toast.error('Failed to remove from roadmap');
    },
  });
}
