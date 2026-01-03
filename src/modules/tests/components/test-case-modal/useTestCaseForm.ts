/**
 * Enterprise Test Case Form Hook
 * Manages form state, validation, and submission
 */

import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import type { TestCaseFormData, ValidationResult, TestStep, TestVariable, TestDataset, TestCaseLink, ValidationError } from './types';

const generateId = () => crypto.randomUUID();

const INITIAL_STEP: TestStep = {
  id: generateId(),
  stepOrder: 1,
  action: '',
  testData: '',
  expectedResult: '',
  evidenceRequired: 'none',
  tags: [],
  attachments: [],
};

export const INITIAL_FORM_DATA: TestCaseFormData = {
  title: '',
  description: '',
  folderId: '',
  status: 'draft',
  priority: 'medium',
  type: 'manual',
  ownerId: '',
  components: [],
  labels: [],
  estimateMinutes: null,
  risk: 'medium',
  requiresApproval: false,
  preconditions: '',
  steps: [{ ...INITIAL_STEP }],
  datasetsEnabled: false,
  variables: [],
  datasets: [],
  links: [],
};

export function useTestCaseForm(projectId: string, onSuccess?: (id: string) => void) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<TestCaseFormData>({ ...INITIAL_FORM_DATA });

  // Validation logic
  const validation = useMemo<ValidationResult>(() => {
    const errors: ValidationError[] = [];
    
    // Required: Title
    if (!formData.title.trim()) {
      errors.push({
        tab: 'details',
        field: 'title',
        message: 'Title is required',
        severity: 'error',
      });
    }

    // Required: Folder
    if (!formData.folderId) {
      errors.push({
        tab: 'details',
        field: 'folderId',
        message: 'Folder is required',
        severity: 'error',
      });
    }

    // For Ready status: at least 1 step with expected result
    const hasValidStep = formData.steps.some(
      s => s.action.trim() && s.expectedResult.trim()
    );
    if (!hasValidStep) {
      errors.push({
        tab: 'steps',
        field: 'steps',
        message: 'At least one step with expected result is required for Ready status',
        severity: 'warning',
      });
    }

    // Steps without expected results
    formData.steps.forEach((step, idx) => {
      if (step.action.trim() && !step.expectedResult.trim()) {
        errors.push({
          tab: 'steps',
          field: `step-${idx}`,
          message: `Step ${idx + 1} is missing expected result`,
          severity: 'warning',
        });
      }
    });

    // For Ready status: at least 1 linked requirement/story/feature
    const hasTraceabilityLink = formData.links.some(
      l => ['requirement', 'story', 'feature'].includes(l.linkedType)
    );
    if (!hasTraceabilityLink) {
      errors.push({
        tab: 'links',
        field: 'links',
        message: 'At least one linked requirement, story, or feature is required for Ready status',
        severity: 'warning',
      });
    }

    const criticalErrors = errors.filter(e => e.severity === 'error');
    const readinessErrors = errors.filter(e => e.severity === 'warning');

    return {
      isValid: criticalErrors.length === 0,
      canBeReady: criticalErrors.length === 0 && readinessErrors.length === 0,
      errors,
    };
  }, [formData]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({ ...INITIAL_FORM_DATA, steps: [{ ...INITIAL_STEP, id: generateId() }] });
  }, []);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (submitData: TestCaseFormData) => {
      if (!user) throw new Error('Not authenticated');
      if (!projectId) throw new Error('Project ID required');

      // Validate
      if (!submitData.title.trim()) throw new Error('Title is required');
      if (!submitData.folderId) throw new Error('Folder is required');

      // Block Ready status if validation fails
      if (submitData.status === 'ready') {
        const hasValidStep = submitData.steps.some(s => s.action.trim() && s.expectedResult.trim());
        const hasTraceabilityLink = submitData.links.some(
          l => ['requirement', 'story', 'feature'].includes(l.linkedType)
        );
        if (!hasValidStep || !hasTraceabilityLink) {
          throw new Error('Cannot set status to Ready: missing steps or traceability links');
        }
      }

      // 1. Create test case
      const { data: testCase, error: caseError } = await supabase
        .from('test_cases')
        .insert({
          title: submitData.title.trim(),
          description: submitData.description || null,
          preconditions: submitData.preconditions || null,
          folder_id: submitData.folderId,
          status: submitData.status as any,
          priority: submitData.priority as any,
          test_type: submitData.type as any,
          owner_id: submitData.ownerId || null,
          component: submitData.components.join(',') || null,
          labels: submitData.labels.length > 0 ? submitData.labels : null,
          estimated_effort: submitData.estimateMinutes,
          risk: submitData.risk,
          requires_approval: submitData.requiresApproval,
          project_id: projectId,
          created_by: user.id,
          updated_by: user.id,
          version: 1,
        })
        .select()
        .single();

      if (caseError) throw caseError;

      // 2. Create steps
      if (submitData.steps.length > 0) {
        const stepsToInsert = submitData.steps
          .filter(s => s.action.trim())
          .map((step, idx) => ({
            case_id: testCase.id,
            step_number: idx + 1,
            description: step.action,
            test_data: step.testData || null,
            expected_result: step.expectedResult || null,
            evidence_required: step.evidenceRequired,
            step_tags: step.tags,
            shared_step_group_id: step.sharedStepGroupId || null,
          }));

        if (stepsToInsert.length > 0) {
          const { error: stepsError } = await supabase
            .from('test_case_steps')
            .insert(stepsToInsert);
          if (stepsError) throw stepsError;
        }
      }

      // 3. Create variables
      if (submitData.datasetsEnabled && submitData.variables.length > 0) {
        const variablesToInsert = submitData.variables.map(v => ({
          case_id: testCase.id,
          name: v.name,
          description: v.description || null,
        }));

        const { data: insertedVars, error: varsError } = await supabase
          .from('test_case_variables')
          .insert(variablesToInsert)
          .select();
        if (varsError) throw varsError;

        // 4. Create datasets and values
        if (submitData.datasets.length > 0 && insertedVars) {
          for (const dataset of submitData.datasets) {
            const { data: insertedDataset, error: datasetError } = await supabase
              .from('test_case_datasets')
              .insert({
                case_id: testCase.id,
                dataset_name: dataset.name,
                parameter_values: dataset.values,
              })
              .select()
              .single();
            if (datasetError) throw datasetError;
          }
        }
      }

      // 5. Create links
      if (submitData.links.length > 0) {
        const linksToInsert = submitData.links.map(l => ({
          case_id: testCase.id,
          linked_type: l.linkedType,
          linked_id: l.linkedId,
          linked_key: l.linkedKey || null,
          linked_title: l.linkedTitle || null,
          relation: l.relation,
          created_by: user.id,
        }));

        const { error: linksError } = await supabase
          .from('test_case_links')
          .insert(linksToInsert);
        if (linksError) throw linksError;
      }

      // 6. Write audit log
      await supabase.from('test_audit_log').insert({
        entity_type: 'test_case',
        entity_id: testCase.id,
        action: 'created',
        changes_json: {
          title: submitData.title,
          status: submitData.status,
          stepsCount: submitData.steps.filter(s => s.action.trim()).length,
          linksCount: submitData.links.length,
        },
        actor_id: user.id,
      });

      return testCase;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['test-metrics', projectId] });
      toast.success('Test case created successfully');
      resetForm();
      onSuccess?.(result.id);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create test case');
    },
  });

  // Step helpers
  const addStep = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          id: generateId(),
          stepOrder: prev.steps.length + 1,
          action: '',
          testData: '',
          expectedResult: '',
          evidenceRequired: 'none',
          tags: [],
          attachments: [],
        },
      ],
    }));
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps
        .filter(s => s.id !== stepId)
        .map((s, idx) => ({ ...s, stepOrder: idx + 1 })),
    }));
  }, []);

  const duplicateStep = useCallback((stepId: string) => {
    setFormData(prev => {
      const idx = prev.steps.findIndex(s => s.id === stepId);
      if (idx === -1) return prev;
      const step = prev.steps[idx];
      const newStep = { ...step, id: generateId() };
      const newSteps = [...prev.steps];
      newSteps.splice(idx + 1, 0, newStep);
      return {
        ...prev,
        steps: newSteps.map((s, i) => ({ ...s, stepOrder: i + 1 })),
      };
    });
  }, []);

  const reorderSteps = useCallback((fromIndex: number, toIndex: number) => {
    setFormData(prev => {
      const newSteps = [...prev.steps];
      const [removed] = newSteps.splice(fromIndex, 1);
      newSteps.splice(toIndex, 0, removed);
      return {
        ...prev,
        steps: newSteps.map((s, idx) => ({ ...s, stepOrder: idx + 1 })),
      };
    });
  }, []);

  // Variable helpers
  const addVariable = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      variables: [
        ...prev.variables,
        { id: generateId(), name: '', description: '' },
      ],
    }));
  }, []);

  const removeVariable = useCallback((varId: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v.id !== varId),
    }));
  }, []);

  // Dataset helpers
  const addDataset = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      datasets: [
        ...prev.datasets,
        { id: generateId(), name: `Dataset ${prev.datasets.length + 1}`, values: {} },
      ],
    }));
  }, []);

  const removeDataset = useCallback((datasetId: string) => {
    setFormData(prev => ({
      ...prev,
      datasets: prev.datasets.filter(d => d.id !== datasetId),
    }));
  }, []);

  // Link helpers
  const addLink = useCallback((link: Omit<TestCaseLink, 'id'>) => {
    setFormData(prev => ({
      ...prev,
      links: [...prev.links, { ...link, id: generateId() }],
    }));
  }, []);

  const removeLink = useCallback((linkId: string) => {
    setFormData(prev => ({
      ...prev,
      links: prev.links.filter(l => l.id !== linkId),
    }));
  }, []);

  return {
    formData,
    setFormData,
    validation,
    resetForm,
    createMutation,
    addStep,
    removeStep,
    duplicateStep,
    reorderSteps,
    addVariable,
    removeVariable,
    addDataset,
    removeDataset,
    addLink,
    removeLink,
  };
}
