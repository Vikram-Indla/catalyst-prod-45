import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';

interface TransitionParams {
  requestId: string;
  fromStatusSlug: string;
  toStatusSlug: string;
  comment: string;
}

interface TransitionResult {
  success: boolean;
  requestId: string;
  newStatus: string;
}

export function useBRStatusTransition() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, fromStatusSlug, toStatusSlug, comment }: TransitionParams) => {
      // Convert slug to the value format stored in process_step (e.g. 'analysis_design' -> 'analysis_design')
      const newStatusValue = toStatusSlug;

      // Update the BR's process_step field
      const { error: updateError } = await supabase
        .from('ph_business_requests')
        .update({
          process_step: newStatusValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Log to audit trail
      const { error: auditError } = await supabase
        .from('business_request_audit_logs')
        .insert({
          business_request_id: requestId,
          field_changed: 'Process Step',
          old_value: fromStatusSlug,
          new_value: newStatusValue,
          change_reason: comment,
          created_at: new Date().toISOString()
        });

      if (auditError) throw auditError;

      return {
        success: true,
        requestId,
        newStatus: newStatusValue
      } as TransitionResult;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      qc.invalidateQueries({ queryKey: ['business-request', data.requestId] });
      qc.invalidateQueries({ queryKey: ['workflow-transitions', data.requestId] });
      qc.invalidateQueries({ queryKey: ['br-workflow-statuses'] });
    }
  });
}
