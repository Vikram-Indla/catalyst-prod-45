/**
 * CATALYST TESTS - Bulk Operations Types
 * Types for multi-select and bulk editing operations
 */

export interface BulkEditRequest {
  case_ids: string[];
  updates: {
    status?: string;
    priority?: string;
    owner_id?: string;
    component?: string;
    release?: string;
    folder_id?: string;
    labels?: {
      action: 'add' | 'remove' | 'replace';
      values: string[];
    };
  };
  update_mode: 'overwrite' | 'update_empty_only';
}

export interface BulkMoveRequest {
  case_ids: string[];
  target_folder_id: string | null;
  preserve_versions: boolean;
}

export interface BulkDeleteRequest {
  case_ids: string[];
  confirmation_text: string; // Must be "DELETE"
  cascade_delete_executions: boolean;
}

export interface BulkArchiveRequest {
  case_ids: string[];
  archive_reason?: string;
}

export interface BulkAddToSetRequest {
  case_ids: string[];
  set_id: string;
  use_latest_version: boolean;
}

export interface BulkAddToCycleRequest {
  case_ids: string[];
  cycle_id: string;
  assign_to_user_id?: string;
  use_latest_version: boolean;
}

export interface BulkSelectionState {
  selectedIds: Set<string>;
  selectAll: boolean;
  excludedIds: Set<string>; // When selectAll = true, these are excluded
  isEditMode: boolean;
}

export interface BulkOperationResult {
  operation_id: string;
  total_count: number;
  success_count: number;
  failure_count: number;
  errors: Array<{
    case_id: string;
    error_message: string;
  }>;
}

export interface BulkOperationProgress {
  current: number;
  total: number;
  percentage: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
