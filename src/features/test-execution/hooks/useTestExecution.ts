/**
 * Module 3A-2: Test Execution State Hook
 * Manages test execution state with real-time updates
 */
import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ExecutionTestCase, ExecutionProgress } from '../types/step-execution';

interface RpcTestCaseResponse {
  error?: string;
  id?: string;
  case_number?: string;
  title?: string;
  description?: string;
  priority?: string;
  suite_name?: string;
  preconditions?: string;
  steps?: unknown[];
  execution?: unknown;
  run?: unknown;
}

export function useTestExecution(runId: string, testCaseId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['test-execution', runId, testCaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_test_case_for_execution_v2', {
          p_run_id: runId,
          p_test_case_id: testCaseId,
        });

      if (error) throw error;
      const response = data as unknown as RpcTestCaseResponse;
      if (response?.error) throw new Error(response.error);

      return response as unknown as ExecutionTestCase;
    },
    staleTime: 30000,
    enabled: Boolean(runId && testCaseId),
  });

  // Calculate progress
  const progress = useMemo<ExecutionProgress>(() => {
    if (!query.data) {
      return { completed: 0, total: 0, percentage: 0, passed: 0, failed: 0, blocked: 0, skipped: 0 };
    }

    const steps = query.data.steps || [];
    const completed = steps.filter(s => s.result !== null).length;

    return {
      completed,
      total: steps.length,
      percentage: steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0,
      passed: steps.filter(s => s.result === 'passed').length,
      failed: steps.filter(s => s.result === 'failed').length,
      blocked: steps.filter(s => s.result === 'blocked').length,
      skipped: steps.filter(s => s.result === 'skipped').length,
    };
  }, [query.data]);

  // Real-time subscription for step results
  useEffect(() => {
    const executionId = query.data?.execution?.id;
    if (!executionId) return;

    const channel = supabase
      .channel(`step-results-${executionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_step_results',
          filter: `execution_result_id=eq.${executionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['test-execution', runId, testCaseId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query.data?.execution?.id, runId, testCaseId, queryClient]);

  return {
    testCase: query.data,
    steps: query.data?.steps ?? [],
    execution: query.data?.execution,
    run: query.data?.run,
    progress,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
