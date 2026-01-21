// ════════════════════════════════════════════════════════════════════════════
// USE SPACES HOOK - List with filters, sort, pagination
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { SpacesService } from '@/services/spaces';
import type { SpaceListParams } from '@/types/spaces';

// Query Keys
export const spaceKeys = {
  all: ['spaces'] as const,
  lists: () => [...spaceKeys.all, 'list'] as const,
  list: (params: SpaceListParams) => [...spaceKeys.lists(), params] as const,
  starred: () => [...spaceKeys.all, 'starred'] as const,
  recent: () => [...spaceKeys.all, 'recent'] as const,
  details: () => [...spaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...spaceKeys.details(), id] as const,
  byKey: (key: string) => [...spaceKeys.all, 'key', key] as const,
};

/** Hook for fetching spaces list with filters, sorting, and pagination */
export function useSpaces(params: SpaceListParams = {}) {
  return useQuery({
    queryKey: spaceKeys.list(params),
    queryFn: () => SpacesService.getSpaces(params),
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (previousData) => previousData,
  });
}

/** Hook for infinite scrolling spaces list */
export function useInfiniteSpaces(params: Omit<SpaceListParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: [...spaceKeys.list(params), 'infinite'],
    queryFn: ({ pageParam = 1 }) => SpacesService.getSpaces({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + page.data.length, 0);
      if (totalFetched >= lastPage.count) return undefined;
      return allPages.length + 1;
    },
    staleTime: 30 * 1000,
  });
}

/** Hook for starred spaces */
export function useStarredSpaces() {
  return useQuery({
    queryKey: spaceKeys.starred(),
    queryFn: () => SpacesService.getStarredSpaces(),
    staleTime: 60 * 1000, // 1 minute
  });
}

/** Hook for recent spaces */
export function useRecentSpaces(limit = 5) {
  return useQuery({
    queryKey: [...spaceKeys.recent(), limit],
    queryFn: () => SpacesService.getRecentSpaces(limit),
    staleTime: 30 * 1000,
  });
}

/** Hook for checking if a space key is available */
export function useSpaceKeyAvailability(key: string, excludeId?: string) {
  return useQuery({
    queryKey: ['space-key-check', key, excludeId],
    queryFn: () => SpacesService.isKeyAvailable(key, excludeId),
    enabled: key.length >= 2,
    staleTime: 10 * 1000,
  });
}
