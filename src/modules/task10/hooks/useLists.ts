// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ LISTS HOOKS
// ═══════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchT10Lists, 
  fetchT10List, 
  createT10List, 
  updateT10List, 
  deleteT10List,
  duplicateT10List 
} from '../api';
import type { T10ListInsert, T10ListUpdate } from '../types';

// Query keys
export const t10ListsKeys = {
  all: ['t10-lists'] as const,
  list: () => [...t10ListsKeys.all, 'list'] as const,
  detail: (id: string) => [...t10ListsKeys.all, 'detail', id] as const,
};

/**
 * Fetch all Task10 lists
 */
export function useT10Lists() {
  return useQuery({
    queryKey: t10ListsKeys.list(),
    queryFn: fetchT10Lists,
  });
}

/**
 * Fetch a single Task10 list by ID
 */
export function useT10List(listId: string | undefined) {
  return useQuery({
    queryKey: t10ListsKeys.detail(listId || ''),
    queryFn: () => fetchT10List(listId!),
    enabled: !!listId,
  });
}

/**
 * Create a new Task10 list
 */
export function useCreateT10List() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: T10ListInsert) => createT10List(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: t10ListsKeys.all });
    },
  });
}

/**
 * Update an existing Task10 list
 */
export function useUpdateT10List() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, input }: { listId: string; input: T10ListUpdate }) => 
      updateT10List(listId, input),
    onSuccess: (_, { listId }) => {
      queryClient.invalidateQueries({ queryKey: t10ListsKeys.detail(listId) });
      queryClient.invalidateQueries({ queryKey: t10ListsKeys.list() });
    },
  });
}

/**
 * Delete (archive) a Task10 list
 */
export function useDeleteT10List() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) => deleteT10List(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: t10ListsKeys.all });
    },
  });
}

/**
 * Duplicate a Task10 list
 */
export function useDuplicateT10List() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) => duplicateT10List(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: t10ListsKeys.all });
    },
  });
}
