/**
 * Module 3B-1: Hook for worker pool management
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { WorkerState, WorkerPoolConfig, DEFAULT_WORKER_POOL_CONFIG } from '../types/parallel-runner';

const defaultConfig: WorkerPoolConfig = {
  minWorkers: 1,
  maxWorkers: 5,
  heartbeatInterval: 30000,
  claimTimeout: 5000,
  abandonedTimeout: 300,
};

export function useWorkerPool(runId: string | null, config: WorkerPoolConfig = defaultConfig) {
  const [workers, setWorkers] = useState<WorkerState[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWorkers = useCallback(async () => {
    if (!runId) return;

    setIsLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('get_worker_status', { p_run_id: runId });

      if (!error && data) {
        setWorkers(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [runId]);

  const addWorker = useCallback(async () => {
    if (!runId || workers.length >= config.maxWorkers) return;

    const newNumber = workers.length + 1;
    await supabase
      .from('parallel_workers')
      .insert({
        run_id: runId,
        worker_number: newNumber,
        status: 'idle',
      });

    await fetchWorkers();
  }, [runId, workers.length, config.maxWorkers, fetchWorkers]);

  const removeWorker = useCallback(async (workerId: string) => {
    if (workers.length <= config.minWorkers) return;

    const worker = workers.find(w => w.id === workerId);
    if (worker?.status === 'running') return; // Can't remove running worker

    await supabase
      .from('parallel_workers')
      .delete()
      .eq('id', workerId);

    await fetchWorkers();
  }, [workers, config.minWorkers, fetchWorkers]);

  const sendHeartbeat = useCallback(async (workerId: string) => {
    await (supabase.rpc as any)('worker_heartbeat', { p_worker_id: workerId });
  }, []);

  const getWorkerStats = useCallback(() => {
    const idle = workers.filter(w => w.status === 'idle').length;
    const running = workers.filter(w => w.status === 'running').length;
    const paused = workers.filter(w => w.status === 'paused').length;
    const error = workers.filter(w => w.status === 'error').length;
    const healthy = workers.filter(w => w.is_healthy).length;
    const totalCompleted = workers.reduce((sum, w) => sum + w.completed_count, 0);
    const totalFailed = workers.reduce((sum, w) => sum + w.failed_count, 0);
    const totalTime = workers.reduce((sum, w) => sum + w.total_execution_time, 0);

    return {
      total: workers.length,
      idle,
      running,
      paused,
      error,
      healthy,
      totalCompleted,
      totalFailed,
      totalTime,
      avgTimePerTest: totalCompleted > 0 ? Math.round(totalTime / totalCompleted) : 0,
    };
  }, [workers]);

  // Initial load
  useEffect(() => {
    if (runId) {
      fetchWorkers();
    }
  }, [runId, fetchWorkers]);

  return {
    workers,
    isLoading,
    fetchWorkers,
    addWorker,
    removeWorker,
    sendHeartbeat,
    getWorkerStats,
    canAddWorker: workers.length < config.maxWorkers,
    canRemoveWorker: workers.length > config.minWorkers,
  };
}
