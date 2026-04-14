/**
 * useLinkedWorkItems — React Query hooks for linked work items feature.
 * Provides: link types, links for item, search, create link, delete link.
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
    staleTime: 5 * 60 * 1000, // 5 min — link types rarely change
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
      queryClient.invalidateQueries({
        queryKey: linkedItemKeys.linksForItem(sourceItemId),
      });
      toast.success('Item linked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create link');
    },
  });
}

// ─── Delete Link Mutation ─────────────────────────────────

export function useDeleteWorkItemLink(sourceItemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) => deleteWorkItemLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: linkedItemKeys.linksForItem(sourceItemId),
      });
      toast.success('Link removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove link');
    },
  });
}
