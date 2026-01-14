/**
 * Type definitions for Add Tests to Cycle workflow
 */

export interface TestCase {
  id: string;
  test_case_id: string; // TC-XXX format
  title: string;
  module: string;
  test_type: 'functional' | 'integration' | 'e2e' | 'performance';
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimated_duration_minutes: number | null;
  automation_status: 'automated' | 'manual' | 'partial';
  created_at: string;
  alreadyInCycle?: boolean;
}

export interface TestCaseFilters {
  search: string;
  module: string | null;
  testType: string | null;
  priority: string | null;
  automationStatus: string | null;
  hideAlreadyAdded: boolean;
}

export interface AddTestsParams {
  cycleId: string;
  testCaseIds: string[];
  assigneeId: string | null;
  priority: string | null;
  dueDate: string | null;
  useSmartAssignment: boolean;
}

export interface TeamMember {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export interface TestsByModule {
  module: string;
  tests: TestCase[];
  isExpanded: boolean;
}
