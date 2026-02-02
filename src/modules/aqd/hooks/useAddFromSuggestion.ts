/**
 * Hook to add a task from AI suggestion to Top 10
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AqdSuggestion } from './useAqdSuggestions';

interface AddFromSuggestionParams {
  listId: string;
  weekId: string;
  suggestion: AqdSuggestion;
}

export function useAddFromSuggestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ listId, weekId, suggestion }: AddFromSuggestionParams) => {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      // Get next rank
      const { data: existingItems } = await supabase
        .from('aqd_items')
        .select('rank')
        .eq('week_id', weekId)
        .order('rank', { ascending: false })
        .limit(1);
      
      const nextRank = (existingItems?.[0]?.rank || 0) + 1;
      
      // Check if we're exceeding max items
      const { count } = await supabase
        .from('aqd_items')
        .select('*', { count: 'exact', head: true })
        .eq('week_id', weekId);
      
      if ((count || 0) >= 10) {
        throw new Error('Top 10 list is full');
      }
      
      // Insert new item with AI source tracking
      const { data, error } = await supabase
        .from('aqd_items')
        .insert({
          list_id: listId,
          week_id: weekId,
          title: suggestion.title,
          taskhub_key: suggestion.taskKey,
          rank: nextRank,
          status: 'not_started',
          source: 'ai_suggestion',
          ai_reasoning: suggestion.reasoning,
          assignee_id: suggestion.assigneeId,
          due_date: suggestion.dueDate,
          created_by: userId,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['aqd-items'] });
      queryClient.invalidateQueries({ queryKey: ['aqd-suggestions'] });
      toast.success(`Added "${data.title}" to Top 10`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add task');
      console.error('Add from suggestion error:', error);
    }
  });
}
