/**
 * Module 3C-2: Batch Export Types
 */

// Export Status
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Export Format
export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';

// Export Field
export interface ExportField {
  key: string;
  label: string;
  required: boolean;
  selected: boolean;
}

// Export Filter
export interface ExportFilters {
  priority: string[];
  type: string[];
  status: string[];
  search: string;
}

// Export Configuration
export interface ExportConfiguration {
  format: ExportFormat;
  fields: string[];
  filters: ExportFilters;
  testCaseIds: string[];
  options: ExportOptions;
}

// Export Options
export interface ExportOptions {
  includeHeaders: boolean;
  includeMetadata: boolean;
  dateFormat: string;
}

// Export Job
export interface ExportJob {
  id: string;
  project_id: string;
  format: ExportFormat;
  status: ExportStatus;
  file_name: string | null;
  file_size: number | null;
  file_url: string | null;
  total_records: number;
  exported_records: number;
  fields: string[];
  filters: ExportFilters;
  test_case_ids: string[];
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// Export Progress
export interface ExportProgress {
  job_id: string;
  status: ExportStatus;
  progress: number;
  format: ExportFormat;
  total_records: number;
  exported_records: number;
  file_name: string | null;
  file_size: number | null;
  file_url: string | null;
}

// Export Result
export interface ExportResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  recordCount: number;
  fieldCount: number;
  downloadUrl?: string;
}

// Wizard Step
export type WizardStep = 1 | 2 | 3;

// Wizard State
export interface ExportWizardState {
  currentStep: WizardStep;
  format: ExportFormat;
  fields: ExportField[];
  filters: ExportFilters;
  selectedTestCases: string[];
  selectAll: boolean;
  progress: number;
  status: ExportStatus;
  result: ExportResult | null;
}

// Format Definition
export interface FormatDefinition {
  id: ExportFormat;
  name: string;
  description: string;
  icon: string;
  extension: string;
}

// History Item
export interface ExportHistoryItem {
  id: string;
  format: ExportFormat;
  status: ExportStatus;
  file_name: string | null;
  file_size: number | null;
  file_url: string | null;
  total_records: number;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  is_expired: boolean;
}

// Available Formats
export const EXPORT_FORMATS: FormatDefinition[] = [
  { id: 'csv', name: 'CSV', description: 'Comma-separated values', icon: 'FileSpreadsheet', extension: '.csv' },
  { id: 'xlsx', name: 'Excel', description: 'Microsoft Excel format', icon: 'FileSpreadsheet', extension: '.xlsx' },
  { id: 'json', name: 'JSON', description: 'JavaScript Object Notation', icon: 'FileJson', extension: '.json' },
  { id: 'pdf', name: 'PDF', description: 'Portable Document Format', icon: 'FileText', extension: '.pdf' },
];

// Available Fields
export const AVAILABLE_FIELDS: ExportField[] = [
  { key: 'case_number', label: 'Case Number', required: true, selected: true },
  { key: 'title', label: 'Title', required: true, selected: true },
  { key: 'description', label: 'Description', required: false, selected: true },
  { key: 'priority', label: 'Priority', required: false, selected: true },
  { key: 'type', label: 'Type', required: false, selected: true },
  { key: 'status', label: 'Status', required: false, selected: true },
  { key: 'preconditions', label: 'Preconditions', required: false, selected: false },
  { key: 'expected_result', label: 'Expected Result', required: false, selected: false },
  { key: 'created_at', label: 'Created Date', required: false, selected: false },
  { key: 'updated_at', label: 'Updated Date', required: false, selected: false },
];

// Default Export Options
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeHeaders: true,
  includeMetadata: false,
  dateFormat: 'YYYY-MM-DD',
};

// Default Filters
export const DEFAULT_FILTERS: ExportFilters = {
  priority: [],
  type: [],
  status: [],
  search: '',
};
