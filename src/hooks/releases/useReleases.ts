import { useQuery } from '@tanstack/react-query';
import { Release, ReleaseListResponse } from '@/types/phase3-releases';

export function useReleases(projectKey: string) {
  return useQuery({
    queryKey: ['releases', projectKey],
    queryFn: async (): Promise<ReleaseListResponse> => {
      const res = await fetch(`/api/projects/${projectKey}/releases`);
      if (!res.ok) {
        // API not yet implemented — return empty data for testing modals
        return { data: [] };
      }
      return res.json();
    },
    staleTime: 30000, // 30s
  });
}
