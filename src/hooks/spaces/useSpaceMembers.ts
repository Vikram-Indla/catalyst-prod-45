// ════════════════════════════════════════════════════════════════════════════
// USE SPACE MEMBERS HOOK
// ════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { SpaceMembersService } from '@/services/spaces';

export const memberKeys = {
  all: (spaceId: string) => ['spaces', spaceId, 'members'] as const,
  list: (spaceId: string) => [...memberKeys.all(spaceId), 'list'] as const,
  detail: (spaceId: string, userId: string) => [...memberKeys.all(spaceId), userId] as const,
  currentRole: (spaceId: string) => [...memberKeys.all(spaceId), 'current-role'] as const,
};

/** Hook for fetching space members */
export function useSpaceMembers(spaceId: string | undefined) {
  return useQuery({
    queryKey: memberKeys.list(spaceId!),
    queryFn: () => SpaceMembersService.getMembers(spaceId!),
    enabled: !!spaceId,
    staleTime: 60 * 1000,
  });
}

/** Hook for getting current user's role in a space */
export function useCurrentUserRole(spaceId: string | undefined) {
  return useQuery({
    queryKey: memberKeys.currentRole(spaceId!),
    queryFn: () => SpaceMembersService.getCurrentUserRole(spaceId!),
    enabled: !!spaceId,
    staleTime: 60 * 1000,
  });
}

/** Hook for checking if current user has a specific permission */
export function useHasPermission(spaceId: string | undefined, permissionKey: string) {
  return useQuery({
    queryKey: ['spaces', spaceId, 'permission', permissionKey],
    queryFn: () => SpaceMembersService.hasPermission(spaceId!, permissionKey),
    enabled: !!spaceId,
    staleTime: 60 * 1000,
  });
}
