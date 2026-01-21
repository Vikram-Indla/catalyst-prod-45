// ════════════════════════════════════════════════════════════════════════════
// USE SPACE CATEGORIES HOOK
// ════════════════════════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { SpaceCategoriesService } from '@/services/spaces';

export const categoryKeys = {
  all: ['space-categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
};

/** Hook for fetching all space categories */
export function useSpaceCategories() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: () => SpaceCategoriesService.getCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes - categories don't change often
  });
}
