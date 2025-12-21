// Release Calendar Module Types
// Forward Schedule of Change (FSC) - Phase 2

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

// Phase 2 Types
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ApprovalsOverallStatus = 'pending' | 'in_progress' | 'approved' | 'rejected';

export type ReleaseReadiness = 'not_ready' | 'partial' | 'ready' | 'deployed';

export type WindowType = 'blackout' | 'maintenance';

export type WindowSeverity = 'info' | 'warning' | 'critical';

export type DependencyType = 'must_complete_before' | 'should_complete_before' | 'related';

export type DependencyStatus = 'active' | 'resolved' | 'cancelled';

export type ApprovalStepType = 'technical_review' | 'security_review' | 'cab_approval' | 'business_approval' | 'emergency_approval';

export type ApprovalStepStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

export type ConflictType = 'blackout_violation' | 'dependency_violation' | 'resource_conflict' | 'timing_conflict';

export type ConflictSeverity = 'info' | 'warning' | 'critical';

export type ConflictStatus = 'open' | 'acknowledged' | 'resolved' | 'ignored';

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
  // Phase 2 fields
  risk_level?: RiskLevel | null;
  approvals_overall_status?: ApprovalsOverallStatus | null;
  release_readiness?: ReleaseReadiness | null;
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

// Phase 2 Interfaces
export interface ReleaseWindow {
  id: string;
  window_type: WindowType;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  applies_to_release_version_id?: string | null;
  applies_to_environment?: string | null;
  severity: WindowSeverity;
  is_recurring?: boolean;
  recurrence_pattern?: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChangeDependency {
  id: string;
  blocking_change_id: string;
  blocked_change_id: string;
  dependency_type: DependencyType;
  notes?: string | null;
  status: DependencyStatus;
  created_by_user_id: string;
  created_at: string;
  // Joined data
  blocking_change?: ChangeCard;
  blocked_change?: ChangeCard;
}

export interface ChangeApproval {
  id: string;
  change_card_id: string;
  step_type: ApprovalStepType;
  step_order: number;
  status: ApprovalStepStatus;
  assigned_role?: string | null;
  assigned_user_id?: string | null;
  decision_by_user_id?: string | null;
  decided_at?: string | null;
  comments?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChangeConflict {
  id: string;
  change_card_id: string;
  conflict_type: ConflictType;
  severity: ConflictSeverity;
  related_change_id?: string | null;
  related_window_id?: string | null;
  message: string;
  status: ConflictStatus;
  resolved_by_user_id?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  // Joined data
  related_change?: ChangeCard;
  related_window?: ReleaseWindow;
}

export interface ChangeCardWithLinks extends ChangeCard {
  links?: ChangeCardLink[];
  committee_pending_count?: number;
  approvals?: ChangeApproval[];
  conflicts?: ChangeConflict[];
  dependencies_blocking?: ChangeDependency[];
  dependencies_blocked_by?: ChangeDependency[];
}

// Form types
export interface CreateChangeCardInput {
  change_number: string;
  title: string;
  description?: string;
  planned_prod_date: string;
  release_version_id?: string;
  change_manager_user_id: string;
  risk_level?: RiskLevel;
}

export interface UpdateChangeCardInput {
  title?: string;
  description?: string;
  planned_prod_date?: string;
  release_version_id?: string;
  change_manager_user_id?: string;
  status?: ChangeCardStatus;
  risk_level?: RiskLevel;
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

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  'low': 'Low',
  'medium': 'Medium',
  'high': 'High',
  'critical': 'Critical',
};

export const APPROVAL_STEP_LABELS: Record<ApprovalStepType, string> = {
  'technical_review': 'Technical Review',
  'security_review': 'Security Review',
  'cab_approval': 'CAB Approval',
  'business_approval': 'Business Approval',
  'emergency_approval': 'Emergency Approval',
};

export const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
  'blackout_violation': 'Blackout Violation',
  'dependency_violation': 'Dependency Violation',
  'resource_conflict': 'Resource Conflict',
  'timing_conflict': 'Timing Conflict',
};

export const WINDOW_TYPE_LABELS: Record<WindowType, string> = {
  'blackout': 'Blackout',
  'maintenance': 'Maintenance',
};
