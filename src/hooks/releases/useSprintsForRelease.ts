import { useQuery } from '@tanstack/react-query';
import { Sprint, SprintListResponse } from '@/types/phase3-releases';

export function useSprintsForRelease(releaseId: string) {
  return useQuery({
    queryKey: ['sprints', releaseId],
    queryFn: async (): Promise<SprintListResponse> => {
      const res = await fetch(
        `/api/releases/${releaseId}/sprints`
      );
      if (!res.ok) throw new Error(`Failed to fetch sprints: ${res.statusText}`);
      return res.json();
    },
    staleTime: 30000,
  });
}
