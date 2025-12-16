// Incident Room Types - Database-backed

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

export interface Workgroup {
  id: string;
  name: string;
  code: string;
  description?: string;
  support_level_default?: SupportLevel;
}

export interface IncidentUserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_initials?: string;
  workgroup_id?: string;
  workgroup?: Workgroup;
  incident_role: 'user' | 'committee_member' | 'admin';
  has_veto_power: boolean;
}

export interface ReleaseVersion {
  id: string;
  version: string;
  name?: string;
  release_date?: string;
  status: 'planned' | 'active' | 'released';
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

export interface IncidentComment {
  id: string;
  incident_id: string;
  author_id?: string;
  author?: IncidentUserProfile;
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
  uploader?: IncidentUserProfile;
  created_at: string;
}

export interface IncidentHistory {
  id: string;
  incident_id: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  changed_by?: string;
  changer?: IncidentUserProfile;
  changed_at: string;
}

export interface CommitteeMember {
  id: string;
  committee_id: string;
  user_id: string;
  user?: IncidentUserProfile;
  role?: string;
  has_veto: boolean;
  vote?: CommitteeVote;
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
  incident_id?: string;
  status: CommitteeStatus;
  required_approvals: number;
  decision_note?: string;
  decided_at?: string;
  members?: CommitteeMember[];
  votes?: CommitteeVote[];
  created_at: string;
}

export interface Incident {
  id: string;
  incident_key: string;
  title: string;
  description?: string;
  status: IncidentStatus;
  severity: SeverityLevel;
  support_level?: SupportLevel;
  priority?: PriorityLevel;
  impact: ImpactLevel;
  urgency: UrgencyLevel;
  is_major_incident: boolean;
  release_version_id?: string;
  release_version?: ReleaseVersion;
  delivery_stage?: DeliveryStage;
  reporter_id?: string;
  reporter?: IncidentUserProfile;
  reporter_name?: string;
  assignee_id?: string;
  assignee?: IncidentUserProfile;
  assignee_workgroup_id?: string;
  assignee_workgroup?: Workgroup;
  target_date?: string;
  resolved_at?: string;
  requires_committee: boolean;
  committee_id?: string;
  committee?: IncidentCommittee;
  converted_to_type?: 'business_request' | 'epic' | 'feature' | 'story';
  converted_to_id?: string;
  converted_at?: string;
  conversion_reason?: string;
  labels?: IncidentLabel[];
  attachments?: IncidentAttachment[];
  comments?: IncidentComment[];
  history?: IncidentHistory[];
  sla?: SlaRecord;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// Form data for creating/updating incidents
export interface IncidentFormData {
  title: string;
  description?: string;
  severity: SeverityLevel;
  impact?: ImpactLevel;
  urgency?: UrgencyLevel;
  release_version_id?: string;
  delivery_stage?: DeliveryStage;
  assignee_id?: string;
  target_date?: string;
  is_major_incident?: boolean;
}

// Filter options for incident list
export interface IncidentFilters {
  status?: IncidentStatus[];
  severity?: SeverityLevel[];
  support_level?: SupportLevel[];
  assignee_workgroup?: string[];
  delivery_stage?: DeliveryStage[];
  release_version_id?: string;
}
