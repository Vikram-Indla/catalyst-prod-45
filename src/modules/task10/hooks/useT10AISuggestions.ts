import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface T10AISuggestion {
  id: string;
  key: string;
  title: string;
  priority: 'critical' | 'high';
  due_date: string | null;
  assignee_name: string;
  assignee_id: string | null;
  reason: string;
}

interface T10AISuggestionsResponse {
  suggestions: T10AISuggestion[];
  ai_enhanced: boolean;
  total_candidates: number;
}

export function useT10AISuggestions(listId?: string, weekId?: string, participants?: string[]) {
  return useQuery({
    queryKey: ['t10-ai-suggestions', listId, weekId, participants],
    queryFn: async (): Promise<T10AISuggestionsResponse> => {
      const { data, error } = await supabase.functions.invoke('t10-ai-suggestions', {
        body: { listId, weekId, participants },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch AI suggestions');
      }

      return data as T10AISuggestionsResponse;
    },
    enabled: !!listId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useAddSuggestionToT10() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      weekId, 
      suggestion, 
      rank 
    }: { 
      weekId: string; 
      suggestion: T10AISuggestion; 
      rank: number;
    }) => {
      // Get assignee initials
      let initials = 'UN';
      if (suggestion.assignee_name && suggestion.assignee_name !== 'Unassigned') {
        const parts = suggestion.assignee_name.split(' ');
        initials = parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
      }

      const { data, error } = await supabase
        .from('t10_items')
        .insert({
          week_id: weekId,
          rank,
          title: suggestion.title,
          taskhub_key: suggestion.key,
          assignee_id: suggestion.assignee_id,
          assignee_name: suggestion.assignee_name,
          assignee_initials: initials,
          due_date: suggestion.due_date,
          label: suggestion.priority === 'critical' ? 'CRITICAL' : 'HIGH',
          status: 'todo',
          carryover_count: 0,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['t10-items', variables.weekId] });
      queryClient.invalidateQueries({ queryKey: ['t10-ai-suggestions'] });
      toast({
        title: 'Task added',
        description: `"${variables.suggestion.title}" added to your Top 10.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add suggestion.',
        variant: 'destructive',
      });
    },
  });
}
