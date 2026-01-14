/**
 * Hook to fetch test cases from repository for adding to a cycle
 */

import { useQuery } from '@tanstack/react-query';
import type { TestCase, TestCaseFilters } from '@/types/add-tests.types';

// Mock data for development
const MOCK_TEST_CASES: TestCase[] = [
  { id: '1', test_case_id: 'TC-001', title: 'User can login with valid credentials', module: 'Authentication', test_type: 'functional', priority: 'critical', estimated_duration_minutes: 15, automation_status: 'automated', created_at: '2024-01-10' },
  { id: '2', test_case_id: 'TC-002', title: 'User cannot login with invalid password', module: 'Authentication', test_type: 'functional', priority: 'critical', estimated_duration_minutes: 10, automation_status: 'automated', created_at: '2024-01-10' },
  { id: '3', test_case_id: 'TC-003', title: 'Password reset email is sent', module: 'Authentication', test_type: 'functional', priority: 'high', estimated_duration_minutes: 20, automation_status: 'manual', created_at: '2024-01-10' },
  { id: '4', test_case_id: 'TC-004', title: 'Session expires after timeout', module: 'Authentication', test_type: 'integration', priority: 'medium', estimated_duration_minutes: 25, automation_status: 'partial', created_at: '2024-01-10' },
  { id: '5', test_case_id: 'TC-005', title: 'User profile displays correctly', module: 'User Management', test_type: 'functional', priority: 'high', estimated_duration_minutes: 10, automation_status: 'automated', created_at: '2024-01-11' },
  { id: '6', test_case_id: 'TC-006', title: 'User can update profile picture', module: 'User Management', test_type: 'functional', priority: 'medium', estimated_duration_minutes: 15, automation_status: 'manual', created_at: '2024-01-11' },
  { id: '7', test_case_id: 'TC-007', title: 'Admin can create new user', module: 'User Management', test_type: 'functional', priority: 'high', estimated_duration_minutes: 20, automation_status: 'automated', created_at: '2024-01-11' },
  { id: '8', test_case_id: 'TC-008', title: 'User roles are properly enforced', module: 'User Management', test_type: 'integration', priority: 'critical', estimated_duration_minutes: 30, automation_status: 'automated', created_at: '2024-01-11' },
  { id: '9', test_case_id: 'TC-009', title: 'Dashboard loads within 2 seconds', module: 'Dashboard', test_type: 'performance', priority: 'high', estimated_duration_minutes: 15, automation_status: 'automated', created_at: '2024-01-12' },
  { id: '10', test_case_id: 'TC-010', title: 'Dashboard widgets refresh correctly', module: 'Dashboard', test_type: 'functional', priority: 'medium', estimated_duration_minutes: 10, automation_status: 'manual', created_at: '2024-01-12' },
  { id: '11', test_case_id: 'TC-011', title: 'Chart data displays accurately', module: 'Dashboard', test_type: 'integration', priority: 'high', estimated_duration_minutes: 20, automation_status: 'partial', created_at: '2024-01-12' },
  { id: '12', test_case_id: 'TC-012', title: 'Order can be created successfully', module: 'Orders', test_type: 'functional', priority: 'critical', estimated_duration_minutes: 25, automation_status: 'automated', created_at: '2024-01-13' },
  { id: '13', test_case_id: 'TC-013', title: 'Order status updates in real-time', module: 'Orders', test_type: 'e2e', priority: 'high', estimated_duration_minutes: 30, automation_status: 'automated', created_at: '2024-01-13' },
  { id: '14', test_case_id: 'TC-014', title: 'Order cancellation works correctly', module: 'Orders', test_type: 'functional', priority: 'high', estimated_duration_minutes: 15, automation_status: 'manual', created_at: '2024-01-13' },
  { id: '15', test_case_id: 'TC-015', title: 'Payment processing integration', module: 'Payments', test_type: 'integration', priority: 'critical', estimated_duration_minutes: 45, automation_status: 'automated', created_at: '2024-01-14' },
  { id: '16', test_case_id: 'TC-016', title: 'Refund is processed correctly', module: 'Payments', test_type: 'functional', priority: 'high', estimated_duration_minutes: 20, automation_status: 'manual', created_at: '2024-01-14' },
  { id: '17', test_case_id: 'TC-017', title: 'Invoice is generated after payment', module: 'Payments', test_type: 'integration', priority: 'medium', estimated_duration_minutes: 15, automation_status: 'partial', created_at: '2024-01-14' },
  { id: '18', test_case_id: 'TC-018', title: 'Report exports to PDF', module: 'Reports', test_type: 'functional', priority: 'medium', estimated_duration_minutes: 10, automation_status: 'automated', created_at: '2024-01-15' },
  { id: '19', test_case_id: 'TC-019', title: 'Report filters work correctly', module: 'Reports', test_type: 'functional', priority: 'low', estimated_duration_minutes: 15, automation_status: 'manual', created_at: '2024-01-15' },
  { id: '20', test_case_id: 'TC-020', title: 'Scheduled reports are sent', module: 'Reports', test_type: 'e2e', priority: 'medium', estimated_duration_minutes: 30, automation_status: 'automated', created_at: '2024-01-15' },
];

export function useTestRepository(
  projectId: string, 
  cycleId: string, 
  filters: TestCaseFilters
) {
  return useQuery({
    queryKey: ['test-repository', projectId, cycleId, filters],
    queryFn: async () => {
      // TODO: Replace with actual Supabase query
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      let filteredTests = [...MOCK_TEST_CASES];

      // Apply search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredTests = filteredTests.filter(tc => 
          tc.title.toLowerCase().includes(searchLower) ||
          tc.test_case_id.toLowerCase().includes(searchLower)
        );
      }

      // Apply module filter
      if (filters.module) {
        filteredTests = filteredTests.filter(tc => tc.module === filters.module);
      }

      // Apply test type filter
      if (filters.testType) {
        filteredTests = filteredTests.filter(tc => tc.test_type === filters.testType);
      }

      // Apply priority filter
      if (filters.priority) {
        filteredTests = filteredTests.filter(tc => tc.priority === filters.priority);
      }

      // Apply automation status filter
      if (filters.automationStatus) {
        filteredTests = filteredTests.filter(tc => tc.automation_status === filters.automationStatus);
      }

      // Mark some as already in cycle (mock)
      const alreadyInCycleIds = ['3', '7', '12'];
      filteredTests = filteredTests.map(tc => ({
        ...tc,
        alreadyInCycle: alreadyInCycleIds.includes(tc.id)
      }));

      // Hide already added if filter is on
      if (filters.hideAlreadyAdded) {
        filteredTests = filteredTests.filter(tc => !tc.alreadyInCycle);
      }

      return filteredTests;
    },
    enabled: !!cycleId,
  });
}

// Get unique modules for filter dropdown
export function useTestModules(projectId: string) {
  return useQuery({
    queryKey: ['test-modules', projectId],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      const modules = [...new Set(MOCK_TEST_CASES.map(tc => tc.module))];
      return modules.sort();
    },
  });
}
