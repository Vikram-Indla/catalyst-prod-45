/**
 * TanStack Query Hooks — ProjectHub SDLC Views
 * Board, List, Backlog data hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWorkItems,
  fetchWorkItem,
  fetchSubIssues,
  updateWorkItem,
  updateWorkItemStatus,
  bulkUpdateWorkItems,
  createWorkItem,
  deleteWorkItems,
  reorderWorkItems,
  fetchBoardConfig,
  fetchBoardColumnCounts,
  updateBoardWipLimit,
  fetchListConfig,
  upsertListConfig,
  fetchBacklogConfig,
  upsertBacklogConfig,
} from '@/services/viewsService';
import type {
  ViewFilterState,
  SortDirection,
  ItemDetailUpdate,
  ListConfig,
  BacklogConfig,
} from '@/types/views';

// ═══════════════════════════════════════════════════════════
// Query Keys
// ═══════════════════════════════════════════════════════════

export const viewKeys = {
  workItems: (projectId: string, ...rest: unknown[]) => ['ph-work-items', projectId, ...rest] as const,
  workItem: (itemId: string) => ['ph-work-item', itemId] as const,
  subIssues: (parentId: string) => ['ph-sub-issues', parentId] as const,
  boardConfig: (projectId: string) => ['ph-board-config', projectId] as const,
  boardColumns: (projectId: string) => ['ph-board-columns', projectId] as const,
  listConfig: (projectId: string, userId: string) => ['ph-list-config', projectId, userId] as const,
  backlogConfig: (projectId: string, userId: string) => ['ph-backlog-config', projectId, userId] as const,
};

// ═══════════════════════════════════════════════════════════
// Read Hooks
// ═══════════════════════════════════════════════════════════

export function useWorkItems(
  projectId: string,
  releaseIds: string[],
  filters: ViewFilterState,
  sort: { column: string; direction: SortDirection },
  pagination: { page: number; perPage: number },
  showSubtasks: boolean,
  currentUserId?: string
) {
  return useQuery({
    queryKey: viewKeys.workItems(projectId, releaseIds, filters, sort, pagination, showSubtasks),
    queryFn: () => fetchWorkItems(projectId, releaseIds, filters, sort, pagination, showSubtasks, currentUserId),
    enabled: !!projectId,
    placeholderData: (prev) => prev, // keepPreviousData equivalent
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useWorkItem(itemId: string | null) {
  return useQuery({
    queryKey: viewKeys.workItem(itemId!),
    queryFn: () => fetchWorkItem(itemId!),
    enabled: !!itemId,
  });
}

export function useSubIssues(parentId: string | null) {
  return useQuery({
    queryKey: viewKeys.subIssues(parentId!),
    queryFn: () => fetchSubIssues(parentId!),
    enabled: !!parentId,
  });
}

export function useBoardConfig(projectId: string) {
  return useQuery({
    queryKey: viewKeys.boardConfig(projectId),
    queryFn: () => fetchBoardConfig(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useBoardColumnCounts(projectId: string) {
  return useQuery({
    queryKey: viewKeys.boardColumns(projectId),
    queryFn: () => fetchBoardColumnCounts(projectId),
    enabled: !!projectId,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useListConfig(projectId: string, userId: string) {
  return useQuery({
    queryKey: viewKeys.listConfig(projectId, userId),
    queryFn: () => fetchListConfig(projectId, userId),
    enabled: !!projectId && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBacklogConfig(projectId: string, userId: string) {
  return useQuery({
    queryKey: viewKeys.backlogConfig(projectId, userId),
    queryFn: () => fetchBacklogConfig(projectId, userId),
    enabled: !!projectId && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// ═══════════════════════════════════════════════════════════
// Mutation Hooks
// ═══════════════════════════════════════════════════════════

export function useUpdateWorkItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: ItemDetailUpdate }) =>
      updateWorkItem(itemId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-work-items'] });
      queryClient.invalidateQueries({ queryKey: ['ph-work-item'] });
      queryClient.invalidateQueries({ queryKey: ['ph-items-by-status'] });
      queryClient.invalidateQueries({ queryKey: ['ph-overdue'] });
      queryClient.invalidateQueries({ queryKey: ['ph-team-workload'] });
    },
  });
}

export function useUpdateWorkItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, fromStatus, toStatus, changedBy }: {
      itemId: string; fromStatus: string; toStatus: string; changedBy: string;
    }) => updateWorkItemStatus(itemId, fromStatus, toStatus, changedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-work-items'] });
      queryClient.invalidateQueries({ queryKey: ['ph-board-columns'] });
      queryClient.invalidateQueries({ queryKey: ['ph-items-by-status'] });
      queryClient.invalidateQueries({ queryKey: ['ph-overdue'] });
      queryClient.invalidateQueries({ queryKey: ['ph-time-in-status'] });
      queryClient.invalidateQueries({ queryKey: ['ph-activity'] });
    },
  });
}

export function useBulkUpdateWorkItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemIds, updates }: { itemIds: string[]; updates: Partial<ItemDetailUpdate> }) =>
      bulkUpdateWorkItems(itemIds, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-work-items'] });
      queryClient.invalidateQueries({ queryKey: ['ph-board-columns'] });
      queryClient.invalidateQueries({ queryKey: ['ph-items-by-status'] });
    },
  });
}

export function useCreateWorkItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-work-items'] });
      queryClient.invalidateQueries({ queryKey: ['ph-board-columns'] });
      queryClient.invalidateQueries({ queryKey: ['ph-items-by-status'] });
    },
  });
}

export function useDeleteWorkItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWorkItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-work-items'] });
      queryClient.invalidateQueries({ queryKey: ['ph-board-columns'] });
    },
  });
}

export function useReorderWorkItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reorderWorkItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-work-items'] });
    },
  });
}

export function useUpsertListConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Partial<ListConfig> & { project_id: string; user_id: string }) =>
      upsertListConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-list-config'] });
    },
  });
}

export function useUpsertBacklogConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Partial<BacklogConfig> & { project_id: string; user_id: string }) =>
      upsertBacklogConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-backlog-config'] });
    },
  });
}

export function useUpdateBoardWipLimit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ configId, wipLimit }: { configId: string; wipLimit: number | null }) =>
      updateBoardWipLimit(configId, wipLimit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-board-config'] });
      queryClient.invalidateQueries({ queryKey: ['ph-board-columns'] });
    },
  });
}
