// ============================================================
// TRIAGE IDEA HOOK
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IdeaType } from '@/types/improvement-ideas';
import { toast } from 'sonner';

interface TriageIdeaInput {
  ideaId: string;
  ideaType: IdeaType;
  initiativeId?: string;
  notes?: string;
}

export function useTriageIdea() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ideaId, ideaType, initiativeId, notes }: TriageIdeaInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use scoring status as intermediate for triaged ideas
      const newStatus = ideaType === 'strategic' && initiativeId ? 'scoring' : 'scoring';

      const { data, error } = await supabase
        .from('improvement_ideas')
        .update({
          idea_type: ideaType,
          status: newStatus,
          initiative_id: ideaType === 'strategic' ? initiativeId : null,
          triaged_at: new Date().toISOString(),
          triaged_by: user.id,
          triage_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ideaId)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, idea_type: ideaType };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['improvement-idea', data.id] });
      queryClient.invalidateQueries({ queryKey: ['improvement-ideas'] });
      queryClient.invalidateQueries({ queryKey: ['ideas-hub-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['quick-wins'] });
      toast.success(`Idea triaged as ${data.idea_type === 'quick_win' ? 'Quick Win' : 'Strategic'}`);
    },
    onError: (error) => {
      toast.error('Failed to triage idea', { description: error.message });
    },
  });
}

export function useApproveQuickWin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ideaId: string) => {
      const { data, error } = await supabase
        .from('improvement_ideas')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ideaId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['improvement-idea', data.id] });
      queryClient.invalidateQueries({ queryKey: ['improvement-ideas'] });
      queryClient.invalidateQueries({ queryKey: ['quick-wins'] });
      toast.success('Quick Win approved! Ready for BR conversion.');
    },
  });
}

export function useLinkIdeaToInitiative() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ideaId, initiativeId }: { ideaId: string; initiativeId: string }) => {
      const { data, error } = await supabase
        .from('improvement_ideas')
        .update({
          initiative_id: initiativeId,
          status: 'scoring',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ideaId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['improvement-idea', data.id] });
      queryClient.invalidateQueries({ queryKey: ['improvement-ideas'] });
      queryClient.invalidateQueries({ queryKey: ['improvement-initiative'] });
      toast.success('Idea linked to initiative');
    },
  });
}

export function useUnlinkIdeaFromInitiative() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ideaId: string) => {
      const { data, error } = await supabase
        .from('improvement_ideas')
        .update({
          initiative_id: null,
          status: 'under_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ideaId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['improvement-idea', data.id] });
      queryClient.invalidateQueries({ queryKey: ['improvement-ideas'] });
      queryClient.invalidateQueries({ queryKey: ['improvement-initiative'] });
      toast.success('Idea unlinked from initiative');
    },
  });
}
