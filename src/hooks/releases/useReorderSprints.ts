import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ReorderSprintsPayload } from '@/types/phase3-releases';

export function useReorderSprints(releaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sprints: Array<{ id: string; sequence: number }>) => {
      const payload: ReorderSprintsPayload = { sprints };
      const res = await fetch(`/api/releases/${releaseId}/sprints/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Reorder failed: ${res.statusText}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', releaseId] });
    },
  });
}
