/**
 * Defects Module - TypeScript Types
 * Aligned with existing database schema
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS & CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

export type DefectSeverity = 'blocker' | 'critical' | 'major' | 'minor' | 'trivial';
export type DefectPriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type DefectWorkflowStatus = 'new' | 'open' | 'in_progress' | 'in_review' | 'resolved' | 'closed' | 'reopened' | 'deferred' | 'wont_fix';
export type DefectLinkType = 'discovered_by' | 'blocks' | 'duplicates' | 'relates_to';
export type LinkedEntityType = 'test_case' | 'defect' | 'requirement';

export const SEVERITY_ORDER: Record<DefectSeverity, number> = {
  blocker: 1,
  critical: 2,
  major: 3,
  minor: 4,
  trivial: 5,
};

export const PRIORITY_ORDER: Record<DefectPriority, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
  P5: 5,
};

export const WORKFLOW_STATUS_ORDER: Record<DefectWorkflowStatus, number> = {
  new: 1,
  open: 2,
  in_progress: 3,
  in_review: 4,
  resolved: 5,
  closed: 6,
  reopened: 7,
  deferred: 8,
  wont_fix: 9,
};

// ══════════════════════════════════════════════════════════════════════════════
// CORE ENTITIES (aligned with existing defects table)
// ══════════════════════════════════════════════════════════════════════════════

export interface Defect {
  id: string;
  defect_id: string;
  defect_key: string | null;
  title: string;
  description: string | null;
  steps_to_reproduce: unknown | null;
  preconditions: string | null;
  expected_result: string;
  actual_result: string;
  
  // Classification
  severity: DefectSeverity;
  priority: DefectPriority;
  workflow_status: DefectWorkflowStatus;
  status: string | null;
  
  // Environment
  environment: string | null;
  environment_details: unknown | null;
  
  // Assignment & Ownership
  project_id: string | null;
  reporter_id: string | null;
  reported_by: string | null;
  assignee_id: string | null;
  
  // Links
  linked_story_id: string | null;
  linked_feature_id: string | null;
  duplicate_of_id: string | null;
  test_case_id: string | null;
  test_run_id: string | null;
  step_number: number | null;
  
  // Resolution
  root_cause: string | null;
  resolution: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  target_release_id: string | null;
  
  // Metadata
  due_date: string | null;
  tags: string[] | null;
  sla_target_hours: number | null;
  external_id: string | null;
  external_url: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Relations (populated by joins)
  assignee?: UserProfile | null;
  reporter?: UserProfile | null;
  comments_count?: number;
  attachments_count?: number;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string;
}

export interface DefectComment {
  id: string;
  defect_id: string;
  author_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  author?: UserProfile;
}

export interface DefectAttachment {
  id: string;
  defect_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
  uploader?: UserProfile;
}

export interface DefectAuditLog {
  id: string;
  defect_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  actor_id: string;
  acted_at: string;
  user?: UserProfile;
}

export interface DefectWorkItemLink {
  id: string;
  defect_id: string;
  linked_item_type: string;
  linked_item_id: string;
  relationship_type: string;
  created_at: string;
  created_by: string | null;
}

export interface DefectColumnPreferences {
  id: string;
  user_id: string;
  columns: string[];
  column_widths: Record<string, number>;
  created_at: string;
  updated_at: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateDefectInput {
  project_id: string;
  title: string;
  description?: string | null;
  expected_result: string;
  actual_result: string;
  severity?: DefectSeverity;
  priority?: DefectPriority;
  workflow_status?: DefectWorkflowStatus;
  environment?: string | null;
  environment_details?: unknown | null;
  preconditions?: string | null;
  steps_to_reproduce?: unknown | null;
  assignee_id?: string | null;
  test_case_id?: string | null;
  test_run_id?: string | null;
  step_number?: number | null;
  linked_story_id?: string | null;
  linked_feature_id?: string | null;
  tags?: string[] | null;
  due_date?: string | null;
  external_id?: string | null;
  external_url?: string | null;
}

export interface UpdateDefectInput {
  id: string;
  title?: string;
  description?: string | null;
  expected_result?: string;
  actual_result?: string;
  severity?: DefectSeverity;
  priority?: DefectPriority;
  workflow_status?: DefectWorkflowStatus;
  status?: string;
  environment?: string | null;
  environment_details?: unknown | null;
  preconditions?: string | null;
  steps_to_reproduce?: unknown | null;
  assignee_id?: string | null;
  root_cause?: string | null;
  resolution?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  target_release_id?: string | null;
  linked_story_id?: string | null;
  linked_feature_id?: string | null;
  duplicate_of_id?: string | null;
  tags?: string[] | null;
  due_date?: string | null;
  external_id?: string | null;
  external_url?: string | null;
}

export interface CreateDefectCommentInput {
  defect_id: string;
  content: string;
  is_internal?: boolean;
}

export interface UpdateDefectCommentInput {
  id: string;
  content: string;
}

export interface CreateDefectLinkInput {
  defect_id: string;
  work_item_type: string;
  work_item_id: string;
  link_type: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// FILTER & PAGINATION
// ══════════════════════════════════════════════════════════════════════════════

export interface DefectFilters {
  project_id: string;
  workflow_status?: DefectWorkflowStatus[];
  severity?: DefectSeverity[];
  priority?: DefectPriority[];
  assignee_id?: string | null;
  reporter_id?: string;
  environment?: string;
  tags?: string[];
  search?: string;
  created_after?: string;
  created_before?: string;
  due_before?: string;
  test_case_id?: string;
  test_run_id?: string;
}

export interface DefectSortConfig {
  field: keyof Defect | 'age';
  direction: 'asc' | 'desc';
}

export interface DefectPaginationParams {
  page: number;
  limit: number;
  sort?: DefectSortConfig;
}

export interface PaginatedDefectsResponse {
  data: Defect[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// STATISTICS & ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

export interface DefectStats {
  total: number;
  by_workflow_status: Record<string, number>;
  by_severity: Record<DefectSeverity, number>;
  by_priority: Record<DefectPriority, number>;
  open_count: number;
  resolved_count: number;
  average_age_days: number;
  oldest_open_days: number;
}

export interface DefectTrendDataPoint {
  date: string;
  opened: number;
  closed: number;
  cumulative_open: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface BulkDefectUpdate {
  ids: string[];
  changes: Partial<Pick<Defect, 'workflow_status' | 'severity' | 'priority' | 'assignee_id' | 'resolution'>>;
}

export interface BulkOperationResult {
  success: boolean;
  updated_count: number;
  failed_ids: string[];
  errors?: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export type DefectViewMode = 'table' | 'kanban' | 'detail';

export interface DefectKanbanColumn {
  status: DefectWorkflowStatus;
  title: string;
  defects: Defect[];
  count: number;
}

export const DEFAULT_COLUMNS = [
  'defect_key',
  'title', 
  'workflow_status',
  'severity',
  'priority',
  'assignee',
  'created_at',
  'age',
] as const;

export type DefectColumnId = 
  | 'defect_key'
  | 'title'
  | 'workflow_status'
  | 'severity'
  | 'priority'
  | 'assignee'
  | 'reporter'
  | 'environment'
  | 'tags'
  | 'created_at'
  | 'updated_at'
  | 'due_date'
  | 'age'
  | 'resolution';

export interface DefectColumnConfig {
  id: DefectColumnId;
  label: string;
  width: number;
  minWidth: number;
  sortable: boolean;
  visible: boolean;
}
