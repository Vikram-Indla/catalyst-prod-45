// ════════════════════════════════════════════════════════════════════════════
// USE SPACE VERSIONS HOOK
// ════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { SpaceVersionsService } from '@/services/spaces';
import type { VersionStatus } from '@/types/spaces';

export const versionKeys = {
  all: (spaceId: string) => ['spaces', spaceId, 'versions'] as const,
  list: (spaceId: string, status?: VersionStatus) => [...versionKeys.all(spaceId), 'list', status] as const,
  detail: (id: string) => ['space-version', id] as const,
};

/** Hook for fetching space versions */
export function useSpaceVersions(spaceId: string | undefined, status?: VersionStatus) {
  return useQuery({
    queryKey: versionKeys.list(spaceId!, status),
    queryFn: () => SpaceVersionsService.getVersions(spaceId!, status),
    enabled: !!spaceId,
    staleTime: 60 * 1000,
  });
}

/** Hook for fetching single version */
export function useSpaceVersion(id: string | undefined) {
  return useQuery({
    queryKey: versionKeys.detail(id!),
    queryFn: () => SpaceVersionsService.getVersion(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}
