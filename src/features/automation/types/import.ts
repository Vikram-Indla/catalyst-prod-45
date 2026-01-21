/**
 * Module 5A-2: Result Import & Mapping - Types
 */

export type ResultStatus = 'passed' | 'failed' | 'skipped' | 'error';
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type SourceFormat = 'junit' | 'testng' | 'pytest' | 'jest' | 'mocha' | 'custom';

// Automation result
export interface AutomationResult {
  id: string;
  connector_id: string;
  test_case_id: string | null;
  external_test_id: string;
  external_test_name: string;
  status: ResultStatus;
  duration_ms: number | null;
  error_message: string | null;
  stack_trace: string | null;
  metadata: Record<string, unknown>;
  imported_at: string;
  run_timestamp: string | null;
}

// Test mapping
export interface TestMapping {
  id: string;
  connector_id: string;
  external_test_id: string;
  test_case_id: string;
  created_at: string;
}

// Import job
export interface ImportJob {
  id: string;
  connector_id: string;
  status: ImportJobStatus;
  source_file_name: string | null;
  source_format: SourceFormat | null;
  total_count: number;
  imported_count: number;
  mapped_count: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

// Unmapped test
export interface UnmappedTest {
  external_test_id: string;
  external_test_name: string;
  last_status: ResultStatus;
  run_count: number;
}

// Parsed result for import
export interface ParsedResult {
  external_test_id: string;
  external_test_name: string;
  status: ResultStatus;
  duration_ms?: number;
  error_message?: string;
  stack_trace?: string;
  metadata?: Record<string, unknown>;
  run_timestamp?: string;
}

// Source format config
export const SOURCE_FORMAT_CONFIG: Record<SourceFormat, {
  label: string;
  icon: string;
  extension: string;
  description: string;
}> = {
  junit: { label: 'JUnit XML', icon: '☕', extension: '.xml', description: 'JUnit/Surefire XML format' },
  testng: { label: 'TestNG', icon: '☕', extension: '.xml', description: 'TestNG XML reports' },
  pytest: { label: 'pytest', icon: '🐍', extension: '.xml', description: 'pytest JUnit XML' },
  jest: { label: 'Jest', icon: '🃏', extension: '.json', description: 'Jest JSON output' },
  mocha: { label: 'Mocha', icon: '☕', extension: '.json', description: 'Mocha JSON reporter' },
  custom: { label: 'Custom JSON', icon: '⚙️', extension: '.json', description: 'Custom JSON format' }
};

// Result status config
export const RESULT_STATUS_CONFIG: Record<ResultStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  passed: { label: 'Passed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
  skipped: { label: 'Skipped', variant: 'secondary' },
  error: { label: 'Error', variant: 'destructive' }
};
