// ════════════════════════════════════════════════════════════════════════════
// USE SPACE PERMISSIONS HOOK
// ════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { SpacePermissionsService } from '@/services/spaces';

export const permissionKeys = {
  all: (spaceId: string) => ['spaces', spaceId, 'permissions'] as const,
  list: (spaceId: string) => [...permissionKeys.all(spaceId), 'list'] as const,
};

/** Hook for fetching space permissions */
export function useSpacePermissions(spaceId: string | undefined) {
  return useQuery({
    queryKey: permissionKeys.list(spaceId!),
    queryFn: () => SpacePermissionsService.getPermissions(spaceId!),
    enabled: !!spaceId,
    staleTime: 60 * 1000,
  });
}
