/**
 * Committee Queue Hook
 * 
 * Fetches incidents in committee and computes derived governance fields.
 * Implements majority + absolute veto logic.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Incident, CommitteeMember, IncidentCommittee } from '@/types/incident';

export type CommitteeDecisionStatus = 'pending' | 'approved' | 'vetoed';

export interface CommitteeQueueItem {
  incident: Incident;
  // Committee-level fields
  committeeId: string;
  committeeStatus: CommitteeDecisionStatus;
  committeeSentAt: string;
  committeeSentBy?: string;
  committeeDecisionAt?: string;
  committeeDueAt?: string;
  committeeMajorityThreshold: number;
  // Approvers
  approvers: CommitteeApprover[];
  // Derived counts
  approvalsCompletedCount: number;
  approvalsTotalCount: number;
  approvalsRequiredCount: number;
  vetoCount: number;
  pendingCount: number;
  // Last action
  lastAction?: CommitteeAction;
  // Aging
  agingDays: number;
}

export interface CommitteeApprover {
  id: string;
  userId: string;
  userName: string;
  userInitials?: string;
  userEmail?: string;
  decision: 'pending' | 'approved' | 'vetoed';
  decidedAt?: string;
  comment?: string;
  hasVeto: boolean;
  addedBy?: string;
  addedAt?: string;
}

export interface CommitteeAction {
  type: 'approved' | 'vetoed' | 'approver_added' | 'sent_to_committee';
  by?: string;
  at?: string;
  details?: string;
}

export interface UseCommitteeQueueOptions {
  includeClosedDecisions?: boolean;
}

/**
 * Compute committee decision status based on majority + veto rules
 */
function computeCommitteeStatus(
  members: CommitteeMember[],
  requiredApprovals: number
): { status: CommitteeDecisionStatus; decisionAt?: string } {
  if (!members || members.length === 0) {
    return { status: 'pending' };
  }

  // Check for veto - ABSOLUTE OVERRIDE
  const vetoMember = members.find(m => m.vote?.vote === 'vetoed');
  if (vetoMember) {
    return { 
      status: 'vetoed', 
      decisionAt: vetoMember.vote?.voted_at 
    };
  }

  // Count approvals
  const approvedCount = members.filter(m => m.vote?.vote === 'approved').length;
  
  // Check if majority reached
  if (approvedCount >= requiredApprovals) {
    // Find the last approval that reached the threshold
    const approvalVotes = members
      .filter(m => m.vote?.vote === 'approved' && m.vote?.voted_at)
      .sort((a, b) => new Date(b.vote!.voted_at!).getTime() - new Date(a.vote!.voted_at!).getTime());
    
    return { 
      status: 'approved', 
      decisionAt: approvalVotes[0]?.vote?.voted_at 
    };
  }

  return { status: 'pending' };
}

/**
 * Map committee data to queue item
 */
