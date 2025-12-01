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

export const testFolderKeys = {
  all: ['test-folders'] as const,
  detail: (id: string) => [...testFolderKeys.all, id] as const,
};

export const testCaseKeys = {
  all: ['test-cases'] as const,
  detail: (id: string) => [...testCaseKeys.all, id] as const,
  byFolder: (folderId: string) => [...testCaseKeys.all, 'folder', folderId] as const,
  steps: (caseId: string) => [...testCaseKeys.all, caseId, 'steps'] as const,
};

export const testSetKeys = {
  all: ['test-sets'] as const,
  detail: (id: string) => [...testSetKeys.all, id] as const,
  cases: (setId: string) => [...testSetKeys.all, setId, 'cases'] as const,
};

export const testCycleKeys = {
  all: ['test-cycles'] as const,
  detail: (id: string) => [...testCycleKeys.all, id] as const,
};

export const testExecutionKeys = {
  all: ['test-executions'] as const,
  detail: (id: string) => [...testExecutionKeys.all, id] as const,
  byCycle: (cycleId: string) => [...testExecutionKeys.all, 'cycle', cycleId] as const,
  steps: (executionId: string) => [...testExecutionKeys.all, executionId, 'steps'] as const,
};

// ============================================
// TEST FOLDERS HOOKS
// ============================================

export function useTestFolders(teamId?: string) {
  return useQuery({
    queryKey: teamId ? [...testFolderKeys.all, teamId] : testFolderKeys.all,
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
    queryKey: testFolderKeys.detail(id),
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
    queryKey: folderId ? testCaseKeys.byFolder(folderId) : testCaseKeys.all,
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
    queryKey: testCaseKeys.detail(id),
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
    queryKey: testCaseKeys.steps(testCaseId),
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
    queryKey: teamId ? [...testSetKeys.all, teamId] : testSetKeys.all,
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
    queryKey: testSetKeys.detail(id),
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
    queryKey: sprintId ? [...testCycleKeys.all, sprintId] : testCycleKeys.all,
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
    queryKey: testCycleKeys.detail(id),
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
    queryKey: testExecutionKeys.byCycle(cycleId),
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
    queryKey: testExecutionKeys.detail(id),
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
    queryKey: testExecutionKeys.steps(executionId),
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
      queryClient.invalidateQueries({ queryKey: testCaseKeys.all });
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
      queryClient.invalidateQueries({ queryKey: testCaseKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: testCaseKeys.all });
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
      queryClient.invalidateQueries({ queryKey: testCaseKeys.all });
    },
  });
}

export function useBulkCreateTestCases() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (testCases: Omit<TestCase, 'id' | 'created_at' | 'updated_at'>[]) => {
      const { data, error } = await supabase
        .from('test_cases')
        .insert(testCases)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testCaseKeys.all });
    },
  });
}

export function useLinkTestCaseToWorkItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      testCaseId, 
      workItemType, 
      workItemId 
    }: { 
      testCaseId: string; 
      workItemType: string; 
      workItemId: string;
    }) => {
      const { data, error } = await supabase
        .from('test_cases')
        .update({ 
          linked_work_item_type: workItemType, 
          linked_work_item_id: workItemId 
        })
        .eq('id', testCaseId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: testCaseKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: testCaseKeys.all });
    },
  });
}

// ==========================================
// MUTATION HOOKS - TestFolder
// ==========================================

export function useCreateTestFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (folder: Omit<TestFolder, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('test_folders')
        .insert([folder])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testFolderKeys.all });
    },
  });
}

export function useUpdateTestFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TestFolder> & { id: string }) => {
      const { data, error } = await supabase
        .from('test_folders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: testFolderKeys.all });
      queryClient.invalidateQueries({ queryKey: testFolderKeys.detail(data.id) });
    },
  });
}

export function useDeleteTestFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_folders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testFolderKeys.all });
    },
  });
}

export function useMoveTestFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ folderId, newParentId }: { folderId: string; newParentId: string | null }) => {
      const { data, error } = await supabase
        .from('test_folders')
        .update({ parent_folder_id: newParentId })
        .eq('id', folderId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testFolderKeys.all });
    },
  });
}

// ==========================================
// MUTATION HOOKS - TestStep
// ==========================================

export function useCreateTestStep() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (step: Omit<TestStep, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('test_steps')
        .insert([step])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: testCaseKeys.steps(data.test_case_id) });
    },
  });
}

export function useUpdateTestStep() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, testCaseId, ...updates }: Partial<TestStep> & { id: string; testCaseId: string }) => {
      const { data, error } = await supabase
        .from('test_steps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testCaseKeys.steps(variables.testCaseId) });
    },
  });
}

