import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectMetrics, StatusCount, PriorityCount, TypeCount, WorkItemType, Priority } from '../types';
import { subDays, addDays } from 'date-fns';

export function useProjectMetrics(projectId: string) {
  return useQuery({
    queryKey: ['project-metrics', projectId],
    queryFn: async (): Promise<ProjectMetrics> => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const sevenDaysFromNow = addDays(new Date(), 7).toISOString();
      const now = new Date().toISOString();

      // Get feature IDs for this project
      const { data: features } = await supabase
        .from('features')
        .select('id, status, created_at, updated_at, planned_end_date')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      const featureIds = (features || []).map(f => f.id);

      // Get stories for these features
      let stories: any[] = [];
      if (featureIds.length > 0) {
        const { data: storyData } = await supabase
          .from('stories')
          .select('id, status, created_at, updated_at')
          .in('feature_id', featureIds)
          .is('deleted_at', null);
        stories = storyData || [];
      }

      // Calculate metrics
      const allItems = [...(features || []), ...stories];

      // Completed in last 7 days (status = done)
      const completed = allItems.filter(item => 
        item.status === 'done' && 
        item.updated_at && 
        new Date(item.updated_at) >= new Date(sevenDaysAgo)
      ).length;

      // Updated in last 7 days
      const updated = allItems.filter(item => 
        item.updated_at && 
        new Date(item.updated_at) >= new Date(sevenDaysAgo)
      ).length;

      // Created in last 7 days
      const created = allItems.filter(item => 
        item.created_at && 
        new Date(item.created_at) >= new Date(sevenDaysAgo)
      ).length;

      // Due soon (features with planned_end_date in next 7 days)
      const dueSoon = (features || []).filter(f => 
        f.planned_end_date && 
        new Date(f.planned_end_date) >= new Date(now) &&
        new Date(f.planned_end_date) <= new Date(sevenDaysFromNow)
      ).length;

      return {
        completed,
        updated,
        created,
        dueSoon,
      };
    },
  });
}

export function useStatusDistribution(projectId: string, includeFeatures: boolean = false) {
  return useQuery({
    queryKey: ['status-distribution', projectId, includeFeatures],
    queryFn: async (): Promise<StatusCount[]> => {
      // Get features for this project
      const { data: features } = await supabase
        .from('features')
        .select('id, status')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      const featureIds = (features || []).map(f => f.id);

      // Get stories for these features
      let stories: any[] = [];
      if (featureIds.length > 0) {
        const { data: storyData } = await supabase
          .from('stories')
          .select('id, status')
          .in('feature_id', featureIds)
          .is('deleted_at', null);
        stories = storyData || [];
      }

      // Count by status
      const statusCounts: Record<string, number> = {};
      
      // Always include stories
      stories.forEach(item => {
        const status = item.status || 'todo';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      // Optionally include features
      if (includeFeatures) {
        (features || []).forEach(item => {
          const status = item.status || 'backlog';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
      }

      // Status color mapping using semantic CSS variable colors
      const statusColors: Record<string, string> = {
        'todo': 'hsl(var(--primary))',
        'in_progress': 'hsl(var(--chart-1))',
        'done': 'hsl(var(--chart-2))',
        'funnel': 'hsl(var(--chart-4))',
        'analyzing': 'hsl(var(--chart-3))',
        'backlog': 'hsl(var(--primary))',
        'implementing': 'hsl(var(--chart-1))',
      };

      // Convert to array
      return Object.entries(statusCounts).map(([status, count]) => ({
        status: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count,
        color: statusColors[status] || 'hsl(var(--muted-foreground))',
      }));
    },
  });
}

export function usePriorityDistribution(projectId: string, includeStories: boolean = false) {
  return useQuery({
    queryKey: ['priority-distribution', projectId, includeStories],
    queryFn: async (): Promise<PriorityCount[]> => {
      // Get feature IDs for this project
      const { data: features } = await supabase
        .from('features')
        .select('id')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      const featureIds = (features || []).map(f => f.id);

      // Get stories with priority for these features
      let stories: any[] = [];
      if (featureIds.length > 0) {
        const { data: storyData } = await supabase
          .from('stories')
          .select('id, priority')
          .in('feature_id', featureIds)
          .is('deleted_at', null);
        stories = storyData || [];
      }

      // Count by priority
      const priorityCounts: Record<Priority, number> = {
        'HIGHEST': 0,
        'HIGH': 0,
        'MEDIUM': 0,
        'LOW': 0,
        'LOWEST': 0,
      };

      stories.forEach(item => {
        const priority = (item.priority?.toUpperCase() || 'MEDIUM') as Priority;
        if (priorityCounts[priority] !== undefined) {
          priorityCounts[priority]++;
        } else {
          priorityCounts['MEDIUM']++;
        }
      });

      return Object.entries(priorityCounts).map(([priority, count]) => ({
        priority: priority as Priority,
        count,
      }));
    },
  });
}

export function useTypeDistribution(projectId: string) {
  return useQuery({
    queryKey: ['type-distribution', projectId],
    queryFn: async (): Promise<TypeCount[]> => {
      // Get features for this project
      const { data: features } = await supabase
        .from('features')
        .select('id')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      const featureCount = (features || []).length;
      const featureIds = (features || []).map(f => f.id);

      // Get stories for these features
      let storyCount = 0;
      if (featureIds.length > 0) {
        const { count } = await supabase
          .from('stories')
          .select('id', { count: 'exact', head: true })
          .in('feature_id', featureIds)
          .is('deleted_at', null);
        storyCount = count || 0;
      }

      const total = featureCount + storyCount;
      if (total === 0) {
        return [
          { type: 'FEATURE' as WorkItemType, count: 0, percentage: 0 },
          { type: 'STORY' as WorkItemType, count: 0, percentage: 0 },
        ];
      }

      return [
        { 
          type: 'STORY' as WorkItemType, 
          count: storyCount, 
          percentage: Math.round((storyCount / total) * 100) 
        },
        { 
          type: 'FEATURE' as WorkItemType, 
          count: featureCount, 
          percentage: Math.round((featureCount / total) * 100) 
        },
      ];
    },
  });
}
