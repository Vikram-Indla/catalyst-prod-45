// ============================================================
// INCIDENTHUB — G3 TYPESCRIPT INTERFACES
// Catalyst Enterprise Platform | Saudi Ministry of Industry
// NOTE: Incident base type includes optional joined fields for backward compat
// Generated: 2026-03-09 | FORGE SDLC Pipeline G3
// ============================================================

// ─────────────────────────────────────────────
// ENUMS (mirror DB enums exactly)
// ─────────────────────────────────────────────

export type IncidentStatus =
  | 'open'
  | 'triage'
  | 'to_committee'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'converted';

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  open:         'Open',
  triage:       'Triaging',
  to_committee: 'In Committee',
  in_progress:  'In Progress',
  resolved:     'Resolved',
  closed:       'Closed',
  converted:    'Converted',
};

export const INCIDENT_STATUS_LOZENGE: Record<IncidentStatus, 'grey' | 'blue' | 'green'> = {
  open:         'grey',
  triage:       'grey',
  to_committee: 'blue',
  in_progress:  'blue',
  resolved:     'green',
  closed:       'green',
  converted:    'green',
};

export type IncidentSeverity = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';

export const SEV_COLORS: Record<IncidentSeverity, { bg: string; text: string }> = {
  SEV1: { bg: '#FEE2E2', text: '#991B1B' },
  SEV2: { bg: '#FEF3C7', text: '#92400E' },
  SEV3: { bg: '#DBEAFE', text: '#1E40AF' },
  SEV4: { bg: '#F1F5F9', text: '#475569' },
};

export type IncidentPriority = 'P1' | 'P2' | 'P3' | 'P4';

export const PRIORITY_COLORS: Record<IncidentPriority, { bg: string; text: string }> = {
  P1: { bg: '#FEE2E2', text: '#991B1B' },
  P2: { bg: '#FEF3C7', text: '#92400E' },
  P3: { bg: '#DBEAFE', text: '#1E40AF' },
  P4: { bg: '#F1F5F9', text: '#475569' },
};

export type IncidentImpact = 'high' | 'medium' | 'low';
export type IncidentUrgency = 'high' | 'medium' | 'low';
export type SupportLevel = 'L1' | 'L2' | 'L3';
export type CommitteeStatus = 'pending' | 'approved' | 'rejected';
export type VoteStatus = 'pending' | 'approved' | 'rejected' | 'vetoed';

export type ConvertTargetType =
  | 'business_request'
  | 'epic'
  | 'feature'
  | 'story';

export type CommentType = 'comment' | 'update' | 'system' | 'workaround';

export type ChangeRequestStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type ChangeRequestType = 'standard' | 'emergency' | 'normal' | 'minor';
export type ChangeRequestRisk = 'low' | 'medium' | 'high' | 'critical';

// Legacy aliases for backward compatibility
export type SeverityLevel = IncidentSeverity;
export type PriorityLevel = IncidentPriority;
export type ImpactLevel = IncidentImpact;
export type UrgencyLevel = IncidentUrgency;
export type DeliveryStage = 'stage' | 'qa' | 'beta' | 'prod';

// ─────────────────────────────────────────────
// USER PROFILE (incident-scoped)
// ─────────────────────────────────────────────

export interface IncidentUserProfile {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string | null;
  avatar_initials?: string;
  has_veto_power?: boolean;
  incident_role?: 'user' | 'committee_member' | 'admin';
  workgroup_id?: string;
  workgroup?: Workgroup | null;
}

export interface Workgroup {
  id: string;
  name: string;
  code?: string;
  description?: string;
  support_level_default?: SupportLevel;
}

// ─────────────────────────────────────────────
// CORE INCIDENT TABLE TYPE
// ─────────────────────────────────────────────

export interface Incident {
  id: string;
  incident_key: string;
  title: string;
  description: string | null;

