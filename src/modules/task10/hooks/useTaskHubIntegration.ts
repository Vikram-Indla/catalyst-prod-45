// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ TASKHUB INTEGRATION HOOKS
// ═══════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchTaskHubTasksForSuggestion,
  generateT10SuggestionsFromTaskHub,
  clearT10Suggestions,
  type TaskHubTask
} from '../api/taskhub-integration.api';
import { t10SuggestionsKeys } from './useSuggestions';

// Query keys
export const taskHubIntegrationKeys = {
  all: ['t10-taskhub'] as const,
  candidates: (listId: string, weekId: string) => 
    [...taskHubIntegrationKeys.all, 'candidates', listId, weekId] as const,
};

/**
 * Fetch TaskHub tasks that could be suggested
 */
export function useTaskHubCandidates(listId: string | undefined, weekId: string | undefined) {
  return useQuery({
    queryKey: taskHubIntegrationKeys.candidates(listId || '', weekId || ''),
    queryFn: () => fetchTaskHubTasksForSuggestion(listId!, weekId!),
    enabled: !!listId && !!weekId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Generate AI suggestions from TaskHub tasks
 */
export function useGenerateT10Suggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, weekId, count }: { listId: string; weekId: string; count?: number }) =>
      generateT10SuggestionsFromTaskHub(listId, weekId, count),
    onSuccess: (_, { listId }) => {
      queryClient.invalidateQueries({ queryKey: t10SuggestionsKeys.all });
      queryClient.invalidateQueries({ queryKey: taskHubIntegrationKeys.all });
    },
  });
}

/**
 * Clear unadded suggestions
 */
export function useClearT10Suggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) => clearT10Suggestions(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: t10SuggestionsKeys.all });
    },
  });
}

export type { TaskHubTask };
