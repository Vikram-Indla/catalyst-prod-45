/**
 * useCycleScopeMutations - Mutations for updating tm_cycle_scope items
 * 
 * Provides:
 * - updateScopeItem: Update single scope item (status, assignee, priority, due_date)
 * - bulkUpdateScopeItems: Update multiple scope items at once
 * - bulkRemoveScopeItems: Remove tests from cycle
 * 
 * All mutations invalidate relevant caches for consistent UI updates.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cycleListKeys } from './useTestCycleList';

// Valid status values for tm_cycle_scope
export type ScopeStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';

// Update payload for a single scope item
export interface UpdateScopeItemPayload {
  scopeId: string;
  patch: Partial<{
    current_status: ScopeStatus;
    assigned_to: string | null;
    priority: string | null;
    due_date: string | null;
  }>;
}

// Bulk update payload
export interface BulkUpdatePayload {
  scopeIds: string[];
  patch: Partial<{
    current_status: ScopeStatus;
    assigned_to: string | null;
    priority: string | null;
    due_date: string | null;
  }>;
}

/**
 * Single item update mutation
 */
export function useUpdateScopeItem(cycleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scopeId, patch }: UpdateScopeItemPayload) => {
      const { data, error } = await (supabase as any)
        .from('tm_cycle_scope')
        .update(patch)
        .eq('id', scopeId)
        .select()
        .single();

      if (error) {
        console.error('Error updating scope item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate all cycle-related queries
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['assignment-table', cycleId] });
      queryClient.invalidateQueries({ queryKey: cycleListKeys.all });
      // Don't show toast for every inline edit - too noisy
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });
}

/**
 * Bulk update mutation
 */
export function useBulkUpdateScopeItems(cycleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scopeIds, patch }: BulkUpdatePayload) => {
      const { data, error } = await (supabase as any)
        .from('tm_cycle_scope')
        .update(patch)
        .in('id', scopeIds)
        .select();

      if (error) {
        console.error('Error bulk updating scope items:', error);
        throw error;
      }

      return { count: scopeIds.length, data };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['assignment-table', cycleId] });
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
export function useBulkRemoveScopeItems(cycleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scopeIds: string[]) => {
      const { error } = await (supabase as any)
        .from('tm_cycle_scope')
        .delete()
        .in('id', scopeIds);

      if (error) {
        console.error('Error removing scope items:', error);
        throw error;
      }

      return { count: scopeIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cycle-test-cases', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['assignment-table', cycleId] });
      queryClient.invalidateQueries({ queryKey: cycleListKeys.all });
      toast.success(`Removed ${result.count} tests from cycle`);
    },
    onError: (error: Error) => {
      toast.error(`Remove failed: ${error.message}`);
    },
  });
}
