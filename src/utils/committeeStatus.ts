/**
 * Committee Status Utility
 * 
 * Computes the display status of an incident committee based on:
 * - Member votes (approved/rejected/pending/vetoed)
 * - Committee required_approvals setting
 * - Veto power rules
 * 
 * Status priority:
 * 1. If any veto member rejected -> "Vetoed"
 * 2. If enough rejections to block approval -> "Rejected"
 * 3. If enough approvals -> "Approved"
 * 4. If some votes exist -> "Pending approval"
 * 5. If committee exists but no votes -> "Not started"
 * 6. If no committee -> "N/A" (should be rare with default committee requirement)
 * 
 * NOTE: Column widths are persisted in localStorage via useIncidentColumnWidths hook.
 * Committee status is derived at display time from vote data.
 */

export type CommitteeDisplayStatus = 
  | 'not_applicable'    // No committee attached
  | 'not_started'       // Committee exists, no votes yet
  | 'in_progress'       // Votes in progress, awaiting decision
  | 'pending_approval'  // Awaiting remaining approvals
  | 'approved'          // All required approvals received
  | 'rejected'          // Rejected by votes (not veto)
  | 'vetoed';           // Rejected by veto holder

interface CommitteeMember {
  id: string;
  has_veto: boolean;
  vote?: { vote: string; voted_at?: string; comment?: string } | null;
}

interface Committee {
  id: string;
  status: string;
  required_approvals?: number | null;
  members?: CommitteeMember[];
}

export interface CommitteeStatusResult {
  status: CommitteeDisplayStatus;
  label: string;
  className: string;
  /** Short description for tooltips */
  description?: string;
}

/**
 * Compute the display status of a committee based on member votes
 * 
 * Developer notes:
 * - This function is called for each row in the incident list
 * - Committee status is derived from vote data, not stored directly
 * - Veto rejection takes precedence over all other statuses
 */
export function getCommitteeDisplayStatus(committee: Committee | null | undefined): CommitteeStatusResult {
  // No committee = N/A
  if (!committee) {
    return {
      status: 'not_applicable',
      label: 'N/A',
      className: 'text-[var(--text-3)]',
      description: 'No committee assigned',
    };
  }
  
  // Committee exists but no members = Not started
  if (!committee.members || committee.members.length === 0) {
    return {
      status: 'not_started',
      label: 'Not started',
      className: 'text-[var(--text-3)]',
      description: 'Committee has no members yet',
    };
  }

  const members = committee.members;
  const totalMembers = members.length;
  const requiredApprovals = committee.required_approvals || Math.ceil(totalMembers / 2);

  // Count votes
  const approvedCount = members.filter(m => m.vote?.vote === 'approved').length;
  const rejectedCount = members.filter(m => 
    m.vote?.vote === 'rejected' || m.vote?.vote === 'vetoed'
  ).length;
  const pendingCount = members.filter(m => 
    !m.vote?.vote || m.vote.vote === 'pending'
  ).length;

  // Check for veto rejection - highest priority
  const hasVetoRejection = members.some(m => 
    m.has_veto && (m.vote?.vote === 'vetoed' || m.vote?.vote === 'rejected')
  );

  // 1. Veto rejection takes precedence
  if (hasVetoRejection) {
    return {
      status: 'vetoed',
      label: 'Vetoed',
      className: 'text-rose-600 dark:text-rose-400 font-medium',
      description: 'Rejected by veto holder',
    };
  }

  // 2. Committee already decided in DB
  if (committee.status === 'approved') {
    return {
      status: 'approved',
      label: 'Approved',
      className: 'text-emerald-600 dark:text-emerald-400 font-medium',
      description: 'Committee approved',
    };
  }

  if (committee.status === 'rejected') {
    return {
      status: 'rejected',
      label: 'Rejected',
      className: 'text-rose-600 dark:text-rose-400 font-medium',
      description: 'Committee rejected',
    };
  }

  // 3. Check if majority approved
  if (approvedCount >= requiredApprovals) {
    return {
      status: 'approved',
      label: 'Approved',
      className: 'text-emerald-600 dark:text-emerald-400 font-medium',
      description: `${approvedCount}/${requiredApprovals} approvals received`,
    };
  }

  // 4. Check if rejection threshold met (can't reach approval)
  const remainingPossibleApprovals = pendingCount + approvedCount;
  if (remainingPossibleApprovals < requiredApprovals) {
    return {
      status: 'rejected',
      label: 'Rejected',
      className: 'text-rose-600 dark:text-rose-400 font-medium',
      description: 'Cannot reach required approval threshold',
    };
  }

  // 5. Some votes cast - show pending approval
  const totalVotesCast = approvedCount + rejectedCount;
  if (totalVotesCast > 0) {
    return {
      status: 'pending_approval',
      label: 'Pending approval',
      className: 'text-amber-600 dark:text-amber-400',
      description: `${approvedCount}/${requiredApprovals} approvals, ${pendingCount} pending`,
    };
  }

  // 6. Committee exists, no votes yet
  return {
    status: 'not_started',
    label: 'Not started',
    className: 'text-[var(--text-3)]',
    description: 'Awaiting committee review',
  };
}
