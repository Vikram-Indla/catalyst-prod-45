/**
 * CATALYST TESTS - Folder Actions Types
 * Phase 2B: Entity-Specific Folder Actions
 * 
 * Types for bulk operations from folders - creating Sets/Cycles from folders,
 * adding folders to existing Sets/Cycles.
 */

export interface CreateSetFromFolderRequest {
  folder_id: string;
  set_name: string;
  set_description?: string;
  parent_folder_id?: string; // For Set's folder location
  program_id: string;
  selected_case_ids?: string[]; // Optional: subset of folder cases
  case_versions?: Record<string, number>; // case_id → version number
}

export interface AddFolderToSetRequest {
  folder_id: string;
  set_ids: string[]; // Multi-select: can add to multiple sets
  program_id: string;
  target_program_id?: string; // Cross-project support
  selected_case_ids?: string[]; // Optional: subset of folder cases
}

export interface CreateCycleFromFolderRequest {
  folder_id: string;
  cycle_name: string;
  cycle_description?: string;
  start_date: string;
  end_date: string;
  release?: string; // Copied from cases if all same
  component?: string; // Copied from cases if all same
  parent_folder_id?: string; // For Cycle's folder location
  program_id: string;
  selected_case_ids?: string[]; // Optional: subset of folder cases
  case_versions?: Record<string, number>; // case_id → version number
  assign_to_case_owners?: boolean; // Auto-assign cases to their owners
  user_assignments?: Record<string, string>; // case_id → user_id
}

export interface AddFolderToCycleRequest {
  folder_id: string;
  cycle_ids: string[]; // Multi-select: can add to multiple cycles
  program_id: string;
  target_program_id?: string; // Cross-project support
  selected_case_ids?: string[]; // Optional: subset of folder cases
}

export interface FolderCaseSummary {
  total_cases: number;
  eligible_for_set: number; // Cases with "approved" status
  eligible_for_cycle: number; // Cases NOT in "draft" status
  has_consistent_release: boolean; // All cases have same Release value
  has_consistent_component: boolean; // All cases have same Component value
  common_release?: string;
  common_component?: string;
}

export interface CaseSelectionItem {
  id: string;
  case_key: string;
  title: string;
  status: string;
  priority: string;
  version?: number;
  is_eligible: boolean;
  ineligibility_reason?: string;
}

export interface UserAssignment {
  case_id: string;
  user_id: string;
}
