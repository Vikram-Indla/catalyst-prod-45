// ══════════════════════════════════════════════════════════════════════════════
// REQUIREMENTS TRACEABILITY - TYPE DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export type RequirementType = 'epic' | 'feature' | 'story' | 'task' | 'bug' | 'improvement';
export type RequirementStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type RequirementPriority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';
export type LinkType = 'covers' | 'verifies' | 'validates';
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// Core Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Requirement {
  id: string;
  project_id: string;
  requirement_key: string;
  title: string;
  description: string | null;
  type: RequirementType;
  status: RequirementStatus;
  priority: RequirementPriority | null;
  parent_id: string | null;
  sort_order: number;
  external_id: string | null;
  external_key: string | null;
  external_url: string | null;
  external_type: string | null;
  owner_id: string | null;
  labels: string[];
  sprint: string | null;
  release_version: string | null;
  last_synced_at: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  owner?: { id: string; full_name: string; avatar_url: string | null };
  children_count?: number;
}

export interface RequirementWithCoverage extends Requirement {
  linked_tests_count: number;
  coverage_percentage: number;
  pass_rate: number;
  has_children: boolean;
  children?: RequirementWithCoverage[];
}

export interface RequirementCreate {
  requirement_key?: string;
  title: string;
  description?: string;
  type: RequirementType;
  status?: RequirementStatus;
  priority?: RequirementPriority;
  parent_id?: string;
  owner_id?: string;
  labels?: string[];
  sprint?: string;
  release_version?: string;
}

