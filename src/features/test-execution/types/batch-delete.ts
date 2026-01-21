/**
 * Module 3C-4: Batch Delete Types
 */

// Delete Status
export type BatchDeleteStatus = 'pending' | 'validating' | 'executing' | 'completed' | 'failed';

// Delete Type
export type DeleteType = 'soft' | 'permanent';

// Dependency Info
export interface DependencyInfo {
  test_runs: number;
  test_steps: number;
  linked_defects: number;
  total_affected: number;
}

// Batch Delete Job
export interface BatchDeleteJob {
  id: string;
  project_id: string;
  status: BatchDeleteStatus;
  delete_type: DeleteType;
  test_case_ids: string[];
  total_records: number;
  deleted_records: number;
  failed_records: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// Delete Progress
export interface DeleteProgress {
  job_id: string;
  status: BatchDeleteStatus;
  progress: number;
  delete_type: DeleteType;
  total_records: number;
  deleted_records: number;
  failed_records: number;
}

// Delete Result
export interface DeleteResult {
  success: boolean;
  total: number;
  deleted: number;
  failed: number;
  deleteType: DeleteType;
  canRestore: boolean;
  expiresInDays?: number;
}

// Deleted Item
export interface DeletedItem {
  id: string;
  test_case_id: string;
  case_number: string;
  title: string;
  deleted_at: string;
  expires_at: string | null;
  days_remaining: number;
}

// Wizard Step
export type DeleteWizardStep = 1 | 2 | 3;

// Wizard State
export interface DeleteWizardState {
  currentStep: DeleteWizardStep;
  selectedTestCases: string[];
  deleteType: DeleteType;
  confirmText: string;
  dependencies: DependencyInfo | null;
  progress: number;
  status: BatchDeleteStatus;
  result: DeleteResult | null;
}

// Delete Type Option
export interface DeleteTypeOption {
  type: DeleteType;
  label: string;
  description: string;
  warning: string;
  canRestore: boolean;
}

// Delete Type Options
export const DELETE_TYPE_OPTIONS: DeleteTypeOption[] = [
  {
    type: 'soft',
    label: 'Move to Trash',
    description: 'Can be restored within 30 days',
    warning: 'Items are moved to trash and can be recovered within 30 days.',
    canRestore: true,
  },
  {
    type: 'permanent',
    label: 'Permanent Delete',
    description: 'Cannot be undone',
    warning: 'Items are permanently removed and cannot be recovered. This action is irreversible.',
    canRestore: false,
  },
];