export function useDeleteTestStep() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, testCaseId }: { id: string; testCaseId: string }) => {
      const { error } = await supabase
        .from('test_steps')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testCaseKeys.steps(variables.testCaseId) });
    },
  });
}

export function useReorderTestSteps() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      testCaseId, 
      steps 
    }: { 
      testCaseId: string; 
      steps: { id: string; step_order: number }[];
    }) => {
      const updates = steps.map(step => 
        supabase
          .from('test_steps')
          .update({ step_order: step.step_order })
          .eq('id', step.id)
      );
      
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) throw errors[0].error;
      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testCaseKeys.steps(variables.testCaseId) });
    },
  });
}

// ==========================================
// MUTATION HOOKS - TestSet
// ==========================================

export function useCreateTestSet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (testSet: Omit<TestSet, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('test_sets')
        .insert([testSet])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testSetKeys.all });
    },
  });
}

export function useUpdateTestSet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TestSet> & { id: string }) => {
      const { data, error } = await supabase
        .from('test_sets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: testSetKeys.all });
      queryClient.invalidateQueries({ queryKey: testSetKeys.detail(data.id) });
    },
  });
}

export function useDeleteTestSet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_sets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testSetKeys.all });
    },
  });
}

export function useAddTestCasesToSet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      testSetId, 
      testCaseIds 
    }: { 
      testSetId: string; 
      testCaseIds: string[];
    }) => {
      const associations = testCaseIds.map(testCaseId => ({
        test_set_id: testSetId,
        test_case_id: testCaseId,
      }));
      
      const { data, error } = await supabase
        .from('test_set_cases')
        .insert(associations)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testSetKeys.detail(variables.testSetId) });
    },
  });
}

export function useRemoveTestCaseFromSet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      testSetId, 
      testCaseId 
    }: { 
      testSetId: string; 
      testCaseId: string;
    }) => {
      const { error } = await supabase
        .from('test_set_cases')
        .delete()
        .eq('test_set_id', testSetId)
        .eq('test_case_id', testCaseId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testSetKeys.detail(variables.testSetId) });
    },
  });
}

// ==========================================
// MUTATION HOOKS - TestCycle
// ==========================================

export function useCreateTestCycle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cycle: Omit<TestCycle, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('test_cycles')
        .insert([cycle])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testCycleKeys.all });
    },
  });
}

export function useUpdateTestCycle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TestCycle> & { id: string }) => {
      const { data, error } = await supabase
        .from('test_cycles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: testCycleKeys.all });
      queryClient.invalidateQueries({ queryKey: testCycleKeys.detail(data.id) });
    },
  });
}

export function useDeleteTestCycle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_cycles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testCycleKeys.all });
    },
  });
}

// ==========================================
// MUTATION HOOKS - TestExecution
// ==========================================

export function useCreateTestExecution() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (execution: Omit<TestExecution, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('test_executions')
        .insert([execution])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: testExecutionKeys.byCycle(data.test_cycle_id) });
      queryClient.invalidateQueries({ queryKey: testExecutionKeys.detail(data.id) });
    },
  });
}

export function useUpdateTestExecution() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, cycleId, ...updates }: Partial<TestExecution> & { id: string; cycleId: string }) => {
      const { data, error } = await supabase
        .from('test_executions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testExecutionKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: testExecutionKeys.byCycle(variables.cycleId) });
    },
  });
}

export function useDeleteTestExecution() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, cycleId }: { id: string; cycleId: string }) => {
      const { error } = await supabase
        .from('test_executions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testExecutionKeys.byCycle(variables.cycleId) });
    },
  });
}

export function useRecordTestExecutionSteps() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      executionId, 
      steps 
    }: { 
      executionId: string; 
      steps: Omit<TestExecutionStep, 'id' | 'created_at' | 'updated_at'>[];
    }) => {
      const stepsWithExecutionId = steps.map(step => ({
        ...step,
        test_execution_id: executionId,
      }));
      
      const { data, error } = await supabase
        .from('test_execution_steps')
        .insert(stepsWithExecutionId)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testExecutionKeys.steps(variables.executionId) });
    },
  });
}

// ============================================
// STATISTICS HOOKS
// ============================================

export function useTestCaseStatistics(folderId?: string) {
  return useQuery({
    queryKey: [...testCaseKeys.all, 'statistics', folderId],
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
    queryKey: [...testExecutionKeys.byCycle(cycleId), 'statistics'],
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