  status: IncidentStatus;
  severity: IncidentSeverity;
  priority: IncidentPriority;
  impact: IncidentImpact | null;
  urgency: IncidentUrgency | null;
  support_level: SupportLevel | null;
  is_major_incident: boolean;

  assignee_id: string | null;
  reporter_id: string | null;
  assignee_workgroup_id: string | null;

  project_id: string | null;
  team_id: string | null;
  owning_team_id: string | null;
  release_version_id: string | null;
  change_request_id: string | null;
  environment_id: string | null;
  business_process_id: string | null;
  committee_id: string | null;

  affected_system: string | null;
  service_component: string | null;
  incident_type: string | null;
  delivery_stage: string | null;
  requires_committee: boolean | null;

  converted_to_type: ConvertTargetType | null;
  converted_to_id: string | null;
  converted_to_key: string | null;
  converted_at: string | null;
  converted_by: string | null;
  conversion_reason: string | null;

  resolution_summary: string | null;
  resolution_type: string | null;
  root_cause: string | null;

  committee_set_at: string | null;
  committee_set_by: string | null;

  // JIRA Sync (authoritative source for production incidents)
  jira_key: string | null;            // Preserved exactly: "SENAEI-445", "MDT-223"
  jira_id: string | null;             // JIRA internal issue ID
  jira_project_key: string | null;    // "SENAEI", "MDT", "TOHAMMENA"
  jira_project_name: string | null;   // "Senaei Platform", "MDT Workflow"
  jira_project_id: string | null;     // JIRA internal project ID
  last_synced_at: string | null;      // ISO timestamp of last JIRA pull
  sync_source: 'jira' | 'manual' | 'converted';

  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  deleted_at: string | null;

  // ── Backward-compat joined fields (optional, populated when fetched with joins) ──
  assignee?: IncidentUserProfile | null;
  reporter?: IncidentUserProfile | null;
  reporter_name?: string | null;
  assignee_workgroup?: Workgroup | null;
  project?: { id: string; name: string; key: string } | null;
  release_version?: { id: string; name: string; version: string; release_date?: string | null } | null;
  change_request?: ChangeRequest | null;
  environment?: IncidentEnvironment | null;
  business_process?: BusinessProcess | null;
  committee?: IncidentCommitteeWithMembers | null;
  sla?: SlaRecord | null;
  labels?: IncidentLabelWithDef[];
  comments?: IncidentComment[];
  attachments?: IncidentAttachment[];
  history?: IncidentHistoryEntry[];
  work_items?: IncidentWorkItem[];
  watchers?: IncidentWatcher[];
  target_date?: string | null;
}

// ─────────────────────────────────────────────
// INCIDENT WITH JOINS (useIncident() return type)
// ─────────────────────────────────────────────

export interface IncidentWithJoins extends Incident {
  assignee: IncidentUserProfile | null;
  reporter: IncidentUserProfile | null;
  assignee_workgroup: Workgroup | null;
  project: { id: string; name: string; key: string } | null;
  release_version: { id: string; name: string; version: string } | null;
  change_request: ChangeRequest | null;
  environment: IncidentEnvironment | null;
  business_process: BusinessProcess | null;

  committee: IncidentCommitteeWithMembers | null;
  sla: SlaRecord | null;

  labels: IncidentLabelWithDef[];
  comments: IncidentComment[];
  attachments: IncidentAttachment[];
  history: IncidentHistoryEntry[];
  work_items: IncidentWorkItem[];
  watchers: IncidentWatcher[];
  field_values: IncidentFieldValue[];   // Dynamic JIRA custom fields
}

// ─────────────────────────────────────────────
// INCIDENT LIST VIEW (optimised for list table)
// ─────────────────────────────────────────────

export interface IncidentListItem {
  id: string;
  incident_key: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  priority: IncidentPriority;
  impact: IncidentImpact | null;
  urgency: IncidentUrgency | null;
  is_major_incident: boolean;
  support_level: SupportLevel | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;

  assignee_id: string | null;
  assignee_name: string | null;
  reporter_id: string | null;
  reporter_name: string | null;

