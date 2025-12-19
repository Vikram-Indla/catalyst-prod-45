/**
 * Committee computed status logic
 * 
 * Every incident has a committee, but the displayed status is computed:
 * - Not applicable: committee has 0 approvers
 * - In progress: approvers exist and at least one pending
 * - Approved: majority satisfied and no veto rejection
 * - Rejected: veto rejected OR rejection rule satisfied
 */

export type CommitteeDisplayStatus = 
  | 'not_applicable'
  | 'in_progress'
  | 'approved'
  | 'rejected';

interface CommitteeMember {
  id: string;
  has_veto: boolean;
  vote?: { vote: string } | null;
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
}

export function getCommitteeDisplayStatus(committee: Committee | null | undefined): CommitteeStatusResult {
  // No committee = N/A
  if (!committee) {
    return {
      status: 'not_applicable',
      label: 'N/A',
      className: 'text-[var(--text-3)]',
    };
  }
  
  // Committee exists but no members = Not started
  if (!committee.members || committee.members.length === 0) {
    return {
      status: 'not_applicable',
      label: 'Not started',
      className: 'text-[var(--text-3)]',
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

  // Check for veto rejection
  const hasVetoRejection = members.some(m => 
    m.has_veto && m.vote?.vote === 'vetoed'
  );

  // Committee already decided
  if (committee.status === 'approved') {
    return {
      status: 'approved',
      label: 'Approved',
      className: 'text-emerald-600 dark:text-emerald-400 font-medium',
    };
  }

  if (committee.status === 'rejected' || hasVetoRejection) {
    return {
      status: 'rejected',
      label: hasVetoRejection ? 'Vetoed' : 'Rejected',
      className: 'text-rose-600 dark:text-rose-400 font-medium',
    };
  }

  // Check if majority approved
  if (approvedCount >= requiredApprovals) {
    return {
      status: 'approved',
      label: 'Approved',
      className: 'text-emerald-600 dark:text-emerald-400 font-medium',
    };
  }

  // Check if rejection threshold met
  if (rejectedCount > totalMembers - requiredApprovals) {
    return {
      status: 'rejected',
      label: 'Rejected',
      className: 'text-rose-600 dark:text-rose-400 font-medium',
    };
  }

  // Still pending votes - show "In progress"
  if (pendingCount > 0) {
    return {
      status: 'in_progress',
      label: 'In progress',
      className: 'text-violet-600 dark:text-violet-400',
    };
  }

  // Fallback
  return {
    status: 'in_progress',
    label: 'In progress',
    className: 'text-violet-600 dark:text-violet-400',
  };
}
