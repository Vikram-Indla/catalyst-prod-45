/**
 * Hook for fetching test cases within a cycle
 */

import { useQuery } from '@tanstack/react-query';

export interface CycleTestCase {
  id: string;
  testCaseId: string;
  caseKey: string;
  title: string;
  description: string | null;
  status: 'not_started' | 'in_progress' | 'passed' | 'failed' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  dueDate: string | null;
  executedAt: string | null;
  executedBy: string | null;
  executionTime: number | null; // minutes
  module: string | null;
  blockedReason: string | null;
  linkedDefectId: string | null;
  linkedDefectKey: string | null;
}

interface TestCaseFilters {
  status?: string | null;
  assigneeId?: string | null;
  priority?: string | null;
  search?: string | null;
}

export function useCycleTestCases(cycleId: string, filters?: TestCaseFilters) {
  const query = useQuery({
    queryKey: ['cycle-test-cases', cycleId, filters],
    queryFn: async (): Promise<CycleTestCase[]> => {
      // Mock data - will be replaced with real Supabase query
      const mockTestCases: CycleTestCase[] = [
        {
          id: 'ctc-001',
          testCaseId: 'tc-001',
          caseKey: 'TC-001',
          title: 'User login with valid credentials',
          description: 'Verify user can log in with correct username and password',
          status: 'passed',
          priority: 'critical',
          assigneeId: 'user-001',
          assigneeName: 'Ahmed S.',
          assigneeAvatar: null,
          dueDate: '2024-01-15',
          executedAt: '2024-01-14T10:30:00Z',
          executedBy: 'user-001',
          executionTime: 5,
          module: 'Authentication',
          blockedReason: null,
          linkedDefectId: null,
          linkedDefectKey: null,
        },
        {
          id: 'ctc-002',
          testCaseId: 'tc-002',
          caseKey: 'TC-002',
          title: 'Password reset email delivery',
          description: 'Verify password reset email is sent correctly',
          status: 'failed',
          priority: 'high',
          assigneeId: 'user-002',
          assigneeName: 'Sara M.',
          assigneeAvatar: null,
          dueDate: '2024-01-15',
          executedAt: '2024-01-14T11:00:00Z',
          executedBy: 'user-002',
          executionTime: 8,
          module: 'Authentication',
          blockedReason: null,
          linkedDefectId: 'def-001',
          linkedDefectKey: 'DEF-001',
        },
        {
          id: 'ctc-003',
          testCaseId: 'tc-003',
          caseKey: 'TC-003',
          title: 'Two-factor authentication setup',
          description: 'Verify 2FA can be configured properly',
          status: 'blocked',
          priority: 'high',
          assigneeId: 'user-001',
          assigneeName: 'Ahmed S.',
          assigneeAvatar: null,
          dueDate: '2024-01-16',
          executedAt: null,
          executedBy: null,
          executionTime: null,
          module: 'Authentication',
          blockedReason: 'SMS service unavailable in staging',
          linkedDefectId: null,
          linkedDefectKey: null,
        },
        {
          id: 'ctc-004',
          testCaseId: 'tc-004',
          caseKey: 'TC-004',
          title: 'User profile update',
          description: 'Verify user can update profile information',
          status: 'in_progress',
          priority: 'medium',
          assigneeId: 'user-003',
          assigneeName: 'Omar K.',
          assigneeAvatar: null,
          dueDate: '2024-01-16',
          executedAt: null,
          executedBy: null,
          executionTime: null,
          module: 'User Management',
          blockedReason: null,
          linkedDefectId: null,
          linkedDefectKey: null,
        },
        {
          id: 'ctc-005',
          testCaseId: 'tc-005',
          caseKey: 'TC-005',
          title: 'Dashboard data refresh',
          description: 'Verify dashboard refreshes data correctly',
          status: 'not_started',
          priority: 'medium',
          assigneeId: 'user-002',
          assigneeName: 'Sara M.',
          assigneeAvatar: null,
          dueDate: '2024-01-17',
          executedAt: null,
          executedBy: null,
          executionTime: null,
          module: 'Dashboard',
          blockedReason: null,
          linkedDefectId: null,
          linkedDefectKey: null,
        },
        {
          id: 'ctc-006',
          testCaseId: 'tc-006',
          caseKey: 'TC-006',
          title: 'Report export to PDF',
          description: 'Verify reports can be exported to PDF format',
          status: 'not_started',
          priority: 'low',
          assigneeId: null,
          assigneeName: null,
          assigneeAvatar: null,
          dueDate: '2024-01-18',
          executedAt: null,
          executedBy: null,
          executionTime: null,
          module: 'Reports',
          blockedReason: null,
          linkedDefectId: null,
          linkedDefectKey: null,
        },
      ];

      // Apply filters
      let filtered = mockTestCases;
      if (filters?.status) {
        filtered = filtered.filter(tc => tc.status === filters.status);
      }
      if (filters?.assigneeId) {
        filtered = filtered.filter(tc => tc.assigneeId === filters.assigneeId);
      }
      if (filters?.priority) {
        filtered = filtered.filter(tc => tc.priority === filters.priority);
      }
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(tc => 
          tc.title.toLowerCase().includes(search) ||
          tc.caseKey.toLowerCase().includes(search)
        );
      }

      return filtered;
    },
    enabled: !!cycleId,
    staleTime: 30000,
  });

  return {
    testCases: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
