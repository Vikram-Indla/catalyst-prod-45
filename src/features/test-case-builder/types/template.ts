/**
 * Test Case Template Types
 * Module 5A-1: Reusable test case patterns
 */

export interface TemplateCategory {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface TemplateStep {
  order_index: number;
  action: string;
  expected_result: string;
  test_data?: string;
  notes?: string;
}

export interface TemplateData {
  objective?: string;
  preconditions?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  test_type?: 'functional' | 'regression' | 'smoke' | 'integration' | 'e2e' | 'performance' | 'security' | 'usability' | 'exploratory';
  tags?: string[];
  steps?: TemplateStep[];
}

export interface TestCaseTemplate {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  template_data: TemplateData;
  is_global: boolean;
  project_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: TemplateCategory;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category_id?: string;
  template_data: TemplateData;
  is_global?: boolean;
  project_id?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category_id?: string | null;
  template_data?: TemplateData;
  is_global?: boolean;
}

export interface TemplateFilters {
  categoryId?: string | null;
  isGlobal?: boolean;
  search?: string;
}
