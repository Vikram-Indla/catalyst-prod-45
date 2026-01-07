import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditEvent } from './useAIAssistDrafts';
import type { Json } from '@/integrations/supabase/types';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface AIAssistApproval {
  id: string;
  draft_id: string;
  approver_user_id: string;
  status: ApprovalStatus;
  comment: string | null;
  reason_json: Json | null;
  requested_by: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface CreateApprovalInput {
  draft_id: string;
  approver_user_id: string;
  reason_json?: Json;
}

export interface DecideApprovalInput {
  approval_id: string;
  draft_id: string;
  status: 'approved' | 'rejected';
  comment?: string;
}

// Fetch all approvals for a draft
export function useAIAssistApprovals(draftId: string | undefined) {
  return useQuery({
    queryKey: ['ai-assist-approvals', draftId],
    queryFn: async (): Promise<AIAssistApproval[]> => {
      if (!draftId) return [];

      const { data, error } = await supabase
        .from('ai_assist_approvals')
        .select('*')
        .eq('draft_id', draftId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AIAssistApproval[];
    },
    enabled: !!draftId,
  });
}

// Fetch pending approvals for current user (across all drafts)
export function usePendingApprovals() {
  return useQuery({
    queryKey: ['ai-assist-pending-approvals'],
    queryFn: async (): Promise<AIAssistApproval[]> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data, error } = await supabase
        .from('ai_assist_approvals')
        .select('*')
        .eq('approver_user_id', userData.user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AIAssistApproval[];
    },
  });
}

// Get the latest approval for a draft
export function useLatestApproval(draftId: string | undefined) {
  return useQuery({
    queryKey: ['ai-assist-latest-approval', draftId],
    queryFn: async (): Promise<AIAssistApproval | null> => {
      if (!draftId) return null;

      const { data, error } = await supabase
        .from('ai_assist_approvals')
        .select('*')
        .eq('draft_id', draftId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as AIAssistApproval | null;
    },
    enabled: !!draftId,
  });
}

// Request approval (create pending approval)
export function useRequestApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateApprovalInput): Promise<AIAssistApproval> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data, error } = await supabase
        .from('ai_assist_approvals')
        .insert([{
          draft_id: input.draft_id,
          approver_user_id: input.approver_user_id,
          status: 'pending',
          reason_json: input.reason_json || null,
          requested_by: userId,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update draft approval status
      await supabase
        .from('ai_assist_drafts')
        .update({ 
          approval_status: 'pending',
          approver_user_id: input.approver_user_id,
        })
        .eq('id', input.draft_id);

      // Log audit event
      await logAuditEvent(input.draft_id, null, 'state_corrected' as any, userId, {
        action: 'approval_requested',
        approver_user_id: input.approver_user_id,
      });

      return data as AIAssistApproval;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-assist-approvals', data.draft_id] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-latest-approval', data.draft_id] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-draft', data.draft_id] });
      toast.success('Approval requested');
    },
    onError: (error) => {
      toast.error('Failed to request approval: ' + error.message);
    },
  });
}

// Decide on approval (approve/reject)
export function useDecideApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DecideApprovalInput): Promise<AIAssistApproval> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data, error } = await supabase
        .from('ai_assist_approvals')
        .update({
          status: input.status,
          comment: input.comment,
          decided_at: new Date().toISOString(),
        })
        .eq('id', input.approval_id)
        .select()
        .single();

      if (error) throw error;

      // Update draft approval status
      await supabase
        .from('ai_assist_drafts')
        .update({ 
          approval_status: input.status,
        })
        .eq('id', input.draft_id);

      // Log audit event
      await logAuditEvent(input.draft_id, null, 'state_corrected' as any, userId, {
        action: `approval_${input.status}`,
        comment: input.comment,
      });

      return data as AIAssistApproval;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-assist-approvals', data.draft_id] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-latest-approval', data.draft_id] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-draft', data.draft_id] });
      toast.success(data.status === 'approved' ? 'Approved' : 'Rejected');
    },
    onError: (error) => {
      toast.error('Failed to decide approval: ' + error.message);
    },
  });
}
