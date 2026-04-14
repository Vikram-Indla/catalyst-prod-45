/**
 * useLinkedWorkItems — React Query hooks for linked work items feature.
 * Provides: link types, links for item, search, create link, delete link.
 *
 * FR-4: Idempotent-safe (server 23505 unique constraint)
 * FR-22: Success toast + immediate refetch
 * FR-24: Transient error messages
 * FR-39: Refetch after mutations to reconcile server state
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchLinkTypes,
  fetchLinksForItem,
  createWorkItemLink,
  deleteWorkItemLink,
  searchWorkItemsForLinking,
  buildLinkTypeOptions,
  type LinkType,
  type LinkTypeOption,
  type LinkedItemDisplay,
  type SearchResultItem,
} from '@/services/linkedWorkItemsService';

// ─── Query Keys ───────────────────────────────────────────

export const linkedItemKeys = {
  linkTypes: ['wh-link-types'] as const,
  linksForItem: (itemId: string) => ['linked-items', itemId] as const,
  search: (query: string, excludeIds: string[]) =>
    ['linked-items-search', query, excludeIds.join(',')] as const,
};

// ─── Link Types ───────────────────────────────────────────

export function useLinkTypes() {
  const query = useQuery<LinkType[]>({
    queryKey: linkedItemKeys.linkTypes,
    queryFn: fetchLinkTypes,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const options: LinkTypeOption[] = query.data
    ? buildLinkTypeOptions(query.data)
    : [];

  return { ...query, options };
}

// ─── Links for Item (Bidirectional) ───────────────────────

export function useLinksForItem(itemId: string | null) {
  return useQuery<LinkedItemDisplay[]>({
    queryKey: linkedItemKeys.linksForItem(itemId ?? ''),
    queryFn: () => fetchLinksForItem(itemId!),
    enabled: !!itemId,
    retry: 2,
  });
}

// ─── Search Work Items ────────────────────────────────────

export function useSearchForLinking(
  query: string,
  excludeIds: string[],
  enabled = true,
) {
  return useQuery<{ items: SearchResultItem[]; total: number }>({
    queryKey: linkedItemKeys.search(query, excludeIds),
    queryFn: () => searchWorkItemsForLinking(query, excludeIds),
    enabled: enabled && query.trim().length >= 2,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

// ─── Create Link Mutation ─────────────────────────────────

export function useCreateWorkItemLink(sourceItemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      targetId,
      linkTypeLabel,
    }: {
      targetId: string;
      linkTypeLabel: string;
    }) => createWorkItemLink(sourceItemId, targetId, linkTypeLabel),
    onSuccess: () => {
      // FR-22 + FR-39: Immediate refetch to reconcile
      queryClient.invalidateQueries({
        queryKey: linkedItemKeys.linksForItem(sourceItemId),
      });
      toast.success('Item linked successfully');
    },
    onError: (error: Error) => {
      // FR-23: Permission-specific messaging
      if (error.message?.includes('permission') || error.message?.includes('403') || error.message?.includes('denied')) {
        toast.error("You don't have permission to link work items");
      }
      // FR-21: Duplicate
      else if (error.message?.includes('already exists')) {
        toast.error('This link already exists');
      }
      // FR-24: Transient errors
      else {
        toast.error(error.message || 'Failed to create link');
      }
    },
  });
}

// ─── Delete Link Mutation ─────────────────────────────────

export function useDeleteWorkItemLink(sourceItemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) => deleteWorkItemLink(linkId),
    onSuccess: () => {
      // FR-30 + FR-39: Immediate update + reconcile
      queryClient.invalidateQueries({
        queryKey: linkedItemKeys.linksForItem(sourceItemId),
      });
      toast.success('Link removed');
    },
    onError: (error: Error) => {
      // FR-32: If already deleted (404/not found), still invalidate to clean UI
      if (error.message?.includes('not found') || error.message?.includes('0 rows')) {
        queryClient.invalidateQueries({
          queryKey: linkedItemKeys.linksForItem(sourceItemId),
        });
        toast.success('Link already removed');
      } else {
        // FR-31: Show error for retry
        toast.error(error.message || 'Failed to remove link');
      }
    },
  });
}
