/**
 * Test AI Generation Hook
 * Handles AI-1: Story → Test Suite Generator
 * AI-2: Traceability Autopilot
 * AI-3: Fail → Defect Auto-Draft
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useTestAISettings } from './useTestAISettings';

const supabase = supabaseClient as any;

interface GeneratedTestCase {
  title: string;
  description: string;
  steps: { action: string; expectedResult: string }[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  testType: 'manual' | 'automated';
}

interface DefectDraft {
  title: string;
  description: string;
  steps_to_reproduce: { step_number: number; action: string; expected: string }[];
  expected_result: string;
  actual_result: string;
  severity: 'critical' | 'major' | 'minor' | 'trivial';
  priority: 'critical' | 'high' | 'medium' | 'low';
  root_cause_category: string;
  environment?: string;
  preconditions?: string;
  additional_notes?: string;
}

export function useTestAIGeneration(programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { settings, recordAction } = useTestAISettings(programId);

  // AI-1: Generate test cases from story
  const generateTestCasesMutation = useMutation({
    mutationFn: async (input: {
      storyId: string;
      storyTitle: string;
      storyDescription?: string;
      acceptanceCriteria?: string;
    }) => {
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('generate-test-cases', {
        body: {
          storyTitle: input.storyTitle,
          storyDescription: input.storyDescription,
          acceptanceCriteria: input.acceptanceCriteria,
        },
      });

      if (error) throw error;
      
      const latencyMs = Date.now() - startTime;
      const testCases = data.testCases as GeneratedTestCase[];

      // Record provenance
      await recordAction({
        entityType: 'story',
        entityId: input.storyId,
        actionType: 'generate_test_cases',
        provider: settings?.provider || 'lovable',
        model: settings?.model || 'google/gemini-2.5-flash',
        inputSources: { storyTitle: input.storyTitle, storyId: input.storyId },
        confidence: 0.85,
        outputSummary: { testCaseCount: testCases.length, titles: testCases.map(tc => tc.title) },
        latencyMs,
      });

      return { testCases, storyId: input.storyId };
    },
    onError: (err: Error) => {
      toast.error('Failed to generate test cases', { description: err.message });
    },
  });

  // Save generated test cases to database
  const saveGeneratedTestCasesMutation = useMutation({
    mutationFn: async (input: {
      storyId: string;
      testCases: GeneratedTestCase[];
      aiActionId?: string;
    }) => {
      if (!user || !programId) throw new Error('Not authenticated or no program selected');

      const savedCases: string[] = [];

      for (const tc of input.testCases) {
        // Create test case
        const { data: testCase, error: tcError } = await supabase
          .from('test_cases')
          .insert({
            program_id: programId,
            title: tc.title,
            description: tc.description,
            priority: tc.priority,
            test_type: tc.testType,
            status: 'draft',
            created_by: user.id,
          })
          .select()
          .single();

        if (tcError) throw tcError;
        savedCases.push(testCase.id);

        // Create test steps
        for (let i = 0; i < tc.steps.length; i++) {
          const step = tc.steps[i];
          await supabase.from('test_case_steps').insert([{
            case_id: testCase.id,
            step_number: i + 1,
            description: step.action,
            expected_result: step.expectedResult,
          }]);
        }

        // Link to story via traceability - use raw query to avoid type issues
        const client = supabase as unknown as { from: (table: string) => { insert: (data: unknown[]) => Promise<unknown> } };
        await client.from('test_case_traceability').insert([{
          case_id: testCase.id,
          work_item_id: input.storyId,
          work_item_type: 'story',
          created_by: user.id,
        }]);
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        entity_type: 'story',
        entity_id: input.storyId,
        action: 'ai_generated_tests',
        actor_id: user.id,
        after_json: { testCaseIds: savedCases, count: savedCases.length },
      });

      return { savedCaseIds: savedCases };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['traceability'] });
      toast.success(`Created ${data.savedCaseIds.length} test cases`);
    },
    onError: (err: Error) => {
      toast.error('Failed to save test cases', { description: err.message });
    },
  });

  // AI-3: Generate defect draft from failed execution
  const generateDefectDraftMutation = useMutation({
    mutationFn: async (input: {
      executionId: string;
      execution: Record<string, unknown>;
      testCase: Record<string, unknown>;
      failureNotes?: string;
      stepsResults?: { step_id: string; status: string; notes?: string }[];
    }) => {
      const startTime = Date.now();

      const { data, error } = await supabase.functions.invoke('ai-fail-to-defect', {
        body: {
          execution: input.execution,
          testCase: input.testCase,
          failureNotes: input.failureNotes,
          stepsResults: input.stepsResults,
        },
      });

      if (error) throw error;

      const latencyMs = Date.now() - startTime;
      const defectDraft = data.defectDraft as DefectDraft;

      // Record provenance
      await recordAction({
        entityType: 'test_execution',
        entityId: input.executionId,
        actionType: 'generate_defect_draft',
        provider: settings?.provider || 'lovable',
        model: settings?.model || 'google/gemini-2.5-flash',
        inputSources: { executionId: input.executionId, testCaseId: (input.testCase as { id?: string })?.id },
        confidence: 0.80,
        outputSummary: { title: defectDraft.title, severity: defectDraft.severity },
        latencyMs,
      });

      return { defectDraft, executionId: input.executionId };
    },
    onError: (err: Error) => {
      toast.error('Failed to generate defect draft', { description: err.message });
    },
  });

  // Create defect from draft (requires user approval)
  const createDefectFromDraftMutation = useMutation({
    mutationFn: async (input: {
      draft: DefectDraft;
      executionId: string;
      storyId?: string;
      featureId?: string;
      projectId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Generate defect ID
      const { data: defectData, error } = await (supabase.from('defects') as any)
        .insert([{
          title: input.draft.title,
          description: input.draft.description,
          expected_result: input.draft.expected_result,
          actual_result: input.draft.actual_result,
          severity: input.draft.severity,
          priority: input.draft.priority,
          root_cause: input.draft.root_cause_category,
          environment: input.draft.environment,
          preconditions: input.draft.preconditions,
          workflow_status: 'new',
          reporter_id: user.id,
          project_id: input.projectId,
          linked_story_id: input.storyId,
          linked_feature_id: input.featureId,
          steps_to_reproduce: input.draft.steps_to_reproduce,
        }])
        .select()
        .single();

      if (error) throw error;

      // Link defect to execution
      await supabase.from('defect_work_item_links').insert({
        defect_id: defectData.id,
        linked_item_id: input.executionId,
        linked_item_type: 'test_execution',
        relationship_type: 'created_from',
        created_by: user.id,
      });

      return defectData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects'] });
      toast.success('Defect created successfully');
    },
    onError: (err: Error) => {
      toast.error('Failed to create defect', { description: err.message });
    },
  });

  return {
    // AI-1
    generateTestCases: generateTestCasesMutation.mutateAsync,
    isGeneratingTests: generateTestCasesMutation.isPending,
    generatedTestCases: generateTestCasesMutation.data?.testCases,
    saveGeneratedTestCases: saveGeneratedTestCasesMutation.mutateAsync,
    isSavingTests: saveGeneratedTestCasesMutation.isPending,
    
    // AI-3
    generateDefectDraft: generateDefectDraftMutation.mutateAsync,
    isGeneratingDefect: generateDefectDraftMutation.isPending,
    defectDraft: generateDefectDraftMutation.data?.defectDraft,
    createDefectFromDraft: createDefectFromDraftMutation.mutateAsync,
    isCreatingDefect: createDefectFromDraftMutation.isPending,
  };
}
