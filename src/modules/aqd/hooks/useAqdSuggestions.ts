/**
 * Hook to fetch AI-powered task suggestions for Task¹⁰
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AqdSuggestion {
  taskKey: string;
  title: string;
  priority: 'critical' | 'high';
  dueDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  reasoning: string;
  score: number;
}

interface UseAqdSuggestionsOptions {
  listId: string;
  weekId: string;
  currentItemCount: number;
  enabled?: boolean;
}

interface SuggestionsResponse {
  suggestions: AqdSuggestion[];
  availableSlots: number;
}

export function useAqdSuggestions({ 
  listId, 
  weekId, 
  currentItemCount,
  enabled = true 
}: UseAqdSuggestionsOptions) {
  return useQuery({
    queryKey: ['aqd-suggestions', listId, weekId],
    queryFn: async (): Promise<SuggestionsResponse> => {
      const { data, error } = await supabase.functions.invoke('aqd-ai-suggestions', {
        body: { listId, weekId }
      });
      
      if (error) {
        console.error('Error fetching suggestions:', error);
        return { suggestions: [], availableSlots: 0 };
      }
      
      return data as SuggestionsResponse;
    },
    enabled: enabled && !!listId && !!weekId && currentItemCount < 10,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
