/**
 * Capacity Import Wizard Types
 */

export type ImportMode = 'update' | 'rewrite';
export type InputMethod = 'csv' | 'markdown' | 'paste';

export interface ImportField {
  key: string;
  label: string;
  dbColumn: string;
  type: 'text' | 'date' | 'select' | 'number' | 'boolean';
  required: boolean;
  lookupTable?: string;
  lookupOptions?: { id: string; name: string; code?: string }[];
}

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportPreviewRow {
  data: ParsedRow;
  rowIndex: number;
  errors: ValidationError[];
  status: 'valid' | 'warning' | 'error';
}

export interface FieldMapping {
  sourceColumn: string;
  targetField: ImportField | null;
}

export interface WizardState {
  step: number;
  inputMethod: InputMethod;
  mode: ImportMode;
  rawData: string;
  parsedRows: ParsedRow[];
  fieldMappings: FieldMapping[];
  selectedFields: string[];
  previewRows: ImportPreviewRow[];
  isProcessing: boolean;
  progress: number;
  errors: ValidationError[];
}

export const WIZARD_STEPS = [
  { id: 1, label: 'Input', description: 'Choose input method' },
  { id: 2, label: 'Fields', description: 'Select fields to update' },
  { id: 3, label: 'Preview', description: 'Review changes' },
  { id: 4, label: 'Confirm', description: 'Apply changes' },
] as const;
