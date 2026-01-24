/**
 * Hook for fetching test cases within a cycle - WIRED TO SUPABASE
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CycleTestCase {
  id: string;
  testCaseId: string;
  caseKey: string;
  title: string;
  description: string | null;
  status: 'not_started' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';
  priority: 'critical' | 'high' | 'medium' | 'low';
  // Canonical assignee fields (matching TMCycleScope/TMDefect pattern)
  assigned_to: string | null;
  assignee: { id: string; full_name: string; avatar_url?: string } | null;
  dueDate: string | null;
  executedAt: string | null;
  executedBy: string | null;
  executionTime: number | null;
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

// Map DB status to UI status
function mapExecutionStatus(dbStatus: string | null): CycleTestCase['status'] {
  const statusMap: Record<string, CycleTestCase['status']> = {
    'not_run': 'not_started',
    'in_progress': 'in_progress',
    'passed': 'passed',
    'failed': 'failed',
    'blocked': 'blocked',
    'skipped': 'skipped',
  };
  return statusMap[dbStatus || 'not_run'] || 'not_started';
}

// Map DB priority to UI priority
function mapPriority(dbPriority: string | null): CycleTestCase['priority'] {
  const priorityMap: Record<string, CycleTestCase['priority']> = {
    'critical': 'critical',
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
  };
  return priorityMap[dbPriority?.toLowerCase() || 'medium'] || 'medium';
}

export function useCycleTestCases(cycleId: string, filters?: TestCaseFilters) {
  const query = useQuery({
    queryKey: ['cycle-test-cases', cycleId, filters],
    queryFn: async (): Promise<CycleTestCase[]> => {
      // Build query for cycle scope with test case details
      let scopeQuery = supabase
        .from('tm_cycle_scope')
        .select(`
          id,
          test_case_id,
          current_status,
          assigned_to,
          sort_order,
          test_case:tm_test_cases(
            id,
            case_key,
            title,
            description,
            priority:tm_case_priorities(name),
            folder:tm_folders(name)
          ),
          assignee:profiles(id, full_name, avatar_url)
        `)
        .eq('cycle_id', cycleId)
        .order('sort_order', { ascending: true });

      // Apply status filter - cast to valid enum value
      if (filters?.status) {
        const statusMap: Record<string, string> = {
          'not_started': 'not_run',
          'in_progress': 'in_progress',
          'passed': 'passed',
          'failed': 'failed',
          'blocked': 'blocked',
          'skipped': 'skipped',
        };
        const dbStatus = statusMap[filters.status] || filters.status;
        scopeQuery = scopeQuery.eq('current_status', dbStatus as 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped');
      }

      // Apply assignee filter
      if (filters?.assigneeId) {
        if (filters.assigneeId === 'unassigned') {
          scopeQuery = scopeQuery.is('assigned_to', null);
        } else {
          scopeQuery = scopeQuery.eq('assigned_to', filters.assigneeId);
        }
      }

      const { data: scopeData, error: scopeError } = await scopeQuery;

      if (scopeError) {
        console.error('Error fetching cycle test cases:', scopeError);
        throw scopeError;
      }

      // Get latest run results for each scope item
      const scopeIds = (scopeData || []).map((s: any) => s.id);
      let runResults: Record<string, any> = {};
      
      if (scopeIds.length > 0) {
        const { data: runs } = await supabase
          .from('tm_test_runs')
          .select('id, cycle_scope_id, status, completed_at, executed_by, duration_seconds')
          .in('cycle_scope_id', scopeIds)
          .order('completed_at', { ascending: false });

        // Keep only latest run per scope
        (runs || []).forEach((run: any) => {
          if (!runResults[run.cycle_scope_id]) {
            runResults[run.cycle_scope_id] = run;
          }
        });
      }

      // Map to UI format
      let testCases: CycleTestCase[] = (scopeData || []).map((scope: any) => {
        const testCase = scope.test_case;
        const run = runResults[scope.id];
        const assigneeProfile = scope.assignee;
        
        return {
          id: scope.id,
          testCaseId: scope.test_case_id,
          caseKey: testCase?.case_key || 'TC-???',
          title: testCase?.title || 'Unknown Test Case',
          description: testCase?.description || null,
          status: mapExecutionStatus(scope.current_status),
          priority: mapPriority(testCase?.priority?.name),
          // Canonical assignee fields (matching TMCycleScope/TMDefect pattern)
          assigned_to: scope.assigned_to,
          assignee: assigneeProfile ? {
            id: assigneeProfile.id,
            full_name: assigneeProfile.full_name || 'Unknown',
            avatar_url: assigneeProfile.avatar_url,
          } : null,
          dueDate: null, // No due_date column
          executedAt: run?.completed_at || null,
          executedBy: run?.executed_by || null,
          executionTime: run?.duration_seconds ? Math.ceil(run.duration_seconds / 60) : null,
          module: testCase?.folder?.name || null,
          blockedReason: null,
          linkedDefectId: null,
          linkedDefectKey: null,
        };
      });

      // Apply client-side filters
      if (filters?.priority) {
        testCases = testCases.filter(tc => tc.priority === filters.priority);
      }

      if (filters?.search) {
        const search = filters.search.toLowerCase();
        testCases = testCases.filter(tc => 
          tc.title.toLowerCase().includes(search) ||
          tc.caseKey.toLowerCase().includes(search)
        );
      }

      return testCases;
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
