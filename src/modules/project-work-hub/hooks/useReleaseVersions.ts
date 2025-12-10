import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReleaseVersion } from '../types';

export function useReleaseVersions(projectId: string, statusFilter?: 'UNRELEASED' | 'RELEASED' | 'ARCHIVED') {
  return useQuery({
    queryKey: ['release-versions', projectId, statusFilter],
    queryFn: async (): Promise<ReleaseVersion[]> => {
      // Mock release versions
      const versions: ReleaseVersion[] = [
        {
          id: 'rel-1',
          name: 'ESS - Release - 17 Jul',
          status: 'UNRELEASED',
          startDate: '2025-07-06',
          releaseDate: '2025-07-17',
          progress: 65,
          storiesCount: 24,
          defectsCount: 8,
          incidentsCount: 3,
        },
        {
          id: 'rel-2',
          name: 'ESS - Release - 03 Jul',
          status: 'UNRELEASED',
          startDate: '2025-06-15',
          releaseDate: '2025-07-03',
          progress: 85,
          storiesCount: 18,
          defectsCount: 5,
          incidentsCount: 1,
        },
        {
          id: 'rel-3',
          name: 'ESS - Release - 15 Jun',
          status: 'RELEASED',
          startDate: '2025-06-01',
          releaseDate: '2025-06-15',
          progress: 100,
          storiesCount: 32,
          defectsCount: 12,
          incidentsCount: 2,
        },
      ];

      if (statusFilter) {
        return versions.filter(v => v.status === statusFilter);
      }
      return versions;
    },
  });
}

export function useCreateReleaseVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ReleaseVersion>) => {
      console.log('Creating release version', data);
      return { id: `rel-${Date.now()}`, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-versions'] });
    },
  });
}

export function useUpdateReleaseVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ReleaseVersion> & { id: string }) => {
      console.log('Updating release version', id, data);
      return { id, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['release-versions'] });
    },
  });
}
