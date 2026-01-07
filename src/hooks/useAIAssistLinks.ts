import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditEvent } from './useAIAssistDrafts';

export interface AIAssistLink {
  id: string;
  draft_id: string;
  request_key: string;
  linked_at: string;
  linked_by: string | null;
}

// Fetch all links for a draft
export function useAIAssistLinks(draftId: string | undefined) {
  return useQuery({
    queryKey: ['ai-assist-links', draftId],
    queryFn: async (): Promise<AIAssistLink[]> => {
      if (!draftId) return [];

      const { data, error } = await supabase
        .from('ai_assist_links')
        .select('*')
        .eq('draft_id', draftId)
        .order('linked_at', { ascending: false });

      if (error) throw error;
      return data as AIAssistLink[];
    },
    enabled: !!draftId,
  });
}

// Link a draft to a business request
export function useLinkToBusinessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ draftId, requestKey }: { draftId: string; requestKey: string }): Promise<AIAssistLink> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data, error } = await supabase
        .from('ai_assist_links')
        .insert({
          draft_id: draftId,
          request_key: requestKey,
          linked_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await logAuditEvent(draftId, null, 'br_linked', userId, { request_key: requestKey });

      return data as AIAssistLink;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-assist-links', data.draft_id] });
      toast.success('Linked to business request');
    },
    onError: (error) => {
      toast.error('Failed to link: ' + error.message);
    },
  });
}

// Unlink a draft from a business request
export function useUnlinkFromBusinessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, draftId }: { linkId: string; draftId: string }): Promise<void> => {
      const { error } = await supabase
        .from('ai_assist_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-assist-links', variables.draftId] });
      toast.success('Link removed');
    },
    onError: (error) => {
      toast.error('Failed to remove link: ' + error.message);
    },
  });
}
