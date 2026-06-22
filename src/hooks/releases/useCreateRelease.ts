import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Release, CreateReleasePayload } from '@/types/phase3-releases';

export function useCreateRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateReleasePayload): Promise<Release> => {
      const res = await fetch('/api/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || `Create failed: ${res.statusText}`);
      }
      return res.json();
    },
    onSuccess: (release) => {
      // Invalidate releases list for the project
      queryClient.invalidateQueries({ queryKey: ['releases', release.project_id] });
    },
  });
}
