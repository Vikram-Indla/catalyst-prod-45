// =====================================================
// DEPENDENCIES HOOK
// React Query hooks for dependency operations
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  createDependency,
  getDependenciesForItem,
  getDependencyCounts,
  getAllBlockers,
  updateDependency,
  deleteDependency,
  getDependencyGraph
} from '@/services/dependencyService';
import { CreateDependencyInput, UpdateDependencyInput } from '@/types/dependencies';
import { WorkItemType } from '@/types/views';

// Query keys
export const dependencyKeys = {
  all: ['dependencies'] as const,
  forItem: (type: WorkItemType, id: string) => 
    [...dependencyKeys.all, 'item', type, id] as const,
  counts: (type: WorkItemType, id: string) => 
    [...dependencyKeys.all, 'counts', type, id] as const,
  blockers: (type: WorkItemType, id: string) => 
    [...dependencyKeys.all, 'blockers', type, id] as const,
  graph: (projectId: string) => 
    [...dependencyKeys.all, 'graph', projectId] as const,
};

// -----------------------------------------------------
// Get Dependencies for Item
// -----------------------------------------------------
export function useDependenciesForItem(itemType: WorkItemType, itemId: string) {
  return useQuery({
    queryKey: dependencyKeys.forItem(itemType, itemId),
    queryFn: () => getDependenciesForItem(itemType, itemId),
    enabled: !!itemId,
  });
}

// -----------------------------------------------------
// Get Dependency Counts
// -----------------------------------------------------
export function useDependencyCounts(itemType: WorkItemType, itemId: string) {
  return useQuery({
    queryKey: dependencyKeys.counts(itemType, itemId),
    queryFn: () => getDependencyCounts(itemType, itemId),
    enabled: !!itemId,
  });
}

// -----------------------------------------------------
// Get All Blockers
// -----------------------------------------------------
export function useAllBlockers(itemType: WorkItemType, itemId: string) {
  return useQuery({
    queryKey: dependencyKeys.blockers(itemType, itemId),
    queryFn: () => getAllBlockers(itemType, itemId),
    enabled: !!itemId,
  });
}

// -----------------------------------------------------
// Get Dependency Graph
// -----------------------------------------------------
export function useDependencyGraph(projectId: string) {
  return useQuery({
    queryKey: dependencyKeys.graph(projectId),
    queryFn: () => getDependencyGraph(projectId),
    enabled: !!projectId,
  });
}

// -----------------------------------------------------
// Create Dependency Mutation
// -----------------------------------------------------
export function useCreateDependency() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CreateDependencyInput) => createDependency(input),
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: dependencyKeys.forItem(variables.dependent_type, variables.dependent_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: dependencyKeys.forItem(variables.blocker_type, variables.blocker_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: dependencyKeys.counts(variables.dependent_type, variables.dependent_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: dependencyKeys.counts(variables.blocker_type, variables.blocker_id) 
      });
      
      toast({
        title: 'Dependency Created',
        description: 'The dependency has been added successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// -----------------------------------------------------
// Update Dependency Mutation
// -----------------------------------------------------
export function useUpdateDependency() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDependencyInput }) => 
      updateDependency(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dependencyKeys.all });
      toast({
        title: 'Dependency Updated',
        description: 'The dependency has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// -----------------------------------------------------
// Delete Dependency Mutation
// -----------------------------------------------------
export function useDeleteDependency() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteDependency(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dependencyKeys.all });
      toast({
        title: 'Dependency Removed',
        description: 'The dependency has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
