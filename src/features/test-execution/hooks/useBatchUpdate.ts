/**
 * Module 3C-3: Main orchestration hook for batch update
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  UpdateWizardState,
  TestCasePreview,
  UpdateWizardStep,
  UpdateProgress,
} from '../types/batch-update';

const initialState: UpdateWizardState = {
  currentStep: 1,
  selectedTestCases: [],
  selectAll: false,
  fieldsToUpdate: {},
  preview: [],
  progress: 0,
  status: 'pending',
  result: null,
};

export function useBatchUpdate(projectId: string) {
  const { toast } = useToast();
  const [state, setState] = useState<UpdateWizardState>(initialState);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Step 1: Toggle test case selection
  const toggleTestCase = useCallback((id: string) => {
    setState(prev => {
      const selected = prev.selectedTestCases.includes(id)
        ? prev.selectedTestCases.filter(tcId => tcId !== id)
        : [...prev.selectedTestCases, id];
      return { ...prev, selectedTestCases: selected, selectAll: false };
    });
  }, []);

  const toggleSelectAll = useCallback((allIds: string[]) => {
    setState(prev => ({
      ...prev,
      selectAll: !prev.selectAll,
      selectedTestCases: prev.selectAll ? [] : allIds,
    }));
  }, []);

  const setSelectedTestCases = useCallback((ids: string[]) => {
    setState(prev => ({
      ...prev,
      selectedTestCases: ids,
      selectAll: false,
    }));
  }, []);

  // Step 2: Set field updates
  const setFieldValue = useCallback((field: string, value: string | null) => {
    setState(prev => {
      const updates = { ...prev.fieldsToUpdate };
      if (value === '' || value === undefined) {
        delete updates[field];
      } else {
        updates[field] = value;
      }
      return { ...prev, fieldsToUpdate: updates };
    });
  }, []);

  const removeFieldUpdate = useCallback((field: string) => {
    setState(prev => {
      const updates = { ...prev.fieldsToUpdate };
      delete updates[field];
      return { ...prev, fieldsToUpdate: updates };
    });
  }, []);

  const clearFieldUpdates = useCallback(() => {
    setState(prev => ({ ...prev, fieldsToUpdate: {} }));
  }, []);

  // Step 3: Generate preview
  const generatePreview = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Create job
      const { data: jobData, error: jobError } = await supabase
        .rpc('create_batch_update_job', {
          p_project_id: projectId,
          p_test_case_ids: JSON.parse(JSON.stringify(state.selectedTestCases)),
          p_field_updates: JSON.parse(JSON.stringify(state.fieldsToUpdate)),
        });

      if (jobError) throw jobError;

      const result = jobData as { success?: boolean; job_id?: string; error?: string };
      if (result.error) throw new Error(result.error);
      if (!result.job_id) throw new Error('No job ID returned');

      setJobId(result.job_id);

      // Validate and generate changes
      const { error: validateError } = await supabase
        .rpc('validate_batch_update', {
          p_job_id: result.job_id,
        });

      if (validateError) throw validateError;

      // Get preview
      const { data: preview, error: previewError } = await supabase
        .rpc('get_batch_update_preview', { p_job_id: result.job_id });

      if (previewError) throw previewError;

      setState(prev => ({
        ...prev,
        preview: (preview as unknown as TestCasePreview[]) || [],
        currentStep: 3,
      }));
    } catch (error) {
      console.error('Preview generation failed:', error);
      toast({
        title: 'Preview failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, state.selectedTestCases, state.fieldsToUpdate, toast, isProcessing]);

  // Step 4: Execute update
  const executeUpdate = useCallback(async () => {
    if (!jobId || isProcessing) return;
    setIsProcessing(true);

    try {
      setState(prev => ({ ...prev, currentStep: 4, status: 'executing', progress: 0 }));

      // Poll for progress
      intervalRef.current = setInterval(async () => {
        const { data } = await supabase
          .rpc('get_batch_update_status', { p_job_id: jobId });

        const statusData = data as unknown as UpdateProgress;

        if (statusData && !statusData.error_message) {
          setState(prev => ({ ...prev, progress: statusData.progress || 0 }));

          if (statusData.status === 'completed') {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setState(prev => ({
              ...prev,
              status: 'completed',
              progress: 100,
              result: {
                success: true,
                total: statusData.total_records,
                updated: statusData.updated_records,
                failed: statusData.failed_records,
                fieldsChanged: Object.keys(prev.fieldsToUpdate).length,
              },
            }));
            setIsProcessing(false);
          }
        }
      }, 300);

      // Start execution
      const { error: executeError } = await supabase
        .rpc('execute_batch_update', { p_job_id: jobId });

      if (executeError) throw executeError;

      toast({
        title: 'Update completed',
        description: 'Test cases have been updated successfully',
      });
    } catch (error) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setState(prev => ({ ...prev, status: 'failed' }));
      toast({
        title: 'Update failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  }, [jobId, toast, isProcessing]);

  // Navigation
  const goToStep = useCallback((step: UpdateWizardStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 4) as UpdateWizardStep,
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1) as UpdateWizardStep,
    }));
  }, []);

  // Reset
  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(initialState);
    setJobId(null);
    setIsProcessing(false);
  }, []);

  return {
    ...state,
    isProcessing,
    jobId,
    toggleTestCase,
    toggleSelectAll,
    setSelectedTestCases,
    setFieldValue,
    removeFieldUpdate,
    clearFieldUpdates,
    generatePreview,
    executeUpdate,
    goToStep,
    nextStep,
    prevStep,
    reset,
    getSelectedCount: () => state.selectedTestCases.length,
    getFieldsToUpdateCount: () => Object.keys(state.fieldsToUpdate).length,
    hasChanges: () =>
      Object.keys(state.fieldsToUpdate).length > 0 &&
      state.selectedTestCases.length > 0,
    canProceed: state.selectedTestCases.length > 0 && Object.keys(state.fieldsToUpdate).length > 0,
  };
}
