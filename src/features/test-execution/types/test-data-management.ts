/**
 * Phase 5C: Test Data Management Types
 */

export interface TestDataSet {
  id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  data_type: 'json' | 'csv' | 'sql';
  data_content: Record<string, unknown> | null;
  is_sensitive: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaskingRule {
  id: string;
  name: string;
  description: string | null;
  field_pattern: string;
  masking_type: 'redact' | 'hash' | 'partial' | 'scramble';
  masking_config: MaskingConfig | null;
  is_active: boolean;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaskingConfig {
  show_first?: number;
  show_last?: number;
  mask_char?: string;
  preserve_length?: boolean;
}

export interface DataAccessAudit {
  id: string;
  data_set_id: string | null;
  user_id: string | null;
  action: 'view' | 'export' | 'modify' | 'delete';
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined fields
  data_set_name?: string;
  user_name?: string;
}

export interface TestCaseDataSet {
  id: string;
  test_case_id: string;
  data_set_id: string;
  created_at: string;
}

export interface DataSetFormData {
  name: string;
  description: string;
  data_type: 'json' | 'csv' | 'sql';
  data_content: string;
  is_sensitive: boolean;
}

export interface MaskingRuleFormData {
  name: string;
  description: string;
  field_pattern: string;
  masking_type: 'redact' | 'hash' | 'partial' | 'scramble';
  masking_config: MaskingConfig;
  priority: number;
}
