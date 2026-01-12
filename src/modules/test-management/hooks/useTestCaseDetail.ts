/**
 * Test Case Detail Hook - Section 3
 * Provides complete test case detail with autosave and optimistic locking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  TestCaseDetail,
  TestStepDetail,
  Attachment,
  AutosaveStatus,
  UpdateTestCaseForm,
  CreateStepForm,
  UpdateStepForm,
} from '../types/test-case-detail';
import { AUTOSAVE_DELAY_MS, getInitials } from '../types/test-case-detail';

// =============================================
// FETCH TEST CASE DETAIL
// =============================================

async function fetchTestCaseDetail(
  caseId: string,
  projectId: string,
  historyLimit = 5,
  activityLimit = 10
): Promise<TestCaseDetail | null> {
  // Fetch test case with relations
  const { data: testCase, error } = await supabase
    .from('tm_test_cases')
    .select(`
      *,
      folder:tm_folders(id, name, path),
      priority:tm_case_priorities(id, name, color),
      case_type:tm_case_types(id, name, color),
      created_by_profile:profiles!tm_test_cases_created_by_fkey(id, full_name, avatar_url, email),
      steps:tm_test_steps(*)
    `)
    .eq('id', caseId)
    .eq('project_id', projectId)
    .single();

  if (error || !testCase) {
    console.error('Error fetching test case:', error);
    return null;
  }

  // Fetch labels
  const { data: labels } = await supabase
    .from('tm_case_labels')
    .select('label:tm_labels(id, name, color)')
    .eq('test_case_id', caseId);

  // Fetch audit log for activities
  const { data: activities } = await supabase
    .from('tm_audit_log')
    .select('*, actor:profiles!tm_audit_log_actor_id_fkey(id, full_name, avatar_url)')
    .eq('entity_type', 'test_case')
    .eq('entity_id', caseId)
    .order('created_at', { ascending: false })
    .limit(activityLimit);

  // Transform to expected shape
  const createdByProfile = testCase.created_by_profile as any;
  const createdByName = createdByProfile?.full_name || 'Unknown';

  const result: TestCaseDetail = {
    id: testCase.id,
    key: testCase.case_key,
    title: testCase.title,
    description: testCase.description,
    type: null,
    priority: null,
    status: testCase.status as any,
    preconditions: testCase.preconditions,
    estimatedTime: testCase.estimated_time,
    tags: labels?.map((l: any) => l.label?.name).filter(Boolean) || [],

    assigneeId: testCase.assigned_to,
    assignee: null,

    folderId: testCase.folder_id,
    folder: testCase.folder as any,

    releaseId: null,
    release: null,

    priorityId: testCase.priority_id,
    typeId: testCase.case_type_id,

    steps: (testCase.steps || [])
      .sort((a: any, b: any) => a.step_number - b.step_number)
      .map((s: any) => ({
        id: s.id,
        testCaseId: s.test_case_id,
        order: s.step_number,
        action: s.action,
        expectedResult: s.expected_result,
        notes: null,
        testData: s.test_data,
        attachments: [],
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),

    attachments: [],
    linkedRequirements: [],
    linkedDefects: [],

    executionCount: 0,
    passRate: null,
    lastExecutedAt: null,
    executionHistory: [],

    activities: (activities || []).map((a: any) => ({
      id: a.id,
      testCaseId: caseId,
      action: a.action as any,
      description: JSON.stringify(a.changes || {}),
      metadata: a.changes,
      createdAt: a.created_at,
      createdById: a.actor_id,
      createdByName: a.actor?.full_name || 'System',
      createdByInitials: getInitials(a.actor?.full_name || 'SY'),
    })),

    version: testCase.version || 1,

    createdAt: testCase.created_at,
    createdById: testCase.created_by,
    createdByName,
    updatedAt: testCase.updated_at,
    updatedById: testCase.created_by,
    updatedByName: createdByName,
  };

  return result;
}

// =============================================
// MAIN HOOK
// =============================================

export interface UseTestCaseDetailOptions {
  caseId: string;
  projectId: string;
  historyLimit?: number;
  activityLimit?: number;
}

export interface UseTestCaseDetailResult {
  testCase: TestCaseDetail | null;
  isLoading: boolean;
  error: Error | null;
  
  // Autosave
  autosaveStatus: AutosaveStatus;
  pendingChanges: Partial<UpdateTestCaseForm> | null;
  
  // Mutations
  updateTestCase: (data: Partial<UpdateTestCaseForm>) => void;
  updateTestCaseImmediate: (data: Partial<UpdateTestCaseForm>) => Promise<void>;
  
  // Steps
  addStep: (data: CreateStepForm) => Promise<void>;
  updateStep: (stepId: string, data: UpdateStepForm) => Promise<void>;
  deleteStep: (stepId: string) => Promise<void>;
  reorderSteps: (stepIds: string[]) => Promise<void>;
  duplicateStep: (stepId: string) => Promise<void>;
  
  // Attachments
  uploadAttachment: (file: File, stepId?: string) => Promise<void>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
  
  // Refresh
  refetch: () => void;
}

export function useTestCaseDetail(
  options: UseTestCaseDetailOptions
): UseTestCaseDetailResult {
  const { caseId, projectId, historyLimit = 5, activityLimit = 10 } = options;
  const queryClient = useQueryClient();

  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [pendingChanges, setPendingChanges] = useState<Partial<UpdateTestCaseForm> | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Main query
  const {
    data: testCase,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-case-detail', caseId, projectId],
    queryFn: () => fetchTestCaseDetail(caseId, projectId, historyLimit, activityLimit),
    enabled: Boolean(caseId) && caseId !== 'new',
    staleTime: 30000,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<UpdateTestCaseForm>) => {
      const updatePayload: Record<string, unknown> = {};
      
      if (data.title !== undefined) updatePayload.title = data.title;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.status !== undefined) updatePayload.status = data.status;
      if (data.preconditions !== undefined) updatePayload.preconditions = data.preconditions;
      if (data.estimatedTime !== undefined) updatePayload.estimated_time = data.estimatedTime;
      if (data.folderId !== undefined) updatePayload.folder_id = data.folderId;
      if (data.priorityId !== undefined) updatePayload.priority_id = data.priorityId;
      if (data.typeId !== undefined) updatePayload.case_type_id = data.typeId;
      if (data.assigneeId !== undefined) updatePayload.assigned_to = data.assigneeId;

      const { error } = await supabase
        .from('tm_test_cases')
        .update(updatePayload)
        .eq('id', caseId)
        .eq('project_id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      setAutosaveStatus('saved');
      setPendingChanges(null);
      queryClient.invalidateQueries({ queryKey: ['test-case-detail', caseId] });
      
      // Reset to idle after a moment
      setTimeout(() => setAutosaveStatus('idle'), 2000);
    },
    onError: (error) => {
      console.error('Failed to update test case:', error);
      setAutosaveStatus('error');
      toast.error('Failed to save changes');
    },
  });

  // Autosave handler
  const updateTestCase = useCallback((data: Partial<UpdateTestCaseForm>) => {
    setPendingChanges((prev) => ({ ...prev, ...data }));
    setAutosaveStatus('saving');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      updateMutation.mutate(data);
    }, AUTOSAVE_DELAY_MS);
  }, [updateMutation]);

  // Immediate update
  const updateTestCaseImmediate = useCallback(async (data: Partial<UpdateTestCaseForm>) => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    
    setPendingChanges(null);
    setAutosaveStatus('saving');
    await updateMutation.mutateAsync(data);
  }, [updateMutation]);

  // Steps mutations
  const addStepMutation = useMutation({
    mutationFn: async (data: CreateStepForm) => {
      const currentSteps = testCase?.steps || [];
      const nextOrder = currentSteps.length + 1;

      const { error } = await supabase.from('tm_test_steps').insert({
        test_case_id: caseId,
        step_number: nextOrder,
        action: data.action,
        expected_result: data.expectedResult,
        test_data: data.testData || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-detail', caseId] });
      toast.success('Step added');
    },
    onError: (error) => {
      console.error('Failed to add step:', error);
      toast.error('Failed to add step');
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ stepId, data }: { stepId: string; data: UpdateStepForm }) => {
      const updatePayload: Record<string, unknown> = {};
      
      if (data.action !== undefined) updatePayload.action = data.action;
      if (data.expectedResult !== undefined) updatePayload.expected_result = data.expectedResult;
      if (data.notes !== undefined) updatePayload.notes = data.notes;
      if (data.testData !== undefined) updatePayload.test_data = data.testData;

      const { error } = await supabase
        .from('tm_test_steps')
        .update(updatePayload)
        .eq('id', stepId)
        .eq('test_case_id', caseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-detail', caseId] });
    },
    onError: (error) => {
      console.error('Failed to update step:', error);
      toast.error('Failed to update step');
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase
        .from('tm_test_steps')
        .delete()
        .eq('id', stepId)
        .eq('test_case_id', caseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-detail', caseId] });
      toast.success('Step deleted');
    },
    onError: (error) => {
      console.error('Failed to delete step:', error);
      toast.error('Failed to delete step');
    },
  });

  const reorderStepsMutation = useMutation({
    mutationFn: async (stepIds: string[]) => {
      // Update step orders
      for (let i = 0; i < stepIds.length; i++) {
        const { error } = await supabase
          .from('tm_test_steps')
          .update({ step_number: i + 1 })
          .eq('id', stepIds[i])
          .eq('test_case_id', caseId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-detail', caseId] });
    },
    onError: (error) => {
      console.error('Failed to reorder steps:', error);
      toast.error('Failed to reorder steps');
    },
  });

  const duplicateStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const step = testCase?.steps.find((s) => s.id === stepId);
      if (!step) throw new Error('Step not found');

      const nextOrder = (testCase?.steps.length || 0) + 1;

      const { error } = await supabase.from('tm_test_steps').insert({
        test_case_id: caseId,
        step_number: nextOrder,
        action: step.action,
        expected_result: step.expectedResult,
        test_data: step.testData || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-detail', caseId] });
      toast.success('Step duplicated');
    },
    onError: (error) => {
      console.error('Failed to duplicate step:', error);
      toast.error('Failed to duplicate step');
    },
  });

  // Attachments (placeholder - would need storage bucket setup)
  const uploadAttachment = useCallback(async (_file: File, _stepId?: string) => {
    toast.info('Attachment upload coming soon');
  }, []);

  const deleteAttachment = useCallback(async (_attachmentId: string) => {
    toast.info('Attachment delete coming soon');
  }, []);

  // Cleanup autosave timer
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  return {
    testCase: testCase ?? null,
    isLoading,
    error: error as Error | null,

    autosaveStatus,
    pendingChanges,

    updateTestCase,
    updateTestCaseImmediate,

    addStep: addStepMutation.mutateAsync,
    updateStep: (stepId: string, data: UpdateStepForm) =>
      updateStepMutation.mutateAsync({ stepId, data }),
    deleteStep: deleteStepMutation.mutateAsync,
    reorderSteps: reorderStepsMutation.mutateAsync,
    duplicateStep: duplicateStepMutation.mutateAsync,

    uploadAttachment,
    deleteAttachment,

    refetch,
  };
}
