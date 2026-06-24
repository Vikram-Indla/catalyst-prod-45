import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Release, CreateReleasePayload } from '@/types/phase3-releases';

export function useCreateRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateReleasePayload): Promise<Release> => {
      const row: Record<string, unknown> = {
        project_id: payload.project_id,
        name: payload.name,
        title: payload.name, // ph_releases.title is NOT NULL — mirror name
        // ph_releases.status CHECK accepts: planning | in_progress | released | archived
        // 'unreleased' is the UI bucket, NOT the DB value.
        status: 'planning',
      };
      if (payload.description) row.description = payload.description;
      if (payload.start_date) row.start_date = payload.start_date;
      if (payload.release_date) {
        row.release_date = payload.release_date;
        // Some ph_releases schemas use target_date; write both for safety.
        row.target_date = payload.release_date;
      }

      const { data, error } = await supabase
        .from('ph_releases')
        .insert(row)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as unknown as Release;
    },
    onSuccess: (release) => {
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'releases'] });
      queryClient.invalidateQueries({ queryKey: ['releases', (release as any).project_id] });
    },
  });
}
