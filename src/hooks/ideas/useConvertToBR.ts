// ============================================================
// CONVERT TO BUSINESS REQUEST HOOKS
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fromTable } from '@/lib/supabase-utils';
import { toast } from 'sonner';

interface ConvertIdeaToBRInput {
  ideaId: string;
  brTitle: string;
  brDescription: string;
  brJustification: string;
  brPriority?: string;
  conversionNotes?: string;
}

interface ConvertInitiativeToBRInput {
  initiativeId: string;
  brTitle: string;
  brDescription: string;
  brJustification: string;
  brPriority?: string;
  conversionNotes?: string;
}

export function useConvertIdeaToBR() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ideaId, brTitle, brDescription, brJustification, brPriority, conversionNotes }: ConvertIdeaToBRInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: idea, error: ideaError } = await supabase
        .from('improvement_ideas')
        .select('*')
        .eq('id', ideaId)
        .single();
      
      if (ideaError) throw ideaError;
      if (!idea) throw new Error('Idea not found');

      const { data: br, error: brError } = await fromTable('business_requests')
        .insert({
          title: brTitle,
          description: brDescription,
          business_justification: brJustification,
          priority_tier: brPriority || 'medium',
          process_step: 'intake',
          created_by: user.id,
          requestor: idea.submitter_name || 'Ideas Module',
        })
        .select()
        .single();
      
      if (brError) throw brError;

      const { error: updateError } = await supabase
        .from('improvement_ideas')
        .update({
          status: 'converted',
          business_request_id: br.id,
          converted_at: new Date().toISOString(),
          converted_by: user.id,
          conversion_notes: conversionNotes,
          source_type: 'direct',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ideaId);
      
      if (updateError) throw updateError;
      return { idea, businessRequest: br };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['improvement-idea', data.idea.id] });
      queryClient.invalidateQueries({ queryKey: ['improvement-ideas'] });
      queryClient.invalidateQueries({ queryKey: ['quick-wins'] });
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast.success('Business Request created from Quick Win!');
    },
  });
}

export function useConvertInitiativeToBR() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ initiativeId, brTitle, brDescription, brJustification, brPriority, conversionNotes }: ConvertInitiativeToBRInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: initiative, error: initError } = await supabase
        .from('improvement_initiatives')
        .select('*')
        .eq('id', initiativeId)
        .single();
      
      if (initError) throw initError;
      if (!initiative) throw new Error('Initiative not found');

      const { data: br, error: brError } = await fromTable('business_requests')
        .insert({
          title: brTitle,
          description: brDescription,
          business_justification: brJustification,
          priority_tier: brPriority || 'high',
          process_step: 'intake',
          created_by: user.id,
          requestor: 'Initiative: ' + initiative.code,
        })
        .select()
        .single();
      
      if (brError) throw brError;

      const { error: initUpdateError } = await supabase
        .from('improvement_initiatives')
        .update({
          status: 'closed',
          business_request_id: br.id,
          converted_at: new Date().toISOString(),
          converted_by: user.id,
          conversion_notes: conversionNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', initiativeId);
      
      if (initUpdateError) throw initUpdateError;

      const { error: ideasUpdateError } = await supabase
        .from('improvement_ideas')
        .update({
          status: 'converted',
          business_request_id: br.id,
          converted_at: new Date().toISOString(),
          converted_by: user.id,
          source_type: 'initiative',
          updated_at: new Date().toISOString(),
        })
        .eq('initiative_id', initiativeId)
        .is('deleted_at', null);
      
      if (ideasUpdateError) throw ideasUpdateError;
      return { initiative, businessRequest: br };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['improvement-initiative', data.initiative.id] });
      queryClient.invalidateQueries({ queryKey: ['improvement-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['improvement-ideas'] });
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast.success('Business Request created from Initiative!');
    },
  });
}

export function useValidateInitiative() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (initiativeId: string) => {
      const { data, error } = await supabase
        .from('improvement_initiatives')
        .update({
          status: 'evaluating',
          updated_at: new Date().toISOString(),
        })
        .eq('id', initiativeId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['improvement-initiative', data.id] });
      queryClient.invalidateQueries({ queryKey: ['improvement-initiatives'] });
      toast.success('Initiative validated! Ready for BR conversion.');
    },
  });
}
