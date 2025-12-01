export interface SharedTestStep {
  id: string;
  title: string;
  description: string;
  expected_result?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

export interface TestCaseSharedStep {
  id: string;
  test_case_id: string;
  shared_step_id: string;
  step_order: number;
  created_at: string;
  shared_step?: SharedTestStep; // Populated via JOIN
}

export interface SharedStepUsage {
  test_case_id: string;
  test_case_title: string;
  test_case_status: string;
  step_order: number;
}

export interface SharedStepWithUsage extends SharedTestStep {
  usage_details: SharedStepUsage[];
}

export interface CreateSharedStepRequest {
  title: string;
  description: string;
  expected_result?: string;
}

export interface UpdateSharedStepRequest extends CreateSharedStepRequest {
  id: string;
}

export interface SharedStepSearchParams {
  search?: string;
  sort?: 'usage_desc' | 'usage_asc' | 'title_asc' | 'title_desc' | 'recent';
  page?: number;
  limit?: number;
}
