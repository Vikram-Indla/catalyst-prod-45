export type DefectStatus = 'new' | 'open' | 'in_progress' | 'fixed' | 'resolved' | 'verified' | 'closed' | 'reopened' | 'deferred';
export type DefectSeverity = 'critical' | 'high' | 'medium' | 'low';
export type DefectPriority = 'urgent' | 'high' | 'medium' | 'low';
export type DefectResolution = 'fixed' | 'wont_fix' | 'duplicate' | 'cannot_reproduce' | 'by_design' | 'deferred';
export type DefectLinkType = 'test_case' | 'execution' | 'requirement' | 'related_defect';

export interface Defect {
  id: string;
  defect_key: string;
  title: string;
  description: string | null;
  severity: DefectSeverity;
  priority: DefectPriority;
  status: DefectStatus;
  resolution: DefectResolution | null;
  assigned_to: string | null;
  reported_by: string | null;
  component: string | null;
  environment: string | null;
  affected_version: string | null;
  fixed_version: string | null;
  folder_id: string | null;
  due_date: string | null;
  steps_to_reproduce: string | null;
  expected_result: string | null;
  actual_result: string | null;
  external_id: string | null;
  external_url: string | null;
  resolved_at: string | null;
  verified_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  assignee?: { id: string; full_name: string; avatar_url: string | null } | null;
  reporter?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface DefectStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  verified: number;
  closed: number;
  deferred: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unassigned: number;
  overdue: number;
}

export interface DefectFilters {
  status?: DefectStatus[];
  severity?: DefectSeverity[];
  priority?: DefectPriority[];
  assignedTo?: string;
  search?: string;
}

export interface DefectHistoryEntry {
  id: string;
  defect_id: string;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
  changer?: { full_name: string; avatar_url: string | null } | null;
}

export interface DefectComment {
  id: string;
  defect_id: string;
  comment: string;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  creator?: { full_name: string; avatar_url: string | null } | null;
}

export interface DefectLink {
  id: string;
  defect_id: string;
  link_type: string;
  linked_id: string;
  created_by: string | null;
  created_at: string;
  // Resolved
  test_case?: { id: string; case_key: string; title: string } | null;
}
