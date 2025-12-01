export type ParameterType = 'string' | 'number' | 'boolean' | 'date';

export interface TestParameter {
  id: string;
  test_case_id: string;
  parameter_name: string;
  parameter_type: ParameterType;
  created_at: string;
  updated_at: string;
}

export interface TestDataRow {
  id: string;
  test_case_id: string;
  row_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ParameterizedExecution {
  execution_id: string;
  data_row_id: string;
  status: 'passed' | 'failed' | 'blocked' | 'not_executed';
  result: string;
  executed_at: string;
}

export interface CreateParameterInput {
  test_case_id: string;
  parameter_name: string;
  parameter_type: ParameterType;
}

export interface UpdateParameterInput {
  parameter_name?: string;
  parameter_type?: ParameterType;
}

export interface CreateDataRowInput {
  test_case_id: string;
  row_data: Record<string, any>;
}

export interface UpdateDataRowInput {
  row_data: Record<string, any>;
}

export interface CSVImportData {
  headers: string[];
  rows: Record<string, any>[];
}
