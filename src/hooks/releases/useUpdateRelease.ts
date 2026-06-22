import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Release, UpdateReleasePayload } from '@/types/phase3-releases';

export function useUpdateRelease(releaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateReleasePayload): Promise<Release> => {
      const res = await fetch(`/api/releases/${releaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || `Update failed: ${res.statusText}`);
      }
      return res.json();
    },
    onSuccess: (release) => {
      queryClient.invalidateQueries({ queryKey: ['releases', release.project_id] });
    },
  });
}
