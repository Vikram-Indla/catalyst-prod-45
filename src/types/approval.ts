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

/**
 * Values below are Atlaskit semantic-token fallback hexes (legacy-light).
 * They match the `token('color.*', fallback)` pattern used by migrated
 * surfaces (see BAU Dashboard conversion). When a caller becomes a React
 * component it can upgrade `APPROVAL_STATUS_CONFIG[s].color` into
 * `token('color.text.warning.bolder', APPROVAL_STATUS_CONFIG[s].color)`
 * without changing the string value. Previously: raw HSL, including four
 * Golden Hour collisions (§7) — now replaced with Atlaskit canonical palette.
 */
export const APPROVAL_STATUS_CONFIG = {
  pending: {
    // token('color.text.warning.bolder') / bg: token('color.background.warning.hovered')
    label: 'Pending',
    color: '#974F0C',
    bgColor: '#FFF0B3',
  },
  approved: {
    // token('color.text.success.bolder') / bg: token('color.background.success.hovered')
    label: 'Approved',
    color: '#006644',
    bgColor: '#ABF5D1',
  },
  rejected: {
    // token('color.text.danger.bolder') / bg: token('color.background.danger.subtler')
    label: 'Rejected',
    color: '#BF2600',
    bgColor: '#FFBDAD',
  },
  waiting: {
    // Canonical StatusLozenge grey (CLAUDE.md §5) — neutral.bold text on lozenge grey
    label: 'Waiting',
    color: '#42526E',
    bgColor: '#DFE1E6',
  },
  skipped: {
    // Canonical StatusLozenge grey, subtler bg
    label: 'Skipped',
    color: '#42526E',
    bgColor: '#F4F5F7',
  },
} as const;

/**
 * WORKFLOW_STATUSES — 10-stage Catalyst workflow. Each color is an Atlaskit
 * semantic-token fallback hex. Eliminates the four Golden Hour palette
 * collisions previously baked into the HSL form (design=#896F58,
 * in_dev=#C79C6B, uat=#D4B996, beta=#5B7B5B — all banned per §7).
 */
export const WORKFLOW_STATUSES = [
  { id: 'backlog', name: 'Backlog', color: '#42526E' },           // neutral.bold
  { id: 'design', name: 'Design', color: '#5243AA' },              // purple.bolder
  { id: 'ready_dev', name: 'Ready for Development', color: '#0052CC' }, // brand.bold (info)
  { id: 'in_dev', name: 'In Development', color: '#FF991F' },      // warning.bold (yellow)
  { id: 'qa', name: 'QA Testing', color: '#FFAB00' },              // warning.bold.hovered
  { id: 'uat', name: 'UAT Testing', color: '#FF991F' },            // warning.bold
  { id: 'beta', name: 'In Beta', color: '#36B37E' },               // success.bold.hovered
  { id: 'ready_prod', name: 'Ready for Production', color: '#00875A' }, // success.bold
  { id: 'in_prod', name: 'In Production', color: '#006644' },      // text.success.bolder
  { id: 'on_hold', name: 'On Hold', color: '#42526E' },            // neutral.bold
] as const;

export function getStatusLabel(statusId: string): string {
  return WORKFLOW_STATUSES.find(s => s.id === statusId)?.name || statusId;
}

export function getStatusColor(statusId: string): string {
  return WORKFLOW_STATUSES.find(s => s.id === statusId)?.color || '#42526E';
}
