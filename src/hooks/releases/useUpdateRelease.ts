import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Release, UpdateReleasePayload } from '@/types/phase3-releases';

// Updates ph_releases (Catalyst-local). Accepts an optional status override
// (used by the Release confirmation modal to set status='released').
type UpdatePayload = UpdateReleasePayload & { status?: string; actual_date?: string };

export function useUpdateRelease(releaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePayload & { product_id?: string }): Promise<Release> => {
      const row: Record<string, unknown> = {};
      if (payload.name !== undefined) {
        row.name = payload.name;
        row.title = payload.name;
      }
      if (payload.description !== undefined) row.description = payload.description;
      if (payload.start_date !== undefined) row.start_date = payload.start_date;
      if (payload.release_date !== undefined) {
        row.release_date = payload.release_date;
        row.target_date = payload.release_date;
      }
      if (payload.product_id) row.project_id = payload.product_id;
      if (payload.status !== undefined) row.status = payload.status;
      if (payload.actual_date !== undefined) row.actual_date = payload.actual_date ?? null;

      const { data, error } = await supabase
        .from('ph_releases')
        .update(row)
        .eq('id', releaseId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as unknown as Release;
    },
    onSuccess: (release) => {
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'releases'] });
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'release-progress'] });
      queryClient.invalidateQueries({ queryKey: ['releases', (release as any).project_id] });
      queryClient.invalidateQueries({ queryKey: ['release-jira-progress'] });
    },
  });
}
