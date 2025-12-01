export interface ImportHistory {
  id: string;
  file_name: string;
  file_type: 'csv' | 'excel';
  total_records: number;
  imported_records: number;
  failed_records: number;
  imported_by: string;
  created_at: string;
}

export interface ImportPreviewData {
  headers: string[];
  rows: string[][];
  total_count: number;
  mapped_fields: Record<string, string>;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  folder_id?: string;
  cycle_id?: string;
  date_range?: {
    start_date: string;
    end_date: string;
  };
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

export interface ImportValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  imported_count: number;
  failed_count: number;
  errors: ImportValidationError[];
}
