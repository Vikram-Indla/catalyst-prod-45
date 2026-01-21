/**
 * Stakeholder Sign-off Hooks
 * Module 5B-3: Sign-off workflow management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ReleaseSignoffStatus,
  ReleaseSignoff,
  SignoffSummary,
  SignoffTemplate,
  SignoffRequest,
  SignoffDecisionInput,
} from '../types/signoff';

// Transform database response to typed format
function transformSignoffStatus(data: unknown): ReleaseSignoffStatus {
  const raw = data as {
    release_id: string;
    signoffs: Array<{
      id: string;
      stakeholder_id: string;
      stakeholder_name: string;
      stakeholder_email: string;
      stakeholder_role: string;
      decision: string;
      comments: string | null;
      requested_at: string;
      decided_at: string | null;
      is_required: boolean;
    }>;
    summary: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      abstained: number;
      required_total: number;
      required_approved: number;
      all_required_approved: boolean;
      has_rejections: boolean;
    };
  };

  return {
    releaseId: raw.release_id,
    signoffs: (raw.signoffs || []).map(s => ({
      id: s.id,
      stakeholderId: s.stakeholder_id,
      stakeholderName: s.stakeholder_name,
      stakeholderEmail: s.stakeholder_email,
      stakeholderRole: s.stakeholder_role,
      decision: s.decision as ReleaseSignoff['decision'],
      comments: s.comments || undefined,
      requestedAt: s.requested_at,
      decidedAt: s.decided_at || undefined,
      isRequired: s.is_required,
    })),
    summary: {
      total: raw.summary?.total || 0,
      pending: raw.summary?.pending || 0,
      approved: raw.summary?.approved || 0,
      rejected: raw.summary?.rejected || 0,
      abstained: raw.summary?.abstained || 0,
      requiredTotal: raw.summary?.required_total || 0,
      requiredApproved: raw.summary?.required_approved || 0,
      allRequiredApproved: raw.summary?.all_required_approved || false,
      hasRejections: raw.summary?.has_rejections || false,
    },
  };
}

// Hook to get sign-off status for a release
export function useReleaseSignoffs(releaseId: string) {
  return useQuery({
    queryKey: ['release-signoffs', releaseId],
    queryFn: async (): Promise<ReleaseSignoffStatus> => {
      const { data, error } = await supabase.rpc('tm_get_release_signoff_status', {
        p_release_id: releaseId,
      });

      if (error) throw error;
      return transformSignoffStatus(data);
    },
    enabled: !!releaseId,
  });
}

// Hook to request sign-off from a stakeholder
export function useRequestSignoff() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: SignoffRequest) => {
      const { data, error } = await supabase.rpc('tm_request_signoff', {
        p_release_id: request.releaseId,
        p_stakeholder_id: request.stakeholderId,
        p_stakeholder_role: request.stakeholderRole,
        p_requested_by: request.requestedBy || null,
        p_is_required: request.isRequired ?? true,
      });

      if (error) throw error;
      return { signoffId: data as string, releaseId: request.releaseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['release-signoffs', data.releaseId] });
      toast({ title: 'Sign-off Requested', description: 'Stakeholder has been notified' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Hook to submit sign-off decision
export function useSubmitSignoff() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      input, 
      releaseId 
    }: { 
      input: SignoffDecisionInput; 
      releaseId: string;
    }) => {
      const { data, error } = await supabase.rpc('tm_submit_signoff_decision', {
        p_signoff_id: input.signoffId,
        p_stakeholder_id: input.stakeholderId,
        p_decision: input.decision,
        p_comments: input.comments || null,
      });

      if (error) throw error;
      return { success: data as boolean, releaseId };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['release-signoffs', data.releaseId] });
      queryClient.invalidateQueries({ queryKey: ['go-no-go-assessment', data.releaseId] });
      
      const decisionLabel = variables.input.decision === 'approve' ? 'approved' :
                           variables.input.decision === 'reject' ? 'rejected' : 'submitted';
      toast({ title: 'Decision Submitted', description: `Sign-off ${decisionLabel}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Hook to get sign-off templates
export function useSignoffTemplates() {
  return useQuery({
    queryKey: ['signoff-templates'],
    queryFn: async (): Promise<SignoffTemplate[]> => {
      const { data, error } = await supabase
        .from('tm_signoff_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      
      return (data || []).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || undefined,
        roles: (t.roles as unknown as SignoffTemplate['roles']) || [],
        isDefault: t.is_default || false,
        createdAt: t.created_at || '',
        createdBy: t.created_by || undefined,
      }));
    },
  });
}

// Hook to apply a template to a release
export function useApplySignoffTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      releaseId,
      templateId,
      requestedBy,
    }: {
      releaseId: string;
      templateId: string;
      requestedBy?: string;
    }) => {
      const { data, error } = await supabase.rpc('tm_apply_signoff_template', {
        p_release_id: releaseId,
        p_template_id: templateId,
        p_requested_by: requestedBy || null,
      });

      if (error) throw error;
      return { count: data as number, releaseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['release-signoffs', data.releaseId] });
      toast({ 
        title: 'Template Applied', 
        description: `${data.count} sign-off request(s) created` 
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Hook to remove a signoff request
export function useRemoveSignoff() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ signoffId, releaseId }: { signoffId: string; releaseId: string }) => {
      const { error } = await supabase
        .from('tm_release_signoffs')
        .delete()
        .eq('id', signoffId);

      if (error) throw error;
      return { releaseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['release-signoffs', data.releaseId] });
      toast({ title: 'Sign-off Removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
