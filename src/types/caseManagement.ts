/**
 * CATALYST TESTS - Case Management Types
 * Types for CRUD operations: copy, move, delete, archive, and version control
 */

export interface TestCaseVersion {
  id: string;
  case_id: string;
  version_number: number;
  title: string;
  objective?: string;
  preconditions?: string;
  status: string;
  priority: string;
  owner_id: string;
  folder_id?: string;
  component?: string;
  release?: string;
  labels?: string[];
  change_summary: string;
  created_by: string;
  created_at: string;
  snapshot_data: any;
}

export interface VersionChange {
  id: string;
  case_id: string;
  from_version: number;
  to_version: number;
  field_name: string;
  old_value: string;
  new_value: string;
  change_type: 'added' | 'modified' | 'deleted';
  changed_by: string;
  changed_at: string;
}

export interface CopyTestCaseRequest {
  source_case_id: string;
  source_version?: number;
  new_title: string;
  target_folder_id?: string;
  copy_attachments: boolean;
  copy_jira_requirements: boolean;
  copy_parameters: boolean;
}

export interface MoveTestCaseRequest {
  case_ids: string[];
  target_folder_id: string | null;
  preserve_versions: boolean;
}

export interface ArchiveTestCaseRequest {
  case_ids: string[];
  archive_reason?: string;
}

export interface DeleteTestCaseRequest {
  case_ids: string[];
  cascade_delete_executions: boolean;
  confirmation_text: string;
}

export interface RestoreTestCaseRequest {
  case_ids: string[];
  target_folder_id?: string;
}

export interface VersionComparisonResult {
  case_id: string;
  version1: number;
  version2: number;
  field_changes: VersionChange[];
  steps_diff: {
    added: any[];
    modified: any[];
    deleted: any[];
  };
}

export interface CreateVersionRequest {
  create_from_version?: number;
  change_summary?: string;
}