  response_due_at: string | null;
  response_breached: boolean;
  resolution_due_at: string | null;
  resolution_breached: boolean;

  age_days: number;
  committee_status: CommitteeStatus | null;
  watcher_count: number;
  comment_count: number;
}

// ─────────────────────────────────────────────
// COMMITTEE TYPES
// ─────────────────────────────────────────────

export interface IncidentCommittee {
  id: string;
  incident_id: string;
  status: CommitteeStatus;
  required_approvals: number;
  decision_note: string | null;
  decided_at: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Backward compat — some code accesses members directly on IncidentCommittee
  members?: CommitteeMember[];
}

export interface CommitteeMember {
  id: string;
  committee_id: string;
  user_id: string;
  role: string | null;
  has_veto: boolean;
  created_at: string;
  user?: IncidentUserProfile;
  vote?: CommitteeVote;
}

export interface CommitteeVote {
  id: string;
  committee_id: string;
  member_id: string;
  vote: VoteStatus;
  comment: string | null;
  voted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentCommitteeWithMembers extends IncidentCommittee {
  members: CommitteeMember[];
  approved_count: number;
  rejected_count: number;
  pending_count: number;
  is_quorum_met: boolean;
  has_veto_cast: boolean;
}

// ─────────────────────────────────────────────
// SLA
// ─────────────────────────────────────────────

export interface SlaRecord {
  id: string;
  incident_id: string;
  response_due_at: string;
  response_met_at: string | null;
  response_breached: boolean;
  resolution_due_at: string;
  resolution_met_at: string | null;
  resolution_breached: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// JUNCTION TABLE TYPES
// ─────────────────────────────────────────────

export interface IncidentComment {
  id: string;
  incident_id: string;
  author_id: string | null;
  author_name: string | null;
  content: string;
  comment_type: CommentType;
  is_pinned: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  author?: IncidentUserProfile;
}

export interface IncidentWatcher {
  id: string;
  incident_id: string;
  user_id: string;
  created_at: string;
  user?: IncidentUserProfile;
}

export interface IncidentAttachment {
  id: string;
  incident_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
  deleted_at: string | null;
  uploader?: IncidentUserProfile;
}

export interface IncidentHistoryEntry {
  id: string;
  incident_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
  changer?: IncidentUserProfile;
}

export interface IncidentWorkItem {
  id: string;
  incident_id: string;
  work_item_type: 'epic' | 'feature' | 'story' | 'business_request';
  work_item_id: string;
  work_item_key: string;
  work_item_title: string | null;
  linked_at: string;
  linked_by: string | null;
}

export interface IncidentLabel {
  incident_id: string;
  label_id: string;
  created_at: string;
}

export interface IncidentLabelDef {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface IncidentLabelWithDef {
  incident_id: string;
  label_id: string;
  label: IncidentLabelDef;
}

// ─────────────────────────────────────────────
// JIRA CUSTOM FIELD VALUES (dynamic columns)
// ─────────────────────────────────────────────

export type IncidentFieldType = 'text' | 'number' | 'date' | 'user' | 'option' | 'url';

export interface IncidentFieldValue {
  id: string;
  incident_id: string;
  field_key: string;      // JIRA key: "customfield_10001"
  field_label: string;    // Human label: "Affected Region"
  field_value: string | null;
  field_type: IncidentFieldType;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// NEW ENTITY TYPES
// ─────────────────────────────────────────────

export interface BusinessProcess {
  id: string;
  name: string;
  name_en?: string;
  name_ar?: string;
  code: string;
  description: string | null;
  owner_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IncidentEnvironment {
  id: string;
  name: string;
  code: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChangeRequest {
  id: string;
  change_key: string;
  title: string;
  description: string | null;
  status: ChangeRequestStatus;
  change_type: ChangeRequestType;
  risk_level: ChangeRequestRisk;
  release_id: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  owner_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  release?: { id: string; name: string; version: string } | null;
  owner?: IncidentUserProfile | null;
}

// ─────────────────────────────────────────────
// FORM INPUT TYPES
// ─────────────────────────────────────────────

export interface CreateIncidentInput {
  title: string;
  description?: string;
  severity: IncidentSeverity;
  impact: IncidentImpact;
  urgency: IncidentUrgency;
  support_level?: SupportLevel;
  reporter_id?: string;
  assignee_id?: string;
  assignee_workgroup_id?: string;
  project_id?: string;
  team_id?: string;
  owning_team_id?: string;
  release_version_id?: string;
  change_request_id?: string;
  environment_id?: string;
  business_process_id?: string;
  affected_system?: string;
  service_component?: string;
  incident_type?: string;
}

export interface UpdateIncidentInput extends Partial<CreateIncidentInput> {
  status?: IncidentStatus;
  resolution_summary?: string;
  resolution_type?: string;
  root_cause?: string;
  target_date?: string;
  delivery_stage?: string;
  requires_committee?: boolean;
}

export interface ConvertIncidentInput {
  incident_id: string;
  convert_to: ConvertTargetType;
  reason: string;
}

export interface SubmitVoteInput {
  committee_id: string;
  vote: 'approved' | 'rejected' | 'vetoed';
  comment?: string;
}

export interface ResolutionInput {
  resolution_summary: string;
  resolution_type: string;
  root_cause?: string;
}

// ─────────────────────────────────────────────
// STATUS TRANSITION MAP
// ─────────────────────────────────────────────

export const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open:         ['triage', 'resolved'],
  triage:       ['in_progress', 'resolved', 'to_committee'],
  to_committee: ['in_progress', 'triage'],
  in_progress:  ['resolved'],
  resolved:     ['closed', 'in_progress'],
  closed:       [],
  converted:    [],
};

// ─────────────────────────────────────────────
// COMMITTEE QUEUE VIEW TYPE
// ─────────────────────────────────────────────

export interface CommitteeQueueItem {
  incident_id: string;
  incident_key: string;
  title: string;
  severity: IncidentSeverity;
  is_major_incident: boolean;
  committee_id: string;
  committee_status: CommitteeStatus;
  required_approvals: number;
  due_date: string | null;
  committee_created_at: string;
  approved_count: number;
  rejected_count: number;
  total_members: number;
  age_hours: number;
}

// ─────────────────────────────────────────────
// BACKWARD COMPAT ALIASES & MISSING EXPORTS
// ─────────────────────────────────────────────

/** @deprecated Use IncidentHistoryEntry */
export type IncidentHistory = IncidentHistoryEntry;

export interface ReleaseVersion {
  id: string;
  version: string;
  name?: string;
  release_date?: string | null;
  status?: string;
}

export interface IncidentFilters {
  status?: IncidentStatus[];
  severity?: IncidentSeverity[];
  support_level?: SupportLevel[];
  priority?: IncidentPriority[];
  assignee_workgroup_id?: string[];
  source_department_id?: string[];
  business_process_id?: string[];
  delivery_stage?: DeliveryStage[];
  release_version_id?: string;
  is_major_incident?: boolean;
  search?: string;
  assignee_id?: string;
  created_after?: string;
  created_before?: string;
}

export interface IncidentFormData {
  title: string;
  description: string;
  severity: IncidentSeverity;
  impact: IncidentImpact;
  urgency: IncidentUrgency;
  support_level?: SupportLevel;
  reporter_id?: string;
  assignee_id?: string;
  assignee_workgroup_id?: string;
  project_id?: string;
  team_id?: string;
  owning_team_id?: string;
  release_version_id?: string;
  change_request_id?: string;
  environment_id?: string;
  business_process_id?: string;
  affected_system?: string;
  service_component?: string;
  incident_type?: string;
  delivery_stage?: string;
  is_major_incident?: boolean;
  target_date?: string;
  reporter_name?: string;
}

export interface IncidentTeam {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  key?: string;
}
