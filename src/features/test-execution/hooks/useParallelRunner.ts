/**
 * Module 3B-1: Main orchestration hook for parallel test execution
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  ParallelRunnerState, 
  WorkerState, 
  ParallelRunProgress,
  CreateParallelRunInput,
  ExecutionEvent,
  QueueItem
} from '../types/parallel-runner';

export function useParallelRunner(runId: string | null) {
  const [state, setState] = useState<ParallelRunnerState>({
    isRunning: false,
    isPaused: false,
    workers: [],
    queue: [],
    progress: null,
    events: [],
  });

  const workersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    isRunningRef.current = state.isRunning;
    isPausedRef.current = state.isPaused;
  }, [state.isRunning, state.isPaused]);

  // Add event to stream
  const addEvent = useCallback((event: Omit<ExecutionEvent, 'timestamp'>) => {
    setState(prev => ({
      ...prev,
      events: [{ ...event, timestamp: Date.now() }, ...prev.events].slice(0, 50), // Keep last 50 events
    }));
  }, []);

  // Refresh all state
  const refreshState = useCallback(async () => {
    if (!runId) return;

    const [workersRes, progressRes, queueRes] = await Promise.all([
      (supabase.rpc as any)('get_worker_status', { p_run_id: runId }),
      (supabase.rpc as any)('get_parallel_run_progress', { p_run_id: runId }),
      supabase
        .from('execution_queue')
        .select('*, test_cases(id, case_number, title, priority)')
        .eq('run_id', runId)
        .order('priority', { ascending: false })
        .order('position', { ascending: true }),
    ]);

    setState(prev => ({
      ...prev,
      workers: (workersRes.data as WorkerState[]) || [],
      progress: progressRes.data as ParallelRunProgress,
      queue: (queueRes.data as QueueItem[]) || [],
    }));
  }, [runId]);

  // Initialize parallel run
  const initialize = useCallback(async (config: CreateParallelRunInput) => {
    const { data, error } = await (supabase.rpc as any)('create_parallel_run', {
      p_run_id: config.runId,
      p_max_workers: config.maxWorkers || 3,
      p_priority_mode: config.priorityMode || 'priority',
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    // Fetch initial state
    await refreshState();

    return data;
  }, [refreshState]);

  // Worker execution loop
  const startWorkerLoop = useCallback(async (workerId: string, workerNumber: number) => {
    const executeNext = async () => {
      if (!isRunningRef.current || isPausedRef.current || !runId) return;

      // Claim next test
      const { data: claimResult, error } = await (supabase.rpc as any)('claim_next_test', {
        p_run_id: runId,
        p_worker_id: workerId,
      });

      if (error) {
        console.error('Claim error:', error);
        addEvent({ type: 'worker_error', workerId, workerNumber });
        return;
      }

      if (claimResult?.empty) {
        // No more tests, worker goes idle
        addEvent({ type: 'worker_idle', workerId, workerNumber });
        await refreshState();
        return;
      }

      if (claimResult?.success) {
        addEvent({
          type: 'test_claimed',
          workerId,
          workerNumber,
          testCaseId: claimResult.test_case?.id,
          testTitle: claimResult.test_case?.title,
        });

        // Simulate execution (in real app, this triggers actual test runner)
        // Random execution time between 2-8 seconds for demo
        const executionTime = Math.floor(Math.random() * 6000) + 2000;
        
        const timeout = setTimeout(async () => {
          if (!isRunningRef.current) return;

          // Random result (90% pass rate for demo)
          const resultStatus = Math.random() > 0.1 ? 'passed' : 'failed';
          
          // Complete the test
          const { error: completeError } = await (supabase.rpc as any)('complete_test_execution', {
            p_worker_id: workerId,
            p_result_status: resultStatus,
            p_execution_time: Math.floor(executionTime / 1000),
          });

          if (completeError) {
            console.error('Complete error:', completeError);
            addEvent({ type: 'worker_error', workerId, workerNumber });
          } else {
            addEvent({
              type: resultStatus === 'passed' ? 'test_completed' : 'test_failed',
              workerId,
              workerNumber,
              testCaseId: claimResult.test_case?.id,
              testTitle: claimResult.test_case?.title,
              result: resultStatus,
            });
          }

          await refreshState();

          // Continue to next test
          if (isRunningRef.current && !isPausedRef.current) {
            executeNext();
          }
        }, executionTime);

        workersRef.current.set(workerId, timeout);
      }
    };

    executeNext();
  }, [runId, addEvent, refreshState]);

  // Start execution
  const start = useCallback(async () => {
    if (!runId) return;

    setState(prev => ({ ...prev, isRunning: true, isPaused: false }));

    // Start heartbeat
    heartbeatRef.current = setInterval(async () => {
      const workers = await (supabase.rpc as any)('get_worker_status', { p_run_id: runId });
      if (workers.data) {
        for (const worker of workers.data as WorkerState[]) {
          if (worker.status === 'running') {
            await (supabase.rpc as any)('worker_heartbeat', { p_worker_id: worker.id });
          }
        }
      }
    }, 30000);

    // Refresh to get current workers
    await refreshState();

    // Start all workers (use current state)
    const { data: currentWorkers } = await (supabase.rpc as any)('get_worker_status', { p_run_id: runId });
    if (currentWorkers) {
      for (const worker of currentWorkers as WorkerState[]) {
        startWorkerLoop(worker.id, worker.worker_number);
      }
    }
  }, [runId, refreshState, startWorkerLoop]);

  // Pause execution
  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  // Resume execution
  const resume = useCallback(async () => {
    if (!runId) return;

    setState(prev => ({ ...prev, isPaused: false }));

    // Restart idle workers
    const { data: currentWorkers } = await (supabase.rpc as any)('get_worker_status', { p_run_id: runId });
    if (currentWorkers) {
      for (const worker of currentWorkers as WorkerState[]) {
        if (worker.status === 'idle') {
          startWorkerLoop(worker.id, worker.worker_number);
        }
      }
    }
  }, [runId, startWorkerLoop]);

  // Stop execution
  const stop = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: false, isPaused: false }));

    // Clear all worker timeouts
    workersRef.current.forEach(timeout => clearTimeout(timeout));
    workersRef.current.clear();

    // Clear heartbeat
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // Requeue abandoned tests
  const requeueAbandoned = useCallback(async () => {
    if (!runId) return;

    const { data } = await (supabase.rpc as any)('requeue_abandoned_tests', {
      p_run_id: runId,
      p_timeout_seconds: 300,
    });

    if (data?.requeued_count > 0) {
      await refreshState();
    }

    return data;
  }, [runId, refreshState]);

  // Real-time subscription
  useEffect(() => {
    if (!runId) return;

    const channel = supabase
      .channel(`parallel-run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'execution_queue',
          filter: `run_id=eq.${runId}`,
        },
        () => refreshState()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parallel_workers',
          filter: `run_id=eq.${runId}`,
        },
        () => refreshState()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stop();
    };
  }, [runId, refreshState, stop]);

  // Initial load
  useEffect(() => {
    if (runId) {
      refreshState();
    }
  }, [runId, refreshState]);

  return {
    ...state,
    initialize,
    start,
    pause,
    resume,
    stop,
    refreshState,
    requeueAbandoned,
  };
}
