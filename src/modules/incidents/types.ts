/**
 * Incident Module Types - Per 03-DATABASE-SCHEMA spec
 */

// Status types
export type IncidentStatus = 'open' | 'triage' | 'to_committee' | 'in_progress' | 'resolved' | 'converted' | 'closed';
export type SeverityLevel = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
export type SupportLevel = 'L1' | 'L2' | 'L3';
export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';
export type ImpactLevel = 'high' | 'medium' | 'low';
export type UrgencyLevel = 'high' | 'medium' | 'low';
export type DeliveryStage = 'stage' | 'qa' | 'beta' | 'prod';
export type CommentType = 'update' | 'investigation' | 'mitigation' | 'handover' | 'decision' | 'rca' | 'system';
export type CommitteeStatus = 'pending' | 'approved' | 'rejected';
export type VoteStatus = 'pending' | 'approved' | 'rejected' | 'vetoed';
export type TestingStatus = 'not_started' | 'beta_test' | 'prod_test' | 'closed';

// Entity interfaces
export interface Workgroup {
  id: string;
  name: string;
  code: 'operations' | 'delivery';
  description?: string;
  support_level_default?: SupportLevel;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_initials?: string;
  workgroup_id?: string;
  workgroup?: Workgroup;
  role: 'user' | 'committee_member' | 'admin';
  has_veto_power: boolean;
}

export interface ReleaseVersion {
  id: string;
  version: string;
  name?: string;
  release_date?: string;
  status: 'planned' | 'active' | 'released';
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface BusinessProcess {
  id: string;
  name_en: string;
  name_ar?: string;
  active: boolean;
  sort_order: number;
}

export interface DeliveryPlatform {
  id: string;
  name: string;
  code: string;
}

export interface IncidentLabel {
  id: string;
  name: string;
  color: string;
}

export interface SlaConfig {
  id: string;
  severity: SeverityLevel;
  response_minutes: number;
  resolution_minutes: number;
}

export interface SlaRecord {
  id: string;
  incident_id: string;
  response_due_at: string;
  response_met_at?: string;
  response_breached: boolean;
  resolution_due_at: string;
  resolution_met_at?: string;
  resolution_breached: boolean;
}

export interface SlaHistoryEvent {
  id: string;
  incident_id: string;
  event_type: 'response_met' | 'response_breached' | 'resolution_met' | 'resolution_breached' | 'sla_paused' | 'sla_resumed';
  event_at: string;
  details?: string;
}

export interface IncidentComment {
  id: string;
  incident_id: string;
  author_id?: string;
  author?: UserProfile;
  author_name?: string;
  content: string;
  comment_type: CommentType;
  is_pinned: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncidentAttachment {
  id: string;
  incident_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_by?: string;
  uploader?: UserProfile;
  created_at: string;
}

export interface IncidentHistory {
  id: string;
  incident_id: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  changed_by?: string;
  changer?: UserProfile;
  changed_at: string;
}

export interface CommitteeMember {
  id: string;
  committee_id: string;
  user_id: string;
  user?: UserProfile;
  role?: string;
  has_veto: boolean;
  vote?: CommitteeVote;
  added_at: string;
}

export interface CommitteeVote {
  id: string;
  committee_id: string;
  member_id: string;
  vote: VoteStatus;
  comment?: string;
  voted_at?: string;
}

export interface IncidentCommittee {
  id: string;
  incident_id: string;
  status: CommitteeStatus;
  required_approvals: number;
  decision_note?: string;
  decided_at?: string;
  members?: CommitteeMember[];
  votes?: CommitteeVote[];
  created_at: string;
}

export interface LinkedWorkItem {
  id: string;
  incident_id: string;
  work_item_id: string;
  work_item_type: 'story' | 'feature' | 'epic' | 'task';
  work_item_key: string;
  work_item_title: string;
  linked_at: string;
  linked_by?: string;
}

// Main Incident entity
export interface Incident {
  id: string;
  incident_key: string;
  title: string;
  description?: string;
  
  // Classification
  status: IncidentStatus;
  severity: SeverityLevel;
  support_level?: SupportLevel;
  priority?: PriorityLevel;
  impact: ImpactLevel;
  urgency: UrgencyLevel;
  is_major_incident: boolean;
  
  // Release context
  release_version_id?: string;
  release_version?: ReleaseVersion;
  delivery_stage?: DeliveryStage;
  
  // Source/Context (new per spec)
  source_department_id?: string;
  source_department?: Department;
  business_process_id?: string;
  business_process?: BusinessProcess;
  delivery_platform_id?: string;
  delivery_platform?: DeliveryPlatform;
  
  // People
  reporter_id?: string;
  reporter?: UserProfile;
  reporter_name?: string;
  assignee_id?: string;
  assignee?: UserProfile;
  assignee_workgroup_id?: string;
  assignee_workgroup?: Workgroup;
  
  // Dates
  target_date?: string;
  resolved_at?: string;
  planned_deployment_date?: string;
  
  // Change management
  change_number?: string;
  testing_status?: TestingStatus;
  
  // Governance
  requires_committee: boolean;
  committee_id?: string;
  committee?: IncidentCommittee;
  
  // Conversion
  converted_to_type?: 'business_request' | 'epic' | 'feature' | 'story';
  converted_to_id?: string;
  converted_at?: string;
  conversion_reason?: string;
  
  // Related data
  labels?: IncidentLabel[];
  attachments?: IncidentAttachment[];
  comments?: IncidentComment[];
  history?: IncidentHistory[];
  sla?: SlaRecord;
  sla_history?: SlaHistoryEvent[];
  linked_work_items?: LinkedWorkItem[];
  
  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// Form data for creating incidents
export interface CreateIncidentFormData {
  title: string;
  description?: string;
  severity: SeverityLevel;
  impact: ImpactLevel;
  urgency: UrgencyLevel;
  is_major_incident: boolean;
  release_version_id: string;
  source_department_id: string;
  business_process_id: string;
  delivery_platform_id?: string;
  assignee_id?: string;
  assignee_workgroup_id?: string;
  attachments?: File[];
  linked_work_item_ids?: string[];
}

// Filter options
export interface IncidentFilters {
  status?: IncidentStatus[];
  severity?: SeverityLevel[];
  support_level?: SupportLevel[];
  priority?: PriorityLevel[];
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

// Dashboard metrics
export interface IncidentDashboardMetrics {
  open_count: number;
  major_count: number;
  sla_breached_count: number;
  l1_count: number;
  l2_count: number;
  l3_count: number;
  resolved_today: number;
  created_today: number;
  needs_attention: Incident[];
  my_queue: Incident[];
}

// Committee queue item
export interface CommitteeQueueItem {
  incident: Incident;
  committee: IncidentCommittee;
  time_waiting_hours: number; // Since approver added
  aging_hours: number; // Since incident created
  approvals_count: number;
  rejections_count: number;
  pending_count: number;
  has_veto: boolean;
}