function mapToQueueItem(incident: Incident): CommitteeQueueItem | null {
  const committee = incident.committee;
  if (!committee) return null;

  const members = committee.members || [];
  const totalMembers = members.length;
  const requiredApprovals = committee.required_approvals || Math.ceil(totalMembers / 2);

  // Compute status
  const { status, decisionAt } = computeCommitteeStatus(members, requiredApprovals);

  // Map approvers
  const approvers: CommitteeApprover[] = members.map(m => ({
    id: m.id,
    userId: m.user_id,
    userName: m.user?.full_name || 'Unknown',
    userInitials: m.user?.avatar_initials,
    userEmail: m.user?.email,
    decision: m.vote?.vote === 'vetoed' ? 'vetoed' : 
              m.vote?.vote === 'approved' ? 'approved' : 'pending',
    decidedAt: m.vote?.voted_at,
    comment: m.vote?.comment,
    hasVeto: m.has_veto,
    addedAt: committee.created_at, // We don't have individual addedAt, use committee created
  }));

  // Count votes
  const approvalsCompletedCount = members.filter(m => m.vote?.vote === 'approved').length;
  const vetoCount = members.filter(m => m.vote?.vote === 'vetoed').length;
  const pendingCount = members.filter(m => !m.vote?.vote || m.vote.vote === 'pending').length;

  // Compute aging
  const agingDays = Math.floor(
    (Date.now() - new Date(committee.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Determine last action
  let lastAction: CommitteeAction | undefined;
  
  // Find most recent vote
  const allVotes = members
    .filter(m => m.vote?.voted_at)
    .sort((a, b) => new Date(b.vote!.voted_at!).getTime() - new Date(a.vote!.voted_at!).getTime());
  
  if (allVotes.length > 0) {
    const lastVote = allVotes[0];
    lastAction = {
      type: lastVote.vote?.vote === 'vetoed' ? 'vetoed' : 'approved',
      by: lastVote.user?.full_name,
      at: lastVote.vote?.voted_at,
      details: lastVote.vote?.comment,
    };
  } else {
    lastAction = {
      type: 'sent_to_committee',
      at: committee.created_at,
    };
  }

  return {
    incident,
    committeeId: committee.id,
    committeeStatus: status,
    committeeSentAt: committee.created_at,
    committeeDecisionAt: decisionAt,
    committeeDueAt: committee.due_date,
    committeeMajorityThreshold: requiredApprovals,
    approvers,
    approvalsCompletedCount,
    approvalsTotalCount: totalMembers,
    approvalsRequiredCount: requiredApprovals,
    vetoCount,
    pendingCount,
    lastAction,
    agingDays,
  };
}

export function useCommitteeQueue(options: UseCommitteeQueueOptions = {}) {
  const { includeClosedDecisions = false } = options;

  return useQuery({
    queryKey: ['committee-queue', { includeClosedDecisions }],
    queryFn: async () => {
      // Build query for incidents with committee
      let query = supabase
        .from('incidents')
        .select(`
          *,
          release_version:release_versions(*),
          reporter:incident_user_profiles!incidents_reporter_id_fkey(*),
          assignee:incident_user_profiles!incidents_assignee_id_fkey(*),
          sla:incident_sla!incident_sla_incident_id_fkey(*),
          committee:incident_committees!incidents_committee_id_fkey(
            *,
            members:committee_members(
              *,
              user:incident_user_profiles(*),
              vote:committee_votes(*)
            )
          )
        `)
        .not('committee_id', 'is', null);

      // If not including closed decisions, filter to pending status only
      if (!includeClosedDecisions) {
        query = query.eq('status', 'to_committee');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Map to queue items and compute derived fields
      const queueItems: CommitteeQueueItem[] = [];
      
      for (const incident of data || []) {
        // Normalize vote data (can be array from join)
        if (incident.committee?.members) {
          incident.committee.members = incident.committee.members.map((m: any) => ({
            ...m,
            vote: Array.isArray(m.vote) ? m.vote[0] : m.vote,
          }));
        }

        const item = mapToQueueItem(incident as unknown as Incident);
        if (item) {
          // Filter based on includeClosedDecisions
          if (includeClosedDecisions || item.committeeStatus === 'pending') {
            queueItems.push(item);
          }
        }
      }

      return queueItems;
    },
  });
}

/**
 * Mutation to record an approval vote
 */
export function useRecordApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      committeeId, 
      memberId 
    }: { 
      committeeId: string; 
      memberId: string;
    }) => {
      const { error } = await supabase
        .from('committee_votes')
        .update({ 
          vote: 'approved', 
          voted_at: new Date().toISOString() 
        })
        .eq('committee_id', committeeId)
        .eq('member_id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committee-queue'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

/**
 * Mutation to record a veto vote (requires comment)
 */
export function useRecordVeto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      committeeId, 
      memberId, 
      comment 
    }: { 
      committeeId: string; 
      memberId: string; 
      comment: string; // Required for veto
    }) => {
      if (!comment || comment.trim().length === 0) {
        throw new Error('Comment is required when vetoing');
      }

      const { error } = await supabase
        .from('committee_votes')
        .update({ 
          vote: 'vetoed', 
          voted_at: new Date().toISOString(),
          comment: comment.trim(),
        })
        .eq('committee_id', committeeId)
        .eq('member_id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committee-queue'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

/**
 * Mutation to auto-transition incident to In Progress when approved
 */
export function useTransitionOnApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      committeeId 
    }: { 
      incidentId: string; 
      committeeId: string;
    }) => {
      // Update committee status
      const { error: committeeError } = await supabase
        .from('incident_committees')
        .update({ 
          status: 'approved',
          decided_at: new Date().toISOString(),
        })
        .eq('id', committeeId);

      if (committeeError) throw committeeError;

      // Transition incident to in_progress
      const { error: incidentError } = await supabase
        .from('incidents')
        .update({ status: 'in_progress' })
        .eq('id', incidentId);

      if (incidentError) throw incidentError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committee-queue'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}
