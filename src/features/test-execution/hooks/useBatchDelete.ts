/**
 * Module 3C-4: Batch Delete Hook
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  DeleteWizardState,
  DeleteType,
  DeleteWizardStep,
  DependencyInfo,
} from '../types/batch-delete';

const initialState: DeleteWizardState = {
  currentStep: 1,
  selectedTestCases: [],
  deleteType: 'soft',
  confirmText: '',
  dependencies: null,
  progress: 0,
  status: 'pending',
  result: null,
};

export function useBatchDelete(projectId: string, initialTestCaseIds: string[] = []) {
  const { toast } = useToast();
  const [state, setState] = useState<DeleteWizardState>({
    ...initialState,
    selectedTestCases: initialTestCaseIds,
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Set delete type
  const setDeleteType = useCallback((deleteType: DeleteType) => {
    setState(prev => ({ ...prev, deleteType }));
  }, []);

  // Update confirmation text
  const setConfirmText = useCallback((text: string) => {
    setState(prev => ({ ...prev, confirmText: text }));
  }, []);

  // Check dependencies
  const checkDependencies = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_delete_dependencies', {
        p_test_case_ids: state.selectedTestCases,
      });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        dependencies: data as DependencyInfo,
        currentStep: 2,
      }));
    } catch (error) {
      toast({
        title: 'Error checking dependencies',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [state.selectedTestCases, toast]);

  // Execute delete
  const executeDelete = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, currentStep: 3, status: 'executing', progress: 0 }));

      // Create job
      const { data: jobData, error: jobError } = await supabase.rpc('create_batch_delete_job', {
        p_project_id: projectId,
        p_test_case_ids: state.selectedTestCases,
        p_delete_type: state.deleteType,
      });

      if (jobError) throw jobError;
      if (jobData.error) throw new Error(jobData.error);
      
      setJobId(jobData.job_id);

      // Execute delete based on type
      const deleteRpc = state.deleteType === 'soft' ? 'execute_soft_delete' : 'execute_permanent_delete';
      const { data: result, error: deleteError } = await supabase.rpc(deleteRpc, {
        p_job_id: jobData.job_id,
      });

      if (deleteError) throw deleteError;

      setState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        result: {
          success: true,
          total: jobData.total_records,
          deleted: result.deleted || 0,
          failed: result.failed || 0,
          deleteType: state.deleteType,
          canRestore: state.deleteType === 'soft',
          expiresInDays: state.deleteType === 'soft' ? 30 : undefined,
        },
      }));

      toast({
        title: 'Delete completed',
        description: `Successfully deleted ${result.deleted} test case(s)`,
      });
    } catch (error) {
      setState(prev => ({ ...prev, status: 'failed' }));
      toast({
        title: 'Delete failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  }, [projectId, state.selectedTestCases, state.deleteType, toast]);

  // Validation
  const isConfirmValid = useCallback(() => {
    return state.confirmText.toLowerCase() === 'delete';
  }, [state.confirmText]);

  // Navigation
  const goToStep = useCallback((step: DeleteWizardStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  // Reset
  const reset = useCallback(() => {
    setState({ ...initialState, selectedTestCases: initialTestCaseIds });
    setJobId(null);
  }, [initialTestCaseIds]);

  return {
    ...state,
    jobId,
    isLoading,
    setDeleteType,
    setConfirmText,
    checkDependencies,
    executeDelete,
    isConfirmValid,
    goToStep,
    reset,
    getSelectedCount: () => state.selectedTestCases.length,
  };
}
