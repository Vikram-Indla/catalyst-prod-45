/**
 * useCycleExecution Hook
 * Full cycle execution workflow with step-level tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
import { toast } from 'sonner';
import {
  getCycleExecutions,
  updateStepResult,
  updateExecutionEffort,
  startExecutionTimer,
  pauseExecutionTimer,
  resetExecution,
  linkDefectToExecution,
  unlinkDefectFromExecution,
  addExecutionComment,
  generateCycleExecutions,
  ExecutionWithSteps,
  StepStatusUpdate,
  EffortUpdate,
} from '../api/cycleExecution';

/**
 * Hook for managing cycle execution with step-level tracking
 */
export function useCycleExecution(cycleId: string | null, projectId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Permission checks
  const { hasPermission: canView } = usePermission('test_executions', 'view', 'program', projectId || undefined);
  const { hasPermission: canEdit } = usePermission('test_executions', 'edit', 'program', projectId || undefined);

  // Query for all executions in the cycle
  const {
    data: executions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['cycle-execution', cycleId],
    queryFn: async () => {
      if (!cycleId) return [];
      return await getCycleExecutions(cycleId);
    },
    enabled: !!user && !!cycleId && canView,
    staleTime: 5000,
  });

  // Calculate stats from executions
  const stats = {
    total: executions?.length || 0,
    passed: executions?.filter(e => e.status === 'passed').length || 0,
    failed: executions?.filter(e => e.status === 'failed').length || 0,
    blocked: executions?.filter(e => e.status === 'blocked').length || 0,
    inProgress: executions?.filter(e => e.status === 'in_progress').length || 0,
    notRun: executions?.filter(e => e.status === 'not_run').length || 0,
    progress: executions?.length 
      ? Math.round((executions.filter(e => e.status !== 'not_run').length / executions.length) * 100)
      : 0,
  };

  // Update step result mutation
  const updateStepMutation = useMutation({
    mutationFn: async ({ executionId, update }: { executionId: string; update: StepStatusUpdate }) => {
      if (!user) throw new Error('Not authorized');
      return await updateStepResult(executionId, user.id, update);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-execution', cycleId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update effort mutation
  const updateEffortMutation = useMutation({
    mutationFn: async ({ executionId, effort }: { executionId: string; effort: EffortUpdate }) => {
      return await updateExecutionEffort(executionId, effort);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-execution', cycleId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Start timer mutation
  const startTimerMutation = useMutation({
    mutationFn: async (executionId: string) => {
      return await startExecutionTimer(executionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-execution', cycleId] });
    },
  });

  // Pause timer mutation
  const pauseTimerMutation = useMutation({
    mutationFn: async (executionId: string) => {
      return await pauseExecutionTimer(executionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-execution', cycleId] });
    },
  });

  // Reset execution mutation
  const resetMutation = useMutation({
    mutationFn: async (executionId: string) => {
      if (!user) throw new Error('Not authorized');
      return await resetExecution(executionId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-execution', cycleId] });
      toast.success('Execution reset');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Link defect mutation
  const linkDefectMutation = useMutation({
    mutationFn: async ({ executionId, defectId }: { executionId: string; defectId: string }) => {
      if (!user) throw new Error('Not authorized');
      return await linkDefectToExecution(executionId, defectId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-execution', cycleId] });
      toast.success('Defect linked');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Unlink defect mutation
  const unlinkDefectMutation = useMutation({
    mutationFn: async ({ executionId, defectId }: { executionId: string; defectId: string }) => {
      return await unlinkDefectFromExecution(executionId, defectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-execution', cycleId] });
      toast.success('Defect unlinked');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ executionId, comment }: { executionId: string; comment: string }) => {
      return await addExecutionComment(executionId, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-execution', cycleId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Generate executions mutation
  const generateMutation = useMutation({
    mutationFn: async (caseIds: string[]) => {
      if (!cycleId || !user) throw new Error('Not authorized');
      return await generateCycleExecutions(cycleId, caseIds, user.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cycle-execution', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success(`Generated ${result?.length || 0} executions`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    // Data
    executions: executions || [],
    stats,

    // Loading/Error
    isLoading,
    error: error as Error | null,
    refetch,

    // Mutations
    updateStep: updateStepMutation.mutateAsync,
    updateEffort: updateEffortMutation.mutateAsync,
    startTimer: startTimerMutation.mutateAsync,
    pauseTimer: pauseTimerMutation.mutateAsync,
    resetExecution: resetMutation.mutateAsync,
    linkDefect: linkDefectMutation.mutateAsync,
    unlinkDefect: unlinkDefectMutation.mutateAsync,
    addComment: addCommentMutation.mutateAsync,
    generateExecutions: generateMutation.mutateAsync,

    // Pending states
    isUpdatingStep: updateStepMutation.isPending,
    isUpdatingEffort: updateEffortMutation.isPending,
    isResetting: resetMutation.isPending,
    isLinkingDefect: linkDefectMutation.isPending,
    isGenerating: generateMutation.isPending,

    // Permissions
    canView,
    canEdit,
  };
}
