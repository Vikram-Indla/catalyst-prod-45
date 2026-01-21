/**
 * Module 3C-3: Batch Update Types
 */

// Update Status
export type BatchUpdateStatus = 'pending' | 'validating' | 'executing' | 'completed' | 'failed' | 'rolled_back';

// Field Update
export interface FieldUpdate {
  field: string;
  value: string | null;
}

// Updatable Field Definition
export interface UpdatableField {
  key: string;
  label: string;
  type: 'select' | 'text' | 'boolean';
  options?: string[];
}

// Change Record
export interface ChangeRecord {
  field: string;
  old_value: string | null;
  new_value: string | null;
}

// Test Case Preview
export interface TestCasePreview {
  test_case_id: string;
  case_number: string;
  title: string;
  changes: ChangeRecord[];
}

// Batch Update Job
export interface BatchUpdateJob {
  id: string;
  project_id: string;
  status: BatchUpdateStatus;
  test_case_ids: string[];
  field_updates: Record<string, string | null>;
  total_records: number;
  updated_records: number;
  failed_records: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// Update Progress
export interface UpdateProgress {
  job_id: string;
  status: BatchUpdateStatus;
  progress: number;
  total_records: number;
  updated_records: number;
  failed_records: number;
  error_message?: string | null;
}

// Update Result
export interface UpdateResult {
  success: boolean;
  total: number;
  updated: number;
  failed: number;
  fieldsChanged: number;
}

// Wizard Step
export type UpdateWizardStep = 1 | 2 | 3 | 4;

// Wizard State
export interface UpdateWizardState {
  currentStep: UpdateWizardStep;
  selectedTestCases: string[];
  selectAll: boolean;
  fieldsToUpdate: Record<string, string | null>;
  preview: TestCasePreview[];
  progress: number;
  status: BatchUpdateStatus;
  result: UpdateResult | null;
}

// Available Updatable Fields
export const UPDATABLE_FIELDS: UpdatableField[] = [
  {
    key: 'priority',
    label: 'Priority',
    type: 'select',
    options: ['critical', 'high', 'medium', 'low'],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: ['active', 'draft', 'deprecated', 'archived'],
  },
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: ['functional', 'integration', 'security', 'performance', 'usability'],
  },
];

// Field labels for display
export const FIELD_LABELS: Record<string, string> = {
  priority: 'Priority',
  status: 'Status',
  type: 'Type',
  assignee: 'Assignee',
};
