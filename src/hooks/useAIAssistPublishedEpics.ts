import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditEvent } from './useAIAssistDrafts';
import type { Json } from '@/integrations/supabase/types';

export interface AIAssistPublishedEpic {
  id: string;
  draft_id: string;
  run_id: string;
  published_data: Json;
  epic_id: string | null;
  published_by: string | null;
  published_at: string;
}

export interface PublishEpicInput {
  draft_id: string;
  run_id: string;
  published_data: Json;
  epic_id?: string;
}

// Fetch all published epics for a draft
export function useAIAssistPublishedEpics(draftId: string | undefined) {
  return useQuery({
    queryKey: ['ai-assist-published-epics', draftId],
    queryFn: async (): Promise<AIAssistPublishedEpic[]> => {
      if (!draftId) return [];

      const { data, error } = await supabase
        .from('ai_assist_published_epics')
        .select('*')
        .eq('draft_id', draftId)
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data as AIAssistPublishedEpic[];
    },
    enabled: !!draftId,
  });
}

// Publish epics
export function usePublishEpics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PublishEpicInput): Promise<AIAssistPublishedEpic> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data, error } = await supabase
        .from('ai_assist_published_epics')
        .insert({
          draft_id: input.draft_id,
          run_id: input.run_id,
          published_data: input.published_data,
          epic_id: input.epic_id,
          published_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await logAuditEvent(input.draft_id, input.run_id, 'epics_published', userId, { 
        epic_id: input.epic_id,
      });

      return data as AIAssistPublishedEpic;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-assist-published-epics', data.draft_id] });
      toast.success('Epics published to backlog');
    },
    onError: (error) => {
      toast.error('Failed to publish epics: ' + error.message);
    },
  });
}
