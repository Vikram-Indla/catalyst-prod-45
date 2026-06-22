import { useQuery } from '@tanstack/react-query';
import { Release, ReleaseListResponse } from '@/types/phase3-releases';

export function useReleases(projectKey: string) {
  return useQuery({
    queryKey: ['releases', projectKey],
    queryFn: async (): Promise<ReleaseListResponse> => {
      const res = await fetch(`/api/projects/${projectKey}/releases`);
      if (!res.ok) throw new Error(`Failed to fetch releases: ${res.statusText}`);
      return res.json();
    },
    staleTime: 30000, // 30s
  });
}
