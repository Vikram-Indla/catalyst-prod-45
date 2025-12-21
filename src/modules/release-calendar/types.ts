// Release Calendar Module Types
// Forward Schedule of Change (FSC)

export type ChangeCardStatus = 
  | 'new_awaiting_approval'
  | 'approved_scheduled'
  | 'in_progress'
  | 'ready_for_production'
  | 'in_production'
  | 'closed';

export type ComplianceState = 'compliant' | 'exception_recorded';

export type ExceptionReasonCode = 
  | 'moved_to_prod_not_approved'
  | 'committee_pending_override'
  | 'emergency_change'
  | 'business_critical'
  | 'other';

export type ChangeWorkItemType = 'incident' | 'story' | 'feature' | 'task' | 'other';

export type ChangeCommitteeStatus = 'pending' | 'approved' | 'not_required';

export type ChangeAuditEventType = 
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'approval_toggled'
  | 'ticket_linked'
  | 'ticket_unlinked'
  | 'exception_recorded';

export interface ChangeCard {
  id: string;
  change_number: string;
  title: string;
  description?: string | null;
  planned_prod_date: string;
  release_version_id?: string | null;
  change_manager_user_id: string;
  status: ChangeCardStatus;
  approved: boolean;
  approved_by_user_id?: string | null;
  approved_at?: string | null;
  compliance_state: ComplianceState;
  exception_reason_code?: ExceptionReasonCode | null;
  exception_notes?: string | null;
  exception_recorded_by_user_id?: string | null;
  exception_recorded_at?: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_by_user_id?: string | null;
  updated_at: string;
}

export interface ChangeCardLink {
  id: string;
  change_card_id: string;
  work_item_type: ChangeWorkItemType;
  work_item_id: string;
  work_item_key?: string | null;
  committee_status: ChangeCommitteeStatus;
  cached_title?: string | null;
  cached_status?: string | null;
  cached_priority_or_severity?: string | null;
  created_by_user_id: string;
  created_at: string;
}

export interface ChangeCardAuditEvent {
  id: string;
  change_card_id: string;
  event_type: ChangeAuditEventType;
  from_value?: string | null;
  to_value?: string | null;
  reason_code?: ExceptionReasonCode | null;
  notes?: string | null;
  actor_user_id: string;
  created_at: string;
  metadata_json?: Record<string, any>;
}

export interface ChangeCardWithLinks extends ChangeCard {
  links?: ChangeCardLink[];
  committee_pending_count?: number;
}

// Form types
export interface CreateChangeCardInput {
  change_number: string;
  title: string;
  description?: string;
  planned_prod_date: string;
  release_version_id?: string;
  change_manager_user_id: string;
}

export interface UpdateChangeCardInput {
  title?: string;
  description?: string;
  planned_prod_date?: string;
  release_version_id?: string;
  change_manager_user_id?: string;
  status?: ChangeCardStatus;
}

export interface RecordExceptionInput {
  reason_code: ExceptionReasonCode;
  notes?: string;
}

// Constants
export const STATUS_LABELS: Record<ChangeCardStatus, string> = {
  'new_awaiting_approval': 'New / Awaiting Approval',
  'approved_scheduled': 'Approved / Scheduled',
  'in_progress': 'In Progress',
  'ready_for_production': 'Ready for Production',
  'in_production': 'In Production',
  'closed': 'Closed',
};

export const STATUS_ORDER: ChangeCardStatus[] = [
  'new_awaiting_approval',
  'approved_scheduled',
  'in_progress',
  'ready_for_production',
  'in_production',
  'closed',
];

export const EXCEPTION_REASON_LABELS: Record<ExceptionReasonCode, string> = {
  'moved_to_prod_not_approved': 'Moved to Production Without Approval',
  'committee_pending_override': 'Committee Pending Override',
  'emergency_change': 'Emergency Change',
  'business_critical': 'Business Critical',
  'other': 'Other',
};
