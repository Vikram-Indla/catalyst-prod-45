import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useLinkUnlinkSprints(releaseId: string) {
  const queryClient = useQueryClient();

  const linkSprint = useMutation({
    mutationFn: async (sprintId: string) => {
      const res = await fetch(`/api/releases/${releaseId}/sprints/${sprintId}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`Link failed: ${res.statusText}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', releaseId] });
    },
  });

  const unlinkSprint = useMutation({
    mutationFn: async (sprintId: string) => {
      const res = await fetch(`/api/releases/${releaseId}/sprints/${sprintId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`Unlink failed: ${res.statusText}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', releaseId] });
    },
  });

  return { linkSprint, unlinkSprint };
}
