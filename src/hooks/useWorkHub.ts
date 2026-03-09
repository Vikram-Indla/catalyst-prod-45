/**
 * WorkHub TanStack Query Hooks — DYNAMITE V2 Stage B
 * All data access for Story Backlog, Epic Backlog, and All Work Items
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as workHubService from '@/services/workhub-service';
import type { FilterConfig, SortConfig, BulkOperation } from '@/types/workhub';

const WORK_ITEMS_KEY = 'workhub-items';
const ACTIVITY_KEY = 'workhub-activity';
const SAVED_VIEWS_KEY = 'workhub-saved-views';

export function useWorkItems(projectKey: string, filters?: FilterConfig, sort?: SortConfig) {
  return useQuery({
    queryKey: [WORK_ITEMS_KEY, projectKey, filters, sort],
    queryFn: () => workHubService.fetchWorkItems(projectKey, filters, sort),
    enabled: !!projectKey,
    staleTime: 30_000,
  });
}

export function useWorkItem(itemId: string | null) {
  return useQuery({
    queryKey: [WORK_ITEMS_KEY, 'detail', itemId],
    queryFn: () => workHubService.fetchWorkItem(itemId!),
    enabled: !!itemId,
  });
}

export function useUpdateWorkItem(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: Record<string, any> }) =>
      workHubService.updateWorkItem(itemId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY] });
    },
  });
}

export function useDeleteWorkItem(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => workHubService.deleteWorkItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY, projectKey] });
    },
  });
}

export function useBulkUpdateWorkItems(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (operation: BulkOperation) => workHubService.bulkUpdateWorkItems(operation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY, projectKey] });
    },
  });
}

export function useReorderWorkItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, newSortOrder }: { itemId: string; newSortOrder: number }) =>
      workHubService.reorderWorkItem(itemId, newSortOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY] });
    },
  });
}

export function useActivity(issueKey: string | null) {
  return useQuery({
    queryKey: [ACTIVITY_KEY, issueKey],
    queryFn: () => workHubService.fetchActivity(issueKey!),
    enabled: !!issueKey,
  });
}

export function useAddComment(issueKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => workHubService.addComment(issueKey, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACTIVITY_KEY, issueKey] });
    },
  });
}

export function useSavedViews(projectKey: string) {
  return useQuery({
    queryKey: [SAVED_VIEWS_KEY, projectKey],
    queryFn: () => workHubService.fetchSavedViews(projectKey),
    enabled: !!projectKey,
  });
}
