// IncidentHub — TypeScript Interfaces (Stage A)

export type IncidentSeverity = 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';

export type IncidentPriority = 'P1' | 'P2' | 'P3' | 'P4';

export type IncidentStatus = 'TRIAGE' | 'IN_PROGRESS' | 'IN_REVIEW' | 'ON_HOLD' | 'RESOLVED';

export type IncidentEnvironment = 'PRODUCTION' | 'STAGING' | 'DEV';

export type VoteChoice = 'APPROVE' | 'REJECT' | 'ABSTAIN';

export interface Incident {
  id: string;
  jira_key: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  priority: IncidentPriority;
  status: IncidentStatus;
  project_id: string;
  environment: IncidentEnvironment;
  business_process: string | null;
  change_request_key: string | null;
  release_version: string | null;
  reporter_id: string;
  assignee_id: string | null;
  sla_deadline: string; // ISO timestamp
  impact_score: number; // 0–100
  users_affected: number;
  war_room_active: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentComment {
  id: string;
  incident_id: string;
  author_id: string;
  comment_type: 'COMMENT' | 'UPDATE' | 'ESCALATION' | 'RCA';
  body: string;
  created_at: string;
}

export interface CommitteeVote {
  id: string;
  incident_id: string;
  member_id: string;
  choice: VoteChoice | null;
  voted_at: string | null;
  is_chair: boolean;
  has_veto: boolean;
}

export interface IncidentHistory {
  id: string;
  incident_id: string;
  actor_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface IncidentLinkedItem {
  id: string;
  incident_id: string;
  item_type: 'BUG' | 'TASK' | 'STORY' | 'EPIC' | 'CHANGE';
  item_key: string;
  item_title: string;
  link_type: 'caused_by' | 'related_to' | 'blocks' | 'duplicates';
  item_status: IncidentStatus | string;
}
