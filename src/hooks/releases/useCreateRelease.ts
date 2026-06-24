import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Release, CreateReleasePayload } from '@/types/phase3-releases';

// Writes to ph_releases (Catalyst-local). New releases start as 'in_progress' (unreleased).
export function useCreateRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateReleasePayload): Promise<Release> => {
      const { data, error } = await supabase
        .from('ph_releases')
        .insert({
          project_id: payload.project_id,
          name: payload.name,
          title: payload.name, // title is NOT NULL
          description: payload.description ?? null,
          start_date: payload.start_date ?? null,
          release_date: payload.release_date ?? null,
          target_date: payload.release_date ?? payload.start_date ?? null,
          status: 'in_progress',
        } as any)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Release;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'releases'] });
      queryClient.invalidateQueries({ queryKey: ['release-jira-progress'] });
    },
  });
}
