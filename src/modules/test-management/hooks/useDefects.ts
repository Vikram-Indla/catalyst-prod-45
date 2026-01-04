/**
 * Defects React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defectsApi, type ListDefectsParams } from '../api';
import type { Defect, CreateDefectInput, UpdateDefectInput, DefectStatus, DefectSeverity, PaginatedResponse } from '../api/types';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '../api/client';
import { MOCK_DEFECTS } from '../data/mockData';

// Query Keys
export const defectKeys = {
  all: ['tm-defects'] as const,
  lists: () => [...defectKeys.all, 'list'] as const,
  list: (params: ListDefectsParams) => [...defectKeys.lists(), params] as const,
  details: () => [...defectKeys.all, 'detail'] as const,
  detail: (id: string) => [...defectKeys.details(), id] as const,
  forRun: (runId: string) => [...defectKeys.all, 'run', runId] as const,
};

/**
 * List defects with filtering and pagination
 * Falls back to mock data if API fails
 */
export function useDefects(params: ListDefectsParams) {
  return useQuery({
    queryKey: defectKeys.list(params),
    queryFn: async (): Promise<PaginatedResponse<Defect>> => {
      try {
        return await defectsApi.list(params);
      } catch (error) {
        console.warn('API unavailable, using mock data:', error);
        // Filter mock data based on params
        let filtered = [...MOCK_DEFECTS];
        
        if (params.status) {
          filtered = filtered.filter(d => d.status === params.status);
        }
        if (params.severity) {
          filtered = filtered.filter(d => d.severity === params.severity);
        }
        if (params.assigned_to) {
          filtered = filtered.filter(d => d.assigned_to === params.assigned_to);
        }
        if (params.search) {
          const search = params.search.toLowerCase();
          filtered = filtered.filter(d => 
            d.title.toLowerCase().includes(search) || 
            d.defect_key.toLowerCase().includes(search)
          );
        }
        
        return {
          data: filtered,
          pagination: {
            page: params.page || 1,
            limit: params.limit || 25,
            total: filtered.length,
            totalPages: Math.ceil(filtered.length / (params.limit || 25)),
          },
        };
      }
    },
    staleTime: 30000,
  });
}

/**
 * Get a single defect by ID
 */
export function useDefect(id: string | null) {
  return useQuery({
    queryKey: defectKeys.detail(id || ''),
    queryFn: () => defectsApi.get(id!),
    enabled: !!id,
  });
}

/**
 * Get defects for a specific run
 */
export function useDefectsForRun(runId: string | null) {
  return useQuery({
    queryKey: defectKeys.forRun(runId || ''),
    queryFn: () => defectsApi.getForRun(runId!),
    enabled: !!runId,
  });
}

/**
 * Create a new defect
 */
export function useCreateDefect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateDefectInput) => defectsApi.create(data),
    onSuccess: (newDefect) => {
      queryClient.invalidateQueries({ queryKey: defectKeys.lists() });
      toast({
        title: 'Defect created',
        description: `${newDefect.defect_key} has been created.`,
      });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to create defect',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update a defect with optimistic updates
 */
export function useUpdateDefect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateDefectInput) => defectsApi.update(data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: defectKeys.detail(newData.id) });
      const previousDefect = queryClient.getQueryData<Defect>(defectKeys.detail(newData.id));

      if (previousDefect) {
        queryClient.setQueryData(defectKeys.detail(newData.id), {
          ...previousDefect,
          ...newData,
        });
      }

      return { previousDefect };
    },
    onError: (error, newData, context) => {
      if (context?.previousDefect) {
        queryClient.setQueryData(defectKeys.detail(newData.id), context.previousDefect);
      }
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to update defect',
        description: apiError.message,
        variant: 'destructive',
      });
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: defectKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: defectKeys.lists() });
    },
  });
}

/**
 * Delete a defect
 */
export function useDeleteDefect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => defectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: defectKeys.lists() });
      toast({ title: 'Defect deleted' });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to delete defect',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Bulk update defect status
 */
export function useBulkUpdateDefectStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: DefectStatus }) =>
      defectsApi.bulkUpdateStatus(ids, status),
    onSuccess: (_, { ids, status }) => {
      queryClient.invalidateQueries({ queryKey: defectKeys.lists() });
      toast({ title: `${ids.length} defect(s) updated to ${status}` });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to update defects',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Quick status change hook
 */
export function useChangeDefectStatus() {
  const updateDefect = useUpdateDefect();
  const { toast } = useToast();

  return {
    ...updateDefect,
    mutate: (defectId: string, status: DefectStatus) => {
      updateDefect.mutate({ id: defectId, status }, {
        onSuccess: () => {
          toast({ 
            title: 'Status updated',
            description: `Defect status changed to ${status.replace('_', ' ')}`,
          });
        },
      });
    },
    mutateAsync: async (defectId: string, status: DefectStatus) => {
      return updateDefect.mutateAsync({ id: defectId, status });
    },
  };
}

/**
 * Link defect to a run
 */
export function useLinkDefectToRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ defectId, runId, stepId }: { defectId: string; runId: string; stepId?: string }) =>
      defectsApi.linkToRun(defectId, runId, stepId),
    onSuccess: (_, { defectId }) => {
      queryClient.invalidateQueries({ queryKey: defectKeys.detail(defectId) });
      queryClient.invalidateQueries({ queryKey: defectKeys.lists() });
      toast({ title: 'Defect linked to run' });
    },
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to link defect',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}
