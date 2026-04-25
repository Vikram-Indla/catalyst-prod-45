/**
 * useWorkItemSource — resolves which physical table owns a work item id.
 * Memoized via React Query so every section in the modal shares the result.
 */
import { useQuery } from '@tanstack/react-query';
import { resolveWorkItemSource, type ResolvedSource } from '../lib/workItemRepo';

export function useWorkItemSource(itemId: string | undefined | null, enabled = true) {
  return useQuery<ResolvedSource | null>({
    queryKey: ['work-item-source', itemId],
    queryFn: () => (itemId ? resolveWorkItemSource(itemId) : Promise.resolve(null)),
    enabled: !!itemId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}
