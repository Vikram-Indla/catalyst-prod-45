/**
 * CATALYST TESTS - React Query Hooks
 * Phase 1 of 5: Database Foundation
 * 
 * These hooks provide easy access to test management data using React Query.
 * Follow Catalyst's existing data fetching patterns.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  TestCase,
  TestFolder,
  TestStep,
  TestSet,
  TestCycle,
  TestExecution,
  TestExecutionStep,
} from '@/types/test-management';

// ============================================
// QUERY KEYS
// ============================================

export const testKeys = {
  all: ['tests'] as const,
  folders: () => [...testKeys.all, 'folders'] as const,
  folder: (id: string) => [...testKeys.folders(), id] as const,
  cases: () => [...testKeys.all, 'cases'] as const,
  case: (id: string) => [...testKeys.cases(), id] as const,
  casesByFolder: (folderId: string) => [...testKeys.cases(), 'folder', folderId] as const,
  steps: (caseId: string) => [...testKeys.case(caseId), 'steps'] as const,
  sets: () => [...testKeys.all, 'sets'] as const,
  set: (id: string) => [...testKeys.sets(), id] as const,
  setCases: (setId: string) => [...testKeys.set(setId), 'cases'] as const,
  cycles: () => [...testKeys.all, 'cycles'] as const,
  cycle: (id: string) => [...testKeys.cycles(), id] as const,
  executions: (cycleId: string) => [...testKeys.cycle(cycleId), 'executions'] as const,
  execution: (id: string) => [...testKeys.all, 'executions', id] as const,
  executionSteps: (executionId: string) => [...testKeys.execution(executionId), 'steps'] as const,
};

// ============================================
// TEST FOLDERS HOOKS
// ============================================

export function useTestFolders(teamId?: string) {
  return useQuery({
    queryKey: teamId ? [...testKeys.folders(), teamId] : testKeys.folders(),
    queryFn: async () => {
      let query = supabase
        .from('test_folders')
        .select('*')
        .order('name');
      
      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TestFolder[];
    },
  });
}

export function useTestFolder(id: string) {
  return useQuery({
    queryKey: testKeys.folder(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_folders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as TestFolder;
    },
    enabled: !!id,
  });
}

// ============================================
// TEST CASES HOOKS
// ============================================

export function useTestCases(folderId?: string) {
  return useQuery({
    queryKey: folderId ? testKeys.casesByFolder(folderId) : testKeys.cases(),
    queryFn: async () => {
      let query = supabase
        .from('test_cases')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (folderId) {
        query = query.eq('folder_id', folderId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TestCase[];
    },
  });
}

export function useTestCase(id: string) {
  return useQuery({
    queryKey: testKeys.case(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cases')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as TestCase;
    },
    enabled: !!id,
  });
}

export function useTestSteps(testCaseId: string) {
  return useQuery({
    queryKey: testKeys.steps(testCaseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_steps')
        .select('*')
        .eq('test_case_id', testCaseId)
        .order('step_order');
      
      if (error) throw error;
      return data as TestStep[];
    },
    enabled: !!testCaseId,
  });
}

// ============================================
// TEST SETS HOOKS
// ============================================

export function useTestSets(teamId?: string) {
  return useQuery({
    queryKey: teamId ? [...testKeys.sets(), teamId] : testKeys.sets(),
    queryFn: async () => {
      let query = supabase
        .from('test_sets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TestSet[];
    },
  });
}

export function useTestSet(id: string) {
  return useQuery({
    queryKey: testKeys.set(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_sets')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as TestSet;
    },
    enabled: !!id,
  });
}

// ============================================
// TEST CYCLES HOOKS
// ============================================

export function useTestCycles(sprintId?: string) {
  return useQuery({
    queryKey: sprintId ? [...testKeys.cycles(), sprintId] : testKeys.cycles(),
    queryFn: async () => {
      let query = supabase
        .from('test_cycles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (sprintId) {
        query = query.eq('sprint_id', sprintId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TestCycle[];
    },
  });
}

export function useTestCycle(id: string) {
  return useQuery({
    queryKey: testKeys.cycle(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cycles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as TestCycle;
    },
    enabled: !!id,
  });
}

// ============================================
// TEST EXECUTIONS HOOKS
// ============================================

export function useTestExecutions(cycleId: string) {
  return useQuery({
    queryKey: testKeys.executions(cycleId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_executions')
        .select(`
          *,
          test_case:test_cases(*)
        `)
        .eq('test_cycle_id', cycleId)
        .order('execution_date', { ascending: false });
      
      if (error) throw error;
      return data as TestExecution[];
    },
    enabled: !!cycleId,
  });
}

export function useTestExecution(id: string) {
  return useQuery({
    queryKey: testKeys.execution(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_executions')
        .select(`
          *,
          test_case:test_cases(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as TestExecution;
    },
    enabled: !!id,
  });
}

export function useTestExecutionSteps(executionId: string) {
  return useQuery({
    queryKey: testKeys.executionSteps(executionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_execution_steps')
        .select(`
          *,
          test_step:test_steps(*)
        `)
        .eq('test_execution_id', executionId);
      
      if (error) throw error;
      return data as TestExecutionStep[];
    },
    enabled: !!executionId,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateTestCase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (testCase: Omit<TestCase, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('test_cases')
        .insert([testCase])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testKeys.cases() });
    },
  });
}

export function useUpdateTestCase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TestCase> & { id: string }) => {
      const { data, error } = await supabase
        .from('test_cases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testKeys.case(variables.id) });
      queryClient.invalidateQueries({ queryKey: testKeys.cases() });
    },
  });
}

export function useDeleteTestCase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_cases')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testKeys.cases() });
    },
  });
}

// ============================================
// STATISTICS HOOKS
// ============================================

export function useTestCaseStatistics(folderId?: string) {
  return useQuery({
    queryKey: [...testKeys.cases(), 'statistics', folderId],
    queryFn: async () => {
      let query = supabase.from('test_cases').select('status, priority, test_type');
      
      if (folderId) {
        query = query.eq('folder_id', folderId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Calculate statistics
      const stats = {
        total: data.length,
        draft: data.filter(tc => tc.status === 'draft').length,
        approved: data.filter(tc => tc.status === 'approved').length,
        deprecated: data.filter(tc => tc.status === 'deprecated').length,
        byPriority: {
          critical: data.filter(tc => tc.priority === 'critical').length,
          high: data.filter(tc => tc.priority === 'high').length,
          medium: data.filter(tc => tc.priority === 'medium').length,
          low: data.filter(tc => tc.priority === 'low').length,
        },
        byType: {
          manual: data.filter(tc => tc.test_type === 'manual').length,
          automated: data.filter(tc => tc.test_type === 'automated').length,
          bdd: data.filter(tc => tc.test_type === 'bdd').length,
        },
      };
      
      return stats;
    },
  });
}

export function useTestExecutionStatistics(cycleId: string) {
  return useQuery({
    queryKey: [...testKeys.executions(cycleId), 'statistics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_executions')
        .select('status, execution_time_seconds')
        .eq('test_cycle_id', cycleId);
      
      if (error) throw error;
      
      const total = data.length;
      const passed = data.filter(te => te.status === 'passed').length;
      const failed = data.filter(te => te.status === 'failed').length;
      const blocked = data.filter(te => te.status === 'blocked').length;
      const skipped = data.filter(te => te.status === 'skipped').length;
      const notRun = data.filter(te => te.status === 'not_run').length;
      
      const executionTimes = data
        .filter(te => te.execution_time_seconds !== null)
        .map(te => te.execution_time_seconds as number);
      
      const averageExecutionTime = executionTimes.length > 0
        ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
        : 0;
      
      const passRate = total > 0 ? (passed / (total - notRun)) * 100 : 0;
      
      return {
        total,
        notRun,
        passed,
        failed,
        blocked,
        skipped,
        passRate: Math.round(passRate * 10) / 10,
        averageExecutionTime: Math.round(averageExecutionTime),
      };
    },
    enabled: !!cycleId,
  });
}