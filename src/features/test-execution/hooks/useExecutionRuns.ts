/**
 * Hook for fetching list of execution runs with filters
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ExecutionRun, RunListFilters, DEFAULT_PROGRESS } from '../types/test-execution';

export function useExecutionRuns(filters: RunListFilters = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['execution-runs', filters],
    queryFn: async (): Promise<ExecutionRun[]> => {
      let queryBuilder = (supabase as any)
        .from('test_execution_runs')
        .select(`
          *,
          project:projects(id, name),
          creator:profiles!created_by(id, full_name, avatar_url)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.project_id) {
        queryBuilder = queryBuilder.eq('project_id', filters.project_id);
      }
      if (filters.status?.length) {
        queryBuilder = queryBuilder.in('status', filters.status);
      }
      if (filters.environment?.length) {
        queryBuilder = queryBuilder.in('environment', filters.environment);
      }
      if (filters.created_by) {
        queryBuilder = queryBuilder.eq('created_by', filters.created_by);
      }
      if (filters.search) {
        const searchNum = parseInt(filters.search);
        if (!isNaN(searchNum)) {
          queryBuilder = queryBuilder.or(`name.ilike.%${filters.search}%,run_number.eq.${searchNum}`);
        } else {
          queryBuilder = queryBuilder.ilike('name', `%${filters.search}%`);
        }
      }
      if (filters.date_from) {
        queryBuilder = queryBuilder.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        queryBuilder = queryBuilder.lte('created_at', filters.date_to);
      }

      const { data, error } = await queryBuilder;
      
      if (error) throw error;
      
      // Transform to match ExecutionRun type
      return (data || []).map((run: any) => ({
        id: run.id,
        project_id: run.project_id,
        project_name: run.project?.name,
        run_number: run.run_number,
        name: run.name || run.run_name || `Run #${run.run_number}`,
        description: run.description,
        environment: run.environment || 'staging',
        configuration: run.configuration || {},
        status: run.status || 'draft',
        scheduled_start: run.scheduled_start,
        started_at: run.started_at,
        completed_at: run.completed_at,
        created_by: {
          id: run.creator?.id || run.created_by,
          name: run.creator?.full_name || 'Unknown',
          avatar: run.creator?.avatar_url,
        },
        assigned_testers: [],
        progress: {
          total_cases: 0,
          passed: 0,
          failed: 0,
          blocked: 0,
          skipped: 0,
          in_progress: 0,
          not_run: 0,
          completion_percentage: 0,
          pass_rate: 0,
        },
        created_at: run.created_at,
        updated_at: run.updated_at,
      })) as ExecutionRun[];
    },
    staleTime: 30000,
  });

  // Real-time subscription for run list
  useEffect(() => {
    const channel = supabase
      .channel('execution-runs-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_execution_runs',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['execution-runs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    runs: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
