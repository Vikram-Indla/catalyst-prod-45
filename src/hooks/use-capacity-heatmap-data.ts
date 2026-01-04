/**
 * React Query hooks for Capacity Heatmap data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { HeatmapResource, ProjectAllocation } from '@/types/capacity-heatmap';
import { generateTestData, calculateOrgStats } from '@/lib/capacity-heatmap/utils';
import { toast } from 'sonner';

// Fetch resources with utilization data
export function useCapacityHeatmapData(monthCount = 12) {
  return useQuery({
    queryKey: ['capacity-heatmap-resources', monthCount],
    queryFn: async () => {
      // TODO: Replace with real Supabase query when ready
      // For now, use test data
      const { resources, months } = generateTestData(monthCount);
      const stats = calculateOrgStats(resources);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { resources, months, stats };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Update allocation
export function useUpdateAllocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (allocation: Partial<ProjectAllocation> & { id: string }) => {
      // TODO: Replace with real Supabase mutation
      await new Promise(resolve => setTimeout(resolve, 300));
      return allocation;
    },
    onMutate: async (newAllocation) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['capacity-heatmap-resources'] });
      const previous = queryClient.getQueryData(['capacity-heatmap-resources']);
      
      // Update the allocation in cache
      queryClient.setQueryData(['capacity-heatmap-resources'], (old: { resources: HeatmapResource[]; months: Date[] } | undefined) => {
        if (!old) return old;
        return old;
      });
      
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['capacity-heatmap-resources'], context.previous);
      }
      toast.error('Failed to update allocation');
    },
    onSuccess: () => {
      toast.success('Allocation updated');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-heatmap-resources'] });
    },
  });
}

// Resolve conflict
export function useResolveConflict() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ resourceId, month, resolution }: {
      resourceId: string;
      month: Date;
      resolution: 'redistribute' | 'defer' | 'cancel';
    }) => {
      // TODO: Implement actual conflict resolution
      await new Promise(resolve => setTimeout(resolve, 500));
      return { resourceId, month, resolution };
    },
    onSuccess: (_, variables) => {
      toast.success(`Conflict resolved for ${variables.month.toLocaleDateString()}`);
      queryClient.invalidateQueries({ queryKey: ['capacity-heatmap-resources'] });
    },
    onError: () => {
      toast.error('Failed to resolve conflict');
    },
  });
}

// Add quick allocation
export function useAddQuickAllocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      resourceId: string;
      month: Date;
      projectId: string;
      projectName: string;
      percentage: number;
    }) => {
      // TODO: Implement actual allocation creation
      await new Promise(resolve => setTimeout(resolve, 300));
      return data;
    },
    onSuccess: () => {
      toast.success('Allocation added');
      queryClient.invalidateQueries({ queryKey: ['capacity-heatmap-resources'] });
    },
    onError: () => {
      toast.error('Failed to add allocation');
    },
  });
}
