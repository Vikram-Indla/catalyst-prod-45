import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface UpdateStoryReleaseSprintsPayload {
  release_id?: string;
  sprint_ids?: string[];
}

export function useUpdateStoryReleaseSprints(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateStoryReleaseSprintsPayload) => {
      const res = await fetch(`/api/stories/${storyId}`, {
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
    onSuccess: () => {
      // Invalidate story queries
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
    },
  });
}
