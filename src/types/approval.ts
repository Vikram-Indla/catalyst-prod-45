export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'waiting' | 'skipped';
export type ApprovalType = 'sequential' | 'parallel';

export interface TransitionApprover {
  id: string;
  entity_type: 'feature' | 'story';
  entity_id: string;
  from_status: string;
  to_status: string;
  approver_id: string;
  status: ApprovalStatus;
  is_veto: boolean;
  step_order: number;
  due_date: string | null;
  comment: string | null;
  requested_at: string;
  responded_at: string | null;
  requested_by: string | null;
  approver?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    role?: string;
  };
}

export interface TransitionApprovalGroup {
  from_status: string;
  to_status: string;
  approval_type: ApprovalType;
  approvers: TransitionApprover[];
  is_complete: boolean;
  pending_count: number;
  approved_count: number;
  veto_approved: boolean;
}

export const APPROVAL_STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'hsl(38, 92%, 50%)',
    bgColor: 'hsl(38, 92%, 50%, 0.1)',
  },
  approved: {
    label: 'Approved',
    color: 'hsl(142, 71%, 45%)',
    bgColor: 'hsl(142, 71%, 45%, 0.1)',
  },
  rejected: {
    label: 'Rejected',
    color: 'hsl(0, 84%, 60%)',
    bgColor: 'hsl(0, 84%, 60%, 0.1)',
  },
  waiting: {
    label: 'Waiting',
    color: 'hsl(210, 5%, 80%)',
    bgColor: 'hsl(210, 5%, 80%, 0.15)',
  },
  skipped: {
    label: 'Skipped',
    color: 'hsl(0, 0%, 45%)',
    bgColor: 'hsl(0, 0%, 45%, 0.1)',
  },
} as const;

export const WORKFLOW_STATUSES = [
  { id: 'backlog', name: 'Backlog', color: 'hsl(210, 5%, 80%)' },
  { id: 'design', name: 'Design', color: 'hsl(30, 22%, 44%)' },
  { id: 'ready_dev', name: 'Ready for Development', color: 'hsl(217, 91%, 60%)' },
  { id: 'in_dev', name: 'In Development', color: 'hsl(32, 45%, 60%)' },
  { id: 'qa', name: 'QA Testing', color: 'hsl(38, 92%, 50%)' },
  { id: 'uat', name: 'UAT Testing', color: 'hsl(32, 41%, 71%)' },
  { id: 'beta', name: 'In Beta', color: 'hsl(120, 14%, 43%)' },
  { id: 'ready_prod', name: 'Ready for Production', color: 'hsl(142, 71%, 45%)' },
  { id: 'in_prod', name: 'In Production', color: 'hsl(142, 76%, 36%)' },
  { id: 'on_hold', name: 'On Hold', color: 'hsl(0, 0%, 45%)' },
] as const;

export function getStatusLabel(statusId: string): string {
  return WORKFLOW_STATUSES.find(s => s.id === statusId)?.name || statusId;
}

export function getStatusColor(statusId: string): string {
  return WORKFLOW_STATUSES.find(s => s.id === statusId)?.color || 'hsl(0, 0%, 45%)';
}
