import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Release, UpdateReleasePayload } from '@/types/phase3-releases';

// Updates ph_releases (Catalyst-local). Accepts an optional status override
// (used by the Release confirmation modal to set status='released').
type UpdatePayload = UpdateReleasePayload & { status?: string; actual_date?: string };

export function useUpdateRelease(releaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePayload): Promise<Release> => {
      const updates: Record<string, unknown> = {};
      if (payload.name !== undefined) { updates.name = payload.name; updates.title = payload.name; }
      if (payload.description !== undefined) updates.description = payload.description ?? null;
      if (payload.start_date !== undefined) updates.start_date = payload.start_date ?? null;
      if (payload.release_date !== undefined) updates.release_date = payload.release_date ?? null;
      if (payload.status !== undefined) updates.status = payload.status;
      if (payload.actual_date !== undefined) updates.actual_date = payload.actual_date ?? null;

      const { data, error } = await supabase
        .from('ph_releases')
        .update(updates as any)
        .eq('id', releaseId)
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
