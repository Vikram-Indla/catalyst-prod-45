/**
 * useExecutionMutations - Mutations for updating execution state
 * 
 * Updates tm_cycle_scope.current_status and creates/updates tm_test_runs.
 * Invalidates useCycleExecutionItems cache on success.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cycleExecutionKeys, type ExecutionStatus, mapUiToDbStatus, type UIStatus } from './useCycleExecutionItems';
import { cycleListKeys } from './useTestCycleList';

// Update status payload
export interface UpdateStatusPayload {
  scopeId: string;
  status: UIStatus;
  createRun?: boolean; // Create a test run record
}

// Update field payload  
export interface UpdateFieldPayload {
  scopeId: string;
  field: 'assigned_to' | 'priority' | 'due_date';
  value: any;
}

// Bulk update payload
export interface BulkUpdatePayload {
  scopeIds: string[];
  patch: Partial<{
    current_status: ExecutionStatus;
    assigned_to: string | null;
    priority: string | null;
    due_date: string | null;
  }>;
}

/**
 * Update execution status
 * Updates tm_cycle_scope.current_status and optionally creates a run record
 */
export function useUpdateExecutionStatus(cycleId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ scopeId, status, createRun }: UpdateStatusPayload) => {
      const dbStatus = mapUiToDbStatus(status);
      
      // Update scope status
      const { error: scopeError } = await (supabase as any)
        .from('tm_cycle_scope')
        .update({ current_status: dbStatus })
        .eq('id', scopeId);
      
      if (scopeError) {
        throw scopeError;
      }
      
      // Create run record if requested (for terminal statuses)
      if (createRun && ['passed', 'failed', 'blocked', 'skipped'].includes(status)) {
        const { data: user } = await supabase.auth.getUser();
        
        await (supabase as any)
          .from('tm_test_runs')
          .insert({
            cycle_scope_id: scopeId,
            status: dbStatus,
            executed_by: user?.user?.id || null,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          });
      }
      
      return { scopeId, status: dbStatus };
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: cycleExecutionKeys.items(cycleId) });
      queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases', cycleId] });
      queryClient.invalidateQueries({ queryKey: cycleListKeys.all });
    },
    onError: (error: Error) => {
      toast.error(`Status update failed: ${error.message}`);
    },
  });
}

/**
 * Update single field on scope item
 */
export function useUpdateExecutionField(cycleId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ scopeId, field, value }: UpdateFieldPayload) => {
      const { error } = await (supabase as any)
        .from('tm_cycle_scope')
        .update({ [field]: value })
        .eq('id', scopeId);
      
      if (error) {
        throw error;
      }
      
      return { scopeId, field, value };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cycleExecutionKeys.items(cycleId) });
      queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases', cycleId] });
      queryClient.invalidateQueries({ queryKey: cycleListKeys.all });
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });
}

/**
 * Bulk update multiple scope items
 */
export function useBulkUpdateExecution(cycleId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ scopeIds, patch }: BulkUpdatePayload) => {
      const { error } = await (supabase as any)
        .from('tm_cycle_scope')
        .update(patch)
        .in('id', scopeIds);
      
      if (error) {
        throw error;
      }
      
      return { count: scopeIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: cycleExecutionKeys.items(cycleId) });
      queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases', cycleId] });
      queryClient.invalidateQueries({ queryKey: cycleListKeys.all });
      toast.success(`Updated ${result.count} tests`);
    },
    onError: (error: Error) => {
      toast.error(`Bulk update failed: ${error.message}`);
    },
  });
}

/**
 * Remove tests from cycle
 */
export function useRemoveFromExecution(cycleId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (scopeIds: string[]) => {
      const { error } = await (supabase as any)
        .from('tm_cycle_scope')
        .delete()
        .in('id', scopeIds);
      
      if (error) {
        throw error;
      }
      
      return { count: scopeIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: cycleExecutionKeys.items(cycleId) });
      queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases', cycleId] });
      queryClient.invalidateQueries({ queryKey: cycleListKeys.all });
      toast.success(`Removed ${result.count} tests from cycle`);
    },
    onError: (error: Error) => {
      toast.error(`Remove failed: ${error.message}`);
    },
  });
}
