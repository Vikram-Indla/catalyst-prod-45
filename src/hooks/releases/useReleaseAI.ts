/**
 * ReleaseHub V2 — AI Insights Hook (Lovable AI Gateway)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AIInsight {
  release_name?: string;
  title: string;
  description: string;
  recommendation?: string;
  estimated_impact?: string;
}

export interface AIInsightsResponse {
  action_required: AIInsight[];
  items_to_watch: AIInsight[];
  positive_signals: AIInsight[];
  recommendations: AIInsight[];
  model: string;
  generated_at: string;
}

export function useReleaseAIInsights(enabled: boolean = false) {
  return useQuery({
    queryKey: ['release-ai-insights'],
    queryFn: async (): Promise<AIInsightsResponse> => {
      const { data, error } = await supabase.functions.invoke(
        'release-ai-insights',
        { method: 'POST', body: {} }
      );
      if (error) throw new Error(error.message);
      return data;
    },
    enabled,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
}

export function useRegenerateInsights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'release-ai-insights',
        { method: 'POST', body: {} }
      );
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['release-ai-insights'], data);
    },
  });
}
