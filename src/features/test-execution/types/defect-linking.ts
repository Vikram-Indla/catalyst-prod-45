/**
 * Module 3A-4: Defect Linking & Quick Create Types
 */

// Defect Status
export type DefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';

// Defect Severity
export type DefectSeverity = 'critical' | 'major' | 'minor' | 'trivial';

// Link Type
export type DefectLinkType = 'manual' | 'auto' | 'suggested';

// User Reference
export interface UserRef {
  id: string;
  name: string;
  avatar?: string;
}

// Linked Defect (from get_linked_defects_for_step RPC)
export interface LinkedDefect {
  id: string;
  key: string;
  title: string;
  status: DefectStatus;
  severity: DefectSeverity;
  assignee?: UserRef | null;
  link_type: DefectLinkType;
  linked_at: string;
  created_at: string;
}

// Defect Search Result
export interface DefectSearchResult {
  id: string;
  key: string;
  title: string;
  status: DefectStatus;
  severity: DefectSeverity;
  assignee?: { id: string; name: string } | null;
  created_at: string;
}

// Defect Search Query
export interface DefectSearchQuery {
  query?: string;
  status?: DefectStatus[];
  limit?: number;
}

// Link Defect Input
export interface LinkDefectInput {
  defect_id: string;
  step_result_id: string;
  run_id?: string;
  link_type?: DefectLinkType;
}

// Quick Create Defect Input
export interface QuickCreateDefectInput {
  project_id: string;
  step_result_id: string;
  run_id?: string;
  title: string;
  description?: string;
  severity?: DefectSeverity;
  assigned_to?: string;
}

// Failed Step Context (for auto-population)
export interface FailedStepContext {
  step_id: string;
  step_number: number;
  action: string;
  expected_result: string;
  actual_result?: string;
  test_case: {
    id: string;
    case_number: string;
    title: string;
  };
  run?: {
    id: string;
    run_number: number;
    environment?: string;
  };
}

// Defect Suggestion
export interface DefectSuggestion {
  defect: DefectSearchResult;
  reason: string;
  confidence: number; // 0-1
}

// Status Config (for UI)
export const STATUS_CONFIG: Record<DefectStatus, { label: string; bgClass: string; textClass: string }> = {
  open: { label: 'Open', bgClass: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-700 dark:text-red-400' },
  in_progress: { label: 'In Progress', bgClass: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-700 dark:text-blue-400' },
  resolved: { label: 'Resolved', bgClass: 'bg-green-100 dark:bg-green-900/30', textClass: 'text-green-700 dark:text-green-400' },
  closed: { label: 'Closed', bgClass: 'bg-gray-100 dark:bg-gray-800', textClass: 'text-gray-600 dark:text-gray-400' },
  reopened: { label: 'Reopened', bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-700 dark:text-amber-400' },
};

// Severity Config (for UI)
export const SEVERITY_CONFIG: Record<DefectSeverity, { label: string; bgClass: string; textClass: string }> = {
  critical: { label: 'Critical', bgClass: 'bg-red-600', textClass: 'text-white' },
  major: { label: 'Major', bgClass: 'bg-orange-500', textClass: 'text-white' },
  minor: { label: 'Minor', bgClass: 'bg-yellow-500', textClass: 'text-white' },
  trivial: { label: 'Trivial', bgClass: 'bg-gray-400', textClass: 'text-white' },
};
