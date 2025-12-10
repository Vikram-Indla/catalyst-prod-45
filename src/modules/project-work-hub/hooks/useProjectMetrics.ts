import { useQuery } from '@tanstack/react-query';
import { ProjectMetrics, StatusCount, PriorityCount, TypeCount, WorkItemType, Priority } from '../types';

export function useProjectMetrics(projectId: string) {
  return useQuery({
    queryKey: ['project-metrics', projectId],
    queryFn: async (): Promise<ProjectMetrics> => {
      // Mock metrics - replace with actual queries
      return {
        completed: 12,
        updated: 24,
        created: 8,
        dueSoon: 5,
      };
    },
  });
}

export function useStatusDistribution(projectId: string, includeFeatures: boolean = false) {
  return useQuery({
    queryKey: ['status-distribution', projectId, includeFeatures],
    queryFn: async (): Promise<StatusCount[]> => {
      // Mock status distribution
      return [
        { status: 'New', count: 11, color: '#2684FF' },
        { status: 'QA Fail', count: 3, color: '#9B51E0' },
        { status: 'UAT Testing', count: 9, color: '#FF8B00' },
        { status: 'In Review', count: 3, color: '#FFAB00' },
        { status: 'In Progress', count: 4, color: '#0052CC' },
        { status: 'In Requirements', count: 2, color: '#36B37E' },
        { status: 'Done', count: 28, color: '#00875A' },
      ];
    },
  });
}

export function usePriorityDistribution(projectId: string, includeStories: boolean = false) {
  return useQuery({
    queryKey: ['priority-distribution', projectId, includeStories],
    queryFn: async (): Promise<PriorityCount[]> => {
      // Mock priority distribution for defects + incidents
      return [
        { priority: 'HIGHEST' as Priority, count: 2 },
        { priority: 'HIGH' as Priority, count: 5 },
        { priority: 'MEDIUM' as Priority, count: 38 },
        { priority: 'LOW' as Priority, count: 12 },
        { priority: 'LOWEST' as Priority, count: 3 },
      ];
    },
  });
}

export function useTypeDistribution(projectId: string) {
  return useQuery({
    queryKey: ['type-distribution', projectId],
    queryFn: async (): Promise<TypeCount[]> => {
      // Mock type distribution
      const total = 100;
      return [
        { type: 'STORY' as WorkItemType, count: 57, percentage: 57 },
        { type: 'FEATURE' as WorkItemType, count: 22, percentage: 22 },
        { type: 'DEFECT' as WorkItemType, count: 12, percentage: 12 },
        { type: 'SUBTASK' as WorkItemType, count: 6, percentage: 6 },
        { type: 'INCIDENT' as WorkItemType, count: 3, percentage: 3 },
      ];
    },
  });
}
