/**
 * WorkHub TanStack Query Hooks — DYNAMITE V2 Stage D (Sacred Gate)
 * All data access for Story Backlog, Epic Backlog, and All Work Items
 * ZERO mock data. Every hook fires real Supabase queries.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as workHubService from '@/services/workhub-service';
import type { WorkHubItem } from '@/services/workhub-service';
import type { FilterConfig, SortConfig, BulkOperation } from '@/types/workhub';
import { toast } from 'sonner';

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

export function useCreateWorkItem(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof workHubService.createWorkItem>[0]) =>
      workHubService.createWorkItem(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY] });
      toast.success(`${(data as any).issue_key ?? 'Item'} created`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to create: ${err.message}`);
    },
  });
}

export function useUpdateWorkItem(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: Record<string, any> }) =>
      workHubService.updateWorkItem(itemId, updates),
    onMutate: async ({ itemId, updates }) => {
      // Optimistic update on list queries
      await queryClient.cancelQueries({ queryKey: [WORK_ITEMS_KEY] });
      const queryCache = queryClient.getQueriesData<WorkHubItem[]>({ queryKey: [WORK_ITEMS_KEY, projectKey] });
      for (const [key, oldData] of queryCache) {
        if (oldData) {
          queryClient.setQueryData(key, oldData.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          ));
        }
      }
      return { queryCache };
    },
    onError: (_err, _vars, context) => {
      // Rollback
      if (context?.queryCache) {
        for (const [key, oldData] of context.queryCache) {
          if (oldData) queryClient.setQueryData(key, oldData);
        }
      }
      toast.error('Failed to update item');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY] });
    },
  });
}

export function useDeleteWorkItem(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => workHubService.deleteWorkItem(itemId),
    onSuccess: (_data, itemId) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY] });
      toast.success('Item deleted', {
        action: {
          label: 'Undo',
          onClick: () => {
            workHubService.undoDeleteWorkItem(itemId).then(() => {
              queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY] });
              toast.success('Delete undone');
            });
          },
        },
        duration: 10000,
      });
    },
    onError: (err: Error) => {
      toast.error(`Delete failed: ${err.message}`);
    },
  });
}

export function useBulkUpdateWorkItems(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (operation: BulkOperation) => workHubService.bulkUpdateWorkItems(operation),
    onSuccess: (_data, operation) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ITEMS_KEY] });
      const count = operation.item_ids.length;
      if (operation.type === 'delete') {
        toast.success(`Deleted ${count} item${count !== 1 ? 's' : ''}`);
      } else if (operation.type === 'status_change') {
        toast.success(`Updated status on ${count} item${count !== 1 ? 's' : ''}`);
      } else if (operation.type === 'priority_change') {
        toast.success(`Updated priority on ${count} item${count !== 1 ? 's' : ''}`);
      } else if (operation.type === 'assignee_change') {
        toast.success(`Assigned ${count} item${count !== 1 ? 's' : ''}`);
      }
    },
    onError: (err: Error) => {
      toast.error(`Bulk operation failed: ${err.message}`);
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
      toast.success('Comment added');
    },
    onError: (err: Error) => {
      toast.error(`Comment failed: ${err.message}`);
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

// ═══ TRANSITIONS ═══
export function useTransitions(workItemId: string | null) {
  return useQuery({
    queryKey: ['work-item-transitions', workItemId],
    queryFn: () => workHubService.fetchTransitions(workItemId!),
    enabled: !!workItemId,
  });
}

// ═══ COMMENTS (new table) ═══
export function useWorkItemComments(workItemId: string | null) {
  return useQuery({
    queryKey: ['work-item-comments', workItemId],
    queryFn: () => workHubService.fetchWorkItemComments(workItemId!),
    enabled: !!workItemId,
  });
}

export function useAddWorkItemComment(workItemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => workHubService.addWorkItemComment(workItemId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-comments', workItemId] });
      toast.success('Comment added');
    },
    onError: (err: Error) => {
      toast.error(`Comment failed: ${err.message}`);
    },
  });
}

// ═══ CHANGELOGS ═══
export function useChangelogs(workItemId: string | null) {
  return useQuery({
    queryKey: ['work-item-changelogs', workItemId],
    queryFn: () => workHubService.fetchChangelogs(workItemId!),
    enabled: !!workItemId,
  });
}

// ═══ CYCLE TIME ═══
export function useCycleTime(workItemId: string | null) {
  return useQuery({
    queryKey: ['work-item-cycle-time', workItemId],
    queryFn: () => workHubService.fetchCycleTime(workItemId!),
    enabled: !!workItemId,
  });
}

export function useCycleSummary(workItemId: string | null) {
  return useQuery({
    queryKey: ['work-item-cycle-summary', workItemId],
    queryFn: () => workHubService.fetchCycleSummary(workItemId!),
    enabled: !!workItemId,
  });
}
