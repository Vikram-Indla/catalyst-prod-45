// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ SUGGESTIONS HOOKS
// ═══════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchT10Suggestions, 
  addT10SuggestionToWeek, 
  dismissT10Suggestion,
  createT10Suggestion
} from '../api';
import type { T10AISuggestionPriority } from '../types';
import { t10ItemsKeys } from './useItems';
import { t10WeeksKeys } from './useWeeks';
import { t10ListsKeys } from './useLists';

// Query keys
export const t10SuggestionsKeys = {
  all: ['t10-suggestions'] as const,
  list: (listId: string, includeAdded: boolean = false) => 
    [...t10SuggestionsKeys.all, 'list', listId, includeAdded] as const,
};

/**
 * Fetch AI suggestions for a list
 */
export function useT10Suggestions(listId: string | undefined, includeAdded: boolean = false) {
  return useQuery({
    queryKey: t10SuggestionsKeys.list(listId || '', includeAdded),
    queryFn: () => fetchT10Suggestions(listId!, includeAdded),
    enabled: !!listId,
  });
}

/**
 * Add a suggestion to the current week's items
 */
export function useAddT10SuggestionToWeek() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      suggestionId, 
      weekId, 
      listId,
      rank 
    }: { 
      suggestionId: string; 
      weekId: string;
      listId: string;
      rank?: number;
    }) => addT10SuggestionToWeek(suggestionId, weekId, rank),
    onSuccess: (_, { weekId, listId }) => {
      queryClient.invalidateQueries({ queryKey: t10SuggestionsKeys.all });
      queryClient.invalidateQueries({ queryKey: t10ItemsKeys.list(weekId) });
      queryClient.invalidateQueries({ queryKey: t10WeeksKeys.all });
      queryClient.invalidateQueries({ queryKey: t10ListsKeys.all });
    },
  });
}

/**
 * Dismiss a suggestion
 */
export function useDismissT10Suggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ suggestionId, listId }: { suggestionId: string; listId: string }) => 
      dismissT10Suggestion(suggestionId),
    onSuccess: (_, { listId }) => {
      queryClient.invalidateQueries({ queryKey: t10SuggestionsKeys.all });
    },
  });
}

/**
 * Create a new suggestion (for testing or manual creation)
 */
export function useCreateT10Suggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      list_id: string;
      title: string;
      taskhub_key?: string;
      assignee_id?: string;
      priority?: T10AISuggestionPriority;
      due_date?: string;
    }) => createT10Suggestion(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: t10SuggestionsKeys.all });
    },
  });
}
