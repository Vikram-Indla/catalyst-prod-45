/**
 * Module 4C-1: Run Case Assignments Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  RunCaseAssignment, 
  AssignmentSummary, 
  AssignmentStatus 
} from '../types/run-assignments';

interface RunAssignmentsResult {
  assignments: RunCaseAssignment[];
  summary: AssignmentSummary;
}

/**
 * Hook to fetch assignments for a run
 */
export function useRunAssignments(runId: string | null) {
  return useQuery({
    queryKey: ['run-assignments', runId],
    queryFn: async (): Promise<RunAssignmentsResult> => {
      if (!runId) return { assignments: [], summary: getEmptySummary() };
      
      const { data, error } = await (supabase.rpc as any)('tm_get_run_assignments', {
        p_run_id: runId,
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return {
        assignments: data.assignments || [],
        summary: data.summary || getEmptySummary(),
      };
    },
    enabled: !!runId,
    staleTime: 30000,
  });
}

/**
 * Hook to assign cases to a run
 */
export function useAssignCasesToRun() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      runId,
      caseIds,
      testerId,
    }: {
      runId: string;
      caseIds: string[];
      testerId?: string;
    }) => {
      const { data, error } = await (supabase.rpc as any)('tm_assign_cases_to_run', {
        p_run_id: runId,
        p_case_ids: caseIds,
        p_assigned_tester_id: testerId || null,
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['run-assignments', variables.runId] });
      queryClient.invalidateQueries({ queryKey: ['execution-run', variables.runId] });
      toast.success(`${data.assigned_count} test case(s) assigned`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign cases: ${error.message}`);
    },
  });
}

/**
 * Hook to remove cases from a run
 */
export function useRemoveCasesFromRun() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      runId,
      caseIds,
    }: {
      runId: string;
      caseIds: string[];
    }) => {
      const { data, error } = await (supabase.rpc as any)('tm_remove_cases_from_run', {
        p_run_id: runId,
        p_case_ids: caseIds,
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['run-assignments', variables.runId] });
      toast.success(`${data.removed_count} test case(s) removed`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove cases: ${error.message}`);
    },
  });
}

/**
 * Hook to update assignment status
 */
export function useUpdateAssignmentStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      assignmentId,
      status,
      notes,
      runId,
    }: {
      assignmentId: string;
      status: AssignmentStatus;
      notes?: string;
      runId: string;
    }) => {
      const { data, error } = await (supabase.rpc as any)('tm_update_assignment_status', {
        p_assignment_id: assignmentId,
        p_status: status,
        p_notes: notes || null,
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['run-assignments', variables.runId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

/**
 * Hook to bulk assign tester
 */
export function useBulkAssignTester() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      runId,
      assignmentIds,
      testerId,
    }: {
      runId: string;
      assignmentIds: string[];
      testerId: string;
    }) => {
      const { data, error } = await (supabase.rpc as any)('tm_bulk_assign_tester', {
        p_run_id: runId,
        p_assignment_ids: assignmentIds,
        p_tester_id: testerId,
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['run-assignments', variables.runId] });
      toast.success(`${data.updated_count} assignment(s) updated`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign tester: ${error.message}`);
    },
  });
}

// Helper
function getEmptySummary(): AssignmentSummary {
  return {
    total: 0,
    pending: 0,
    in_progress: 0,
    passed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
  };
}
