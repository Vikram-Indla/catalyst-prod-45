/**
 * Module 3B-4: Main hook for resource allocation management
 */

import { useCallback } from 'react';
import { useResourceSummary } from './useResourceSummary';
import { useEnvironments } from './useEnvironments';
import { useWorkerPoolsResource } from './useWorkerPoolsResource';
import { useActiveAllocations } from './useActiveAllocations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AllocationRequest, DeallocationRequest, ReassignRequest } from '../types/resource-allocation';

export function useResourceAllocation(projectId: string | null) {
  const { toast } = useToast();

  const summary = useResourceSummary(projectId);
  const environments = useEnvironments(projectId);
  const workerPools = useWorkerPoolsResource(projectId);
  const activeAllocations = useActiveAllocations(projectId);

  const allocate = useCallback(async (request: AllocationRequest) => {
    const { data, error } = await supabase
      .rpc('allocate_workers', {
        p_run_id: request.runId,
        p_environment_id: request.environmentId,
        p_worker_count: request.workerCount,
        p_worker_pool_id: request.workerPoolId || null,
      });

    if (error) {
      toast({ title: 'Allocation failed', description: error.message, variant: 'destructive' });
      return null;
    }

    const result = data as { error?: string };
    if (result?.error) {
      toast({ title: 'Allocation failed', description: result.error, variant: 'destructive' });
      return null;
    }

    toast({ title: `Allocated ${request.workerCount} worker(s)` });
    summary.refetch();
    environments.refetch();
    workerPools.refetch();
    activeAllocations.refetch();

    return data;
  }, [toast, summary, environments, workerPools, activeAllocations]);

  const deallocate = useCallback(async (request: DeallocationRequest) => {
    const { data, error } = await supabase
      .rpc('deallocate_workers', {
        p_run_id: request.runId,
        p_worker_count: request.workerCount || null,
      });

    if (error) {
      toast({ title: 'Deallocation failed', description: error.message, variant: 'destructive' });
      return null;
    }

    const result = data as { error?: string; workers_released?: number };
    if (result?.error) {
      toast({ title: 'Deallocation failed', description: result.error, variant: 'destructive' });
      return null;
    }

    toast({ title: `Released ${result.workers_released} worker(s)` });
    summary.refetch();
    environments.refetch();
    workerPools.refetch();
    activeAllocations.refetch();

    return data;
  }, [toast, summary, environments, workerPools, activeAllocations]);

  const reassign = useCallback(async (request: ReassignRequest) => {
    const { data, error } = await supabase
      .rpc('reassign_workers', {
        p_from_pool_id: request.fromPoolId,
        p_to_pool_id: request.toPoolId,
        p_worker_count: request.workerCount,
      });

    if (error) {
      toast({ title: 'Reassignment failed', description: error.message, variant: 'destructive' });
      return null;
    }

    const result = data as { error?: string };
    if (result?.error) {
      toast({ title: 'Reassignment failed', description: result.error, variant: 'destructive' });
      return null;
    }

    toast({ title: `Moved ${request.workerCount} worker(s)` });
    workerPools.refetch();

    return data;
  }, [toast, workerPools]);

  return {
    summary: summary.data,
    environments: environments.data,
    workerPools: workerPools.data,
    activeAllocations: activeAllocations.data,
    isLoading: summary.isLoading || environments.isLoading || workerPools.isLoading,
    allocate,
    deallocate,
    reassign,
    refetchAll: () => {
      summary.refetch();
      environments.refetch();
      workerPools.refetch();
      activeAllocations.refetch();
    },
  };
}
