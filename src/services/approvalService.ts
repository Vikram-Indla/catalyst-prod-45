import { supabase } from '@/integrations/supabase/client';
import type { TransitionApprover, TransitionApprovalGroup } from '@/types/approval';

export async function getTransitionApprovals(
  entityType: 'feature' | 'story',
  entityId: string
): Promise<TransitionApprovalGroup[]> {
  const { data, error } = await supabase
    .from('transition_approvers')
    .select(`
      *,
      approver:profiles!transition_approvers_approver_id_fkey(id, full_name, avatar_url)
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('step_order', { ascending: true });

  if (error) throw error;

  // Group by transition (from_status -> to_status)
  const grouped: Record<string, TransitionApprovalGroup> = {};
  
  (data || []).forEach((approver: any) => {
    const key = `${approver.from_status}->${approver.to_status}`;
    if (!grouped[key]) {
      grouped[key] = {
        from_status: approver.from_status,
        to_status: approver.to_status,
        approval_type: 'sequential',
        approvers: [],
        is_complete: false,
        pending_count: 0,
        approved_count: 0,
        veto_approved: false,
      };
    }
    grouped[key].approvers.push(approver as TransitionApprover);
    
    if (approver.status === 'pending' || approver.status === 'waiting') {
      grouped[key].pending_count++;
    }
    if (approver.status === 'approved') {
      grouped[key].approved_count++;
      if (approver.is_veto) {
        grouped[key].veto_approved = true;
      }
    }
  });

  // Calculate completion
  Object.values(grouped).forEach(group => {
    group.is_complete = group.veto_approved || group.pending_count === 0;
  });

  return Object.values(grouped);
}

export async function addTransitionApprover(
  entityType: 'feature' | 'story',
  entityId: string,
  fromStatus: string,
  toStatus: string,
  approverId: string,
  options: { isVeto?: boolean; stepOrder?: number; dueDate?: string } = {}
): Promise<TransitionApprover> {
  const { data: user } = await supabase.auth.getUser();

  // If setting as veto, remove existing veto first (only ONE veto allowed)
  if (options.isVeto) {
    await supabase
      .from('transition_approvers')
      .update({ is_veto: false })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('from_status', fromStatus)
      .eq('to_status', toStatus)
      .eq('is_veto', true);
  }

  const { data, error } = await supabase
    .from('transition_approvers')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      from_status: fromStatus,
      to_status: toStatus,
      approver_id: approverId,
      is_veto: options.isVeto || false,
      step_order: options.stepOrder || 1,
      due_date: options.dueDate || null,
      requested_by: user?.user?.id,
      status: 'pending',
    })
    .select(`*, approver:profiles!transition_approvers_approver_id_fkey(id, full_name, avatar_url)`)
    .single();

  if (error) throw error;
  return data as TransitionApprover;
}

export async function removeTransitionApprover(approverId: string): Promise<void> {
  const { error } = await supabase
    .from('transition_approvers')
    .delete()
    .eq('id', approverId);
  if (error) throw error;
}

export async function respondToApproval(
  approverId: string,
  action: 'approve' | 'reject',
  comment?: string
): Promise<TransitionApprover> {
  const { data, error } = await supabase
    .from('transition_approvers')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      comment: comment || null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', approverId)
    .select()
    .single();

  if (error) throw error;
  return data as TransitionApprover;
}

export async function setVetoApprover(
  entityType: 'feature' | 'story',
  entityId: string,
  fromStatus: string,
  toStatus: string,
  approverId: string
): Promise<void> {
  // Remove existing veto
  await supabase
    .from('transition_approvers')
    .update({ is_veto: false })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('from_status', fromStatus)
    .eq('to_status', toStatus)
    .eq('is_veto', true);

  // Set new veto
  await supabase
    .from('transition_approvers')
    .update({ is_veto: true })
    .eq('id', approverId);
}

export async function canTransition(
  entityType: 'feature' | 'story',
  entityId: string,
  fromStatus: string,
  toStatus: string
): Promise<{
  allowed: boolean;
  reason: string;
  pendingCount: number;
  approvedCount: number;
  totalCount: number;
  vetoApproved: boolean;
}> {
  const { data, error } = await supabase.rpc('can_transition', {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_from_status: fromStatus,
    p_to_status: toStatus,
  });

  if (error) throw error;

  const result = data?.[0];
  return {
    allowed: result?.allowed ?? true,
    reason: result?.reason ?? 'No approval required',
    pendingCount: result?.pending_count ?? 0,
    approvedCount: result?.approved_count ?? 0,
    totalCount: result?.total_count ?? 0,
    vetoApproved: result?.veto_approved ?? false,
  };
}

export async function getApprovalConfigs() {
  const { data, error } = await supabase
    .from('transition_approval_configs')
    .select('*')
    .eq('is_active', true);
  
  if (error) throw error;
  return data;
}
