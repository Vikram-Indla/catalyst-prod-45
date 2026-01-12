/**
 * Realtime Execution Hook
 * Subscribes to real-time updates for test execution
 */

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { runKeys } from './useExecution';
import { cycleKeys } from './useCycles';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface RealtimeExecutionOptions {
  cycleId?: string;
  runId?: string;
  onRunUpdate?: (payload: any) => void;
  onStepUpdate?: (payload: any) => void;
  onCycleUpdate?: (payload: any) => void;
  showToasts?: boolean;
}

/**
 * Subscribe to real-time execution updates
 */
export function useRealtimeExecution({
  cycleId,
  runId,
  onRunUpdate,
  onStepUpdate,
  onCycleUpdate,
  showToasts = false,
}: RealtimeExecutionOptions = {}) {
  const queryClient = useQueryClient();

  const handleRunChange = useCallback(
    (payload: any) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      // Invalidate relevant queries
      if (newRecord?.id) {
        queryClient.invalidateQueries({ queryKey: runKeys.detail(newRecord.id) });
      }
      if (newRecord?.scope_id) {
        queryClient.invalidateQueries({ queryKey: runKeys.history(newRecord.scope_id) });
      }
      if (newRecord?.cycle_id || cycleId) {
        queryClient.invalidateQueries({
          queryKey: cycleKeys.detail(newRecord?.cycle_id || cycleId),
        });
        queryClient.invalidateQueries({
          queryKey: cycleKeys.stats(newRecord?.cycle_id || cycleId),
        });
      }

      // Show toast for status changes
      if (showToasts && eventType === 'UPDATE' && newRecord?.status !== oldRecord?.status) {
        const statusLabel = newRecord.status?.toUpperCase() || 'UNKNOWN';
        toast.info(`Test run updated: ${statusLabel}`);
      }

      // Call custom handler
      onRunUpdate?.(payload);
    },
    [queryClient, cycleId, onRunUpdate, showToasts]
  );

  const handleStepChange = useCallback(
    (payload: any) => {
      const { new: newRecord } = payload;

      // Invalidate run detail to refresh step results
      if (newRecord?.run_id || runId) {
        queryClient.invalidateQueries({
          queryKey: runKeys.detail(newRecord?.run_id || runId),
        });
      }

      // Call custom handler
      onStepUpdate?.(payload);
    },
    [queryClient, runId, onStepUpdate]
  );

  const handleCycleChange = useCallback(
    (payload: any) => {
      const { new: newRecord } = payload;

      // Invalidate cycle queries
      if (newRecord?.id) {
        queryClient.invalidateQueries({ queryKey: cycleKeys.detail(newRecord.id) });
        queryClient.invalidateQueries({ queryKey: cycleKeys.stats(newRecord.id) });
      }
      queryClient.invalidateQueries({ queryKey: cycleKeys.lists() });

      // Call custom handler
      onCycleUpdate?.(payload);
    },
    [queryClient, onCycleUpdate]
  );

  useEffect(() => {
    const channels: RealtimeChannel[] = [];

    // Subscribe to test runs changes
    const runsChannel = supabase
      .channel('tm_test_runs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_test_runs',
          ...(cycleId && { filter: `cycle_id=eq.${cycleId}` }),
        },
        handleRunChange
      )
      .subscribe();
    channels.push(runsChannel);

    // Subscribe to step results changes
    const stepsChannel = supabase
      .channel('tm_step_results_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_step_results',
          ...(runId && { filter: `run_id=eq.${runId}` }),
        },
        handleStepChange
      )
      .subscribe();
    channels.push(stepsChannel);

    // Subscribe to cycle changes
    if (cycleId) {
      const cycleChannel = supabase
        .channel('tm_test_cycles_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tm_test_cycles',
            filter: `id=eq.${cycleId}`,
          },
          handleCycleChange
        )
        .subscribe();
      channels.push(cycleChannel);
    }

    // Cleanup
    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [cycleId, runId, handleRunChange, handleStepChange, handleCycleChange]);
}

/**
 * Subscribe to defect updates in real-time
 */
export function useRealtimeDefects(projectId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel('tm_defects_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_defects',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          // Invalidate defects queries
          queryClient.invalidateQueries({ queryKey: ['tm-defects'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);
}

/**
 * Subscribe to scope assignment changes
 */
export function useRealtimeScopeAssignments(cycleId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!cycleId) return;

    const channel = supabase
      .channel('tm_cycle_scope_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_cycle_scope',
          filter: `cycle_id=eq.${cycleId}`,
        },
        (payload) => {
          // Invalidate cycle detail and scope queries
          queryClient.invalidateQueries({ queryKey: cycleKeys.detail(cycleId) });
          queryClient.invalidateQueries({ queryKey: ['tm-scope', cycleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleId, queryClient]);
}
