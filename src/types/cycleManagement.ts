/**
 * CATALYST TESTS - Enhanced Cycle Management Types
 * Comprehensive types for 12-feature cycle management system
 */

export interface CycleTemplate {
  id: string;
  name: string;
  description: string | null;
  project_id: string | null;
  is_global: boolean;
  config: CycleTemplateConfig;
  created_by: string | null;
  created_at: string;
}

export interface CycleTemplateConfig {
  environment?: string;
  auto_close_on_completion?: boolean;
  email_notifications?: boolean;
  scope_locked?: boolean;
  default_milestone?: string;
}

export interface CycleAssignment {
  id: string;
  cycle_id: string;
  case_id: string;
  assigned_to: string | null;
  sort_order: number;
  milestone: string | null;
  estimated_effort: number;
  assigned_at: string;
  assigned_by: string | null;
}

export interface CycleDependency {
  id: string;
  cycle_id: string;
  predecessor_case_id: string;
  successor_case_id: string;
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish';
  created_at: string;
}

export interface EnhancedTestCycle {
  id: string;
  key: string;
  name: string;
  objective: string | null;
  folder_id: string | null;
  program_id: string | null;
  owner_id: string | null;
  status: 'not_started' | 'active' | 'completed' | 'on_hold';
  start_date: string;
  end_date: string;
  build_version: string | null;
  environment: string;
  scope_locked: boolean;
  scope_locked_at: string | null;
  scope_locked_by: string | null;
  auto_close_on_completion: boolean;
  email_notifications: boolean;
  archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  sync_with_set: boolean;
  source_set_id: string | null;
  template_id: string | null;
  custom_fields: Record<string, any>;
  is_adhoc: boolean;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface CreateEnhancedCycleRequest {
  name: string;
  objective?: string;
  folder_id?: string | null;
  owner_id?: string;
  start_date: string;
  end_date: string;
  build_version?: string;
  environment?: string;
  program_id?: string | null;
  template_id?: string | null;
  auto_close_on_completion?: boolean;
  email_notifications?: boolean;
  scope_locked?: boolean;
  sync_with_set?: boolean;
  source_set_id?: string | null;
  custom_fields?: Record<string, any>;
  cases?: {
    case_id: string;
    version: number;
    assigned_to?: string | null;
  }[];
  sets?: string[];
}

export interface CopyCycleRequest {
  source_cycle_id: string;
  new_name: string;
  destination_folder_id?: string | null;
  copy_cases: boolean;
  copy_assignments: boolean;
  copy_execution_results: boolean;
  copy_attachments: boolean;
}

export interface MoveCycleRequest {
  cycle_ids: string[];
  target_folder_id: string | null;
}

export interface ArchiveCycleRequest {
  cycle_ids: string[];
  archive_reason: string;
}

export interface BulkAddCasesRequest {
  cycle_ids: string[];
  case_ids: string[];
  assigned_to?: string | null;
}

export interface BulkAssignCasesRequest {
  cycle_id: string;
  case_ids: string[];
  assigned_to: string;
}

export interface CyclePlanningData {
  assignments: CycleAssignment[];
  dependencies: CycleDependency[];
  total_estimated_effort: number;
  testers: {
    user_id: string;
    user_name: string;
    assigned_count: number;
    estimated_effort: number;
  }[];
}

export interface CycleImportData {
  name: string;
  objective?: string;
  start_date: string;
  end_date: string;
  environment?: string;
  cases?: string[];
}

export interface CycleExportOptions {
  format: 'xlsx' | 'csv' | 'pdf';
  include_cases: boolean;
  include_assignments: boolean;
  include_execution_results: boolean;
  include_effort_summary: boolean;
}

export const ENVIRONMENT_OPTIONS = [
  { value: 'development', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'production', label: 'Production' },
  { value: 'uat', label: 'UAT' },
] as const;

export const ARCHIVE_REASONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'obsolete', label: 'Obsolete' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'other', label: 'Other' },
] as const;

export const DEPENDENCY_TYPES = [
  { value: 'finish_to_start', label: 'Finish to Start' },
  { value: 'start_to_start', label: 'Start to Start' },
  { value: 'finish_to_finish', label: 'Finish to Finish' },
] as const;
