// ════════════════════════════════════════════════════════════════════════════
// USE SPACE FEATURES HOOK
// ════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { SpaceFeaturesService } from '@/services/spaces';

export const featureKeys = {
  detail: (spaceId: string) => ['spaces', spaceId, 'features'] as const,
};

/** Hook for fetching space features */
export function useSpaceFeatures(spaceId: string | undefined) {
  return useQuery({
    queryKey: featureKeys.detail(spaceId!),
    queryFn: () => SpaceFeaturesService.getFeatures(spaceId!),
    enabled: !!spaceId,
    staleTime: 60 * 1000,
  });
}
