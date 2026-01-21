// ════════════════════════════════════════════════════════════════════════════
// USE SPACE COMPONENTS HOOK
// ════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { SpaceComponentsService } from '@/services/spaces';

export const componentKeys = {
  all: (spaceId: string) => ['spaces', spaceId, 'components'] as const,
  list: (spaceId: string) => [...componentKeys.all(spaceId), 'list'] as const,
  detail: (id: string) => ['space-component', id] as const,
};

/** Hook for fetching space components */
export function useSpaceComponents(spaceId: string | undefined) {
  return useQuery({
    queryKey: componentKeys.list(spaceId!),
    queryFn: () => SpaceComponentsService.getComponents(spaceId!),
    enabled: !!spaceId,
    staleTime: 60 * 1000,
  });
}

/** Hook for fetching single component */
export function useSpaceComponent(id: string | undefined) {
  return useQuery({
    queryKey: componentKeys.detail(id!),
    queryFn: () => SpaceComponentsService.getComponent(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}
