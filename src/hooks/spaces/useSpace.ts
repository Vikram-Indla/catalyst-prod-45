// ════════════════════════════════════════════════════════════════════════════
// USE SPACE HOOK - Single space details
// ════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { SpacesService } from '@/services/spaces';
import { spaceKeys } from './useSpaces';

/** Hook for fetching single space by ID */
export function useSpace(id: string | undefined) {
  return useQuery({
    queryKey: spaceKeys.detail(id!),
    queryFn: () => SpacesService.getSpace(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/** Hook for fetching space by key */
export function useSpaceByKey(key: string | undefined) {
  return useQuery({
    queryKey: spaceKeys.byKey(key!),
    queryFn: () => SpacesService.getSpaceByKey(key!),
    enabled: !!key,
    staleTime: 30 * 1000,
  });
}
