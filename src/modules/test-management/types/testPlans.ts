// ══════════════════════════════════════════════════════════════════════════════
// TEST PLANS - TYPE DEFINITIONS (tm_test_plans)
// ══════════════════════════════════════════════════════════════════════════════

export type TestPlanStatus = 'draft' | 'active' | 'executing' | 'completed' | 'archived';

// ─────────────────────────────────────────────────────────────────────────────
// Core Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TestPlan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: TestPlanStatus;
  release_id: string | null;
  start_date: string | null;
  end_date: string | null;
  objectives: string | null;
  in_scope: string | null;
  out_of_scope: string | null;
  test_strategy: string | null;
  environment_requirements: string | null;
  owner_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Computed stats
  total_tests: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  skipped_count: number;
  todo_count: number;
  // Joined relations
  release?: {
    id: string;
    name: string;
    version: string;
  } | null;
  owner?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface TestPlanWithStats extends TestPlan {
  test_case_count: number;
  team_member_count: number;
  progress_percentage: number;
}

export interface PlanTestCase {
  id: string;
  plan_id: string;
  test_case_id: string;
  execution_order: number | null;
  assigned_to: string | null;
  added_at: string | null;
  // Joined relations
  test_case?: {
    id: string;
    case_key: string;
    title: string;
    status: string;
    priority_id: string | null;
    folder_id: string | null;
  } | null;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create/Update DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateTestPlanInput {
  name: string;
  description?: string;
  status?: TestPlanStatus;
  release_id?: string;
  start_date?: string;
  end_date?: string;
  objectives?: string;
  scope_in?: string;
  scope_out?: string;
  test_strategy?: string;
  environment_requirements?: string;
}

export interface UpdateTestPlanInput {
  name?: string;
  description?: string;
  status?: TestPlanStatus;
  release_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  objectives?: string;
  scope_in?: string;
  scope_out?: string;
  test_strategy?: string;
  environment_requirements?: string;
}

export interface AddTestCasesToPlanInput {
  plan_id: string;
  test_case_ids: string[];
  assigned_to?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filters
// ─────────────────────────────────────────────────────────────────────────────

export interface TestPlanFilters {
  status?: TestPlanStatus | TestPlanStatus[];
  release_id?: string;
  search?: string;
  created_by?: string;
  owner_id?: string;
  project_id?: string;
}
