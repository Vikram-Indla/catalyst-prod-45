/**
 * CATALYST TESTS - Test Case Creation Types
 * Enhanced types for comprehensive test case creation with 6-tab modal
 */

export interface TestCaseStep {
  id?: string;
  case_id?: string;
  case_version: number;
  step_number: number;
  step_type: 'action' | 'validation' | 'precondition';
  description: string;
  expected_result?: string;
  test_data?: string;
  attachment_urls?: string[];
  is_bdd: boolean;
  bdd_keyword?: 'Given' | 'When' | 'Then' | 'And' | 'But';
}

export interface TestCaseParameter {
  id?: string;
  case_id?: string;
  parameter_name: string;
  parameter_type: 'string' | 'number' | 'boolean' | 'date';
  description?: string;
}

export interface TestCaseDataset {
  id?: string;
  case_id?: string;
  dataset_name: string;
  parameter_values: Record<string, any>;
  is_active: boolean;
}

export interface WorkItemLink {
  id?: string;
  case_id?: string;
  work_item_id: string;
  work_item_type: string;
  work_item_key?: string;
  work_item_title?: string;
}

export interface CaseAttachment {
  file: File;
  preview?: string;
  uploaded?: boolean;
  url?: string;
}

export interface CreateTestCaseRequest {
  title: string;
  objective?: string;
  preconditions?: string;
  folder_id?: string;
  status: 'draft' | 'under_review' | 'published' | 'deprecated';
  priority: 'low' | 'medium' | 'high' | 'critical';
  owner_id?: string;
  component?: string;
  release?: string;
  case_type: string;
  estimated_effort?: number;
  labels?: string[];
  automation_status?: string;
  automation_owner_id?: string;
  automation_key?: string;
  program_id?: string;
  test_type?: 'manual' | 'automated' | 'bdd';
}

export interface AIGenerateStepsRequest {
  title: string;
  objective?: string;
  case_type?: string;
}

export interface AIGenerateStepsResponse {
  steps: Array<{
    description: string;
    expected_result: string;
  }>;
}

export interface TestCaseVersion {
  id: string;
  case_id: string;
  version: number;
  title: string;
  objective?: string;
  preconditions?: string;
  change_summary?: string;
  created_by: string;
  created_at: string;
}

export type TabType = 'details' | 'requirements' | 'attachments' | 'automation' | 'steps' | 'data';

export interface CreateCaseFormData {
  // Details Tab
  title: string;
  objective?: string;
  preconditions?: string;
  folder_id?: string;
  status: 'draft' | 'under_review' | 'published' | 'deprecated';
  priority: 'low' | 'medium' | 'high' | 'critical';
  owner_id?: string;
  component?: string;
  release?: string;
  case_type: string;
  estimated_effort?: number;
  labels?: string[];
  
  // Automation Tab
  automation_status: string;
  automation_owner_id?: string;
  automation_key?: string;
  automation_framework?: string;
  automation_notes?: string;
  
  // Steps Tab
  step_format: 'classic' | 'bdd';
  steps: TestCaseStep[];
  
  // Data Tab
  parameters: TestCaseParameter[];
  datasets: TestCaseDataset[];
  
  // Requirements Tab
  work_item_links: WorkItemLink[];
  
  // Attachments Tab
  attachments: CaseAttachment[];
}