export interface RequirementUpdate {
  title?: string;
  description?: string;
  type?: RequirementType;
  status?: RequirementStatus;
  priority?: RequirementPriority;
  parent_id?: string | null;
  owner_id?: string | null;
  labels?: string[];
  sprint?: string;
  release_version?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Links
// ─────────────────────────────────────────────────────────────────────────────

export interface RequirementTestLink {
  id: string;
  requirement_id: string;
  test_case_id: string;
  link_type: LinkType;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // Joined data
  test_case?: {
    id: string;
    test_key: string;
    title: string;
    priority: string;
    status: string;
  };
  latest_execution?: {
    status: string;
    executed_at: string;
  };
}

export interface LinkCreate {
  test_case_id: string;
  link_type?: LinkType;
  notes?: string;
}

export interface BulkLinkCreate {
  requirement_id: string;
  test_case_ids: string[];
  link_type?: LinkType;
}

// ─────────────────────────────────────────────────────────────────────────────
// Coverage
// ─────────────────────────────────────────────────────────────────────────────

export interface RequirementCoverage {
  linked_tests_count: number;
  executed_tests_count: number;
  passed_tests_count: number;
  failed_tests_count: number;
  blocked_tests_count: number;
  not_run_count: number;
  coverage_percentage: number;
  pass_rate: number;
}

export interface ProjectCoverageStats {
  project_id: string;
  total_requirements: number;
  covered_requirements: number;
  uncovered_requirements: number;
  coverage_percentage: number;
  total_linked_tests: number;
  total_test_cases: number;
  orphan_test_cases: number;
  executed_tests: number;
  passed_tests: number;
  failed_tests: number;
  blocked_tests: number;
  pass_rate: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Traceability Matrix
// ─────────────────────────────────────────────────────────────────────────────

export interface MatrixCell {
  requirement_id: string;
  test_case_id: string;
  is_linked: boolean;
  execution_status: 'passed' | 'failed' | 'blocked' | 'not_run' | null;
  executed_at: string | null;
}

export interface TraceabilityMatrix {
  requirements: Array<{
    id: string;
    key: string;
    title: string;
    type: RequirementType;
  }>;
  test_cases: Array<{
    id: string;
    key: string;
    title: string;
  }>;
  cells: MatrixCell[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Gap Analysis
// ─────────────────────────────────────────────────────────────────────────────

export interface GapAnalysis {
  uncovered_requirements: Array<{
    id: string;
    key: string;
    title: string;
    type: RequirementType;
    priority: RequirementPriority | null;
  }>;
  orphan_test_cases: Array<{
    id: string;
    key: string;
    title: string;
    priority: string;
  }>;
  failing_requirements: Array<{
    id: string;
    key: string;
    title: string;
    type: RequirementType;
    failed_tests: number;
    total_tests: number;
  }>;
  partial_coverage: Array<{
    id: string;
    key: string;
    title: string;
    type: RequirementType;
    coverage_percentage: number;
    linked_tests: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Jira Sync
// ─────────────────────────────────────────────────────────────────────────────

export interface JiraSyncHistory {
  id: string;
  project_id: string;
  sync_type: 'full' | 'incremental' | 'manual';
  sync_direction: 'import' | 'export' | 'bidirectional';
  status: 'in_progress' | 'completed' | 'failed' | 'partial';
  requirements_created: number;
  requirements_updated: number;
  requirements_deleted: number;
  links_created: number;
  errors: Array<{ code: string; message: string; item?: string }>;
  started_at: string;
  completed_at: string | null;
  triggered_by: string | null;
  duration_ms: number | null;
}

export interface JiraSyncOptions {
  project_key: string;
  issue_types?: string[];
  jql_filter?: string;
  sync_hierarchy?: boolean;
  auto_link?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Display Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const TYPE_CONFIG: Record<RequirementType, { label: string; icon: string; color: string; bgColor: string }> = {
  epic: { label: 'Epic', icon: '⚡', color: 'hsl(263, 70%, 50%)', bgColor: 'hsl(263, 100%, 95%)' },
  feature: { label: 'Feature', icon: '📦', color: 'hsl(221, 83%, 53%)', bgColor: 'hsl(214, 100%, 93%)' },
  story: { label: 'Story', icon: '📝', color: 'hsl(172, 80%, 30%)', bgColor: 'hsl(166, 100%, 90%)' },
  task: { label: 'Task', icon: '☑️', color: 'hsl(0, 0%, 32%)', bgColor: 'hsl(0, 0%, 96%)' },
  bug: { label: 'Bug', icon: '🐛', color: 'hsl(0, 72%, 51%)', bgColor: 'hsl(0, 93%, 94%)' },
  improvement: { label: 'Improvement', icon: '✨', color: 'hsl(38, 92%, 50%)', bgColor: 'hsl(48, 96%, 89%)' },
};

export const STATUS_CONFIG: Record<RequirementStatus, { label: string; color: string; bgColor: string }> = {
  backlog: { label: 'Backlog', color: 'hsl(220, 9%, 46%)', bgColor: 'hsl(220, 14%, 96%)' },
  todo: { label: 'To Do', color: 'hsl(0, 0%, 32%)', bgColor: 'hsl(0, 0%, 96%)' },
  in_progress: { label: 'In Progress', color: 'hsl(221, 83%, 53%)', bgColor: 'hsl(214, 100%, 93%)' },
  in_review: { label: 'In Review', color: 'hsl(263, 70%, 50%)', bgColor: 'hsl(263, 100%, 95%)' },
  done: { label: 'Done', color: 'hsl(172, 80%, 30%)', bgColor: 'hsl(166, 100%, 90%)' },
  cancelled: { label: 'Cancelled', color: 'hsl(0, 72%, 51%)', bgColor: 'hsl(0, 93%, 94%)' },
};

export const PRIORITY_CONFIG: Record<RequirementPriority, { label: string; color: string; bgColor: string }> = {
  highest: { label: 'Highest', color: 'hsl(0, 72%, 51%)', bgColor: 'hsl(0, 93%, 94%)' },
  high: { label: 'High', color: 'hsl(14, 90%, 50%)', bgColor: 'hsl(12, 90%, 90%)' },
  medium: { label: 'Medium', color: 'hsl(38, 92%, 50%)', bgColor: 'hsl(48, 96%, 89%)' },
  low: { label: 'Low', color: 'hsl(172, 80%, 30%)', bgColor: 'hsl(166, 100%, 90%)' },
  lowest: { label: 'Lowest', color: 'hsl(220, 9%, 46%)', bgColor: 'hsl(220, 14%, 96%)' },
};

export const COVERAGE_THRESHOLDS = {
  high: 80,
  medium: 50,
};

export function getCoverageColor(percentage: number): 'high' | 'medium' | 'low' {
  if (percentage >= COVERAGE_THRESHOLDS.high) return 'high';
  if (percentage >= COVERAGE_THRESHOLDS.medium) return 'medium';
  return 'low';
}

export function getCoverageColorClass(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return 'text-teal-600';
    case 'medium': return 'text-amber-600';
    case 'low': return 'text-red-600';
  }
}

export function getCoverageBgClass(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return 'bg-teal-500';
    case 'medium': return 'bg-amber-500';
    case 'low': return 'bg-red-500';
  }
}
