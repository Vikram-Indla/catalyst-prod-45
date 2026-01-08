import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import type { Resource360Data, WorkItemAssignment, HierarchyNode, SunburstNode, SunburstMetrics } from '@/types/resource360';

export function useResource360Data(resourceId: string | null) {
  const queryClient = useQueryClient();

  // Fetch resource from resource_inventory table
  const { data: resource, isLoading: resourceLoading } = useQuery({
    queryKey: ['resource-360-profile', resourceId],
    queryFn: async () => {
      if (!resourceId) return null;
      
      // First fetch the resource_inventory record
      const { data: resourceData, error: resourceError } = await supabase
        .from('resource_inventory')
        .select('id, name, role_name, department_name, profile_id')
        .eq('id', resourceId)
        .single();
      
      if (resourceError) throw resourceError;
      
      // Fetch profile data separately if profile_id exists
      let profileData: { avatar_url?: string; email?: string } | null = null;
      if (resourceData.profile_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, email')
          .eq('id', resourceData.profile_id)
          .single();
        profileData = profile;
      }
      
      return {
        id: resourceData.id,
        profile_id: resourceData.profile_id,
        name: resourceData.name || 'Unknown',
        email: profileData?.email || '',
        role: resourceData.role_name || 'Team Member',
        department: resourceData.department_name || 'Unassigned',
        avatar_url: profileData?.avatar_url,
        currentAllocation: 0,
        availableCapacity: 100,
      } as Resource360Data;
    },
    enabled: !!resourceId,
  });

  // Get the profile_id from resource for fetching work items
  const profileId = resource?.profile_id;

  // Fetch work items assigned to this resource (using profile_id since work items are linked to profiles)
  const { data: workItems = [], isLoading: workItemsLoading } = useQuery({
    queryKey: ['resource-360-work-items', resourceId, profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const items: WorkItemAssignment[] = [];

      // Fetch stories assigned to user
      const { data: stories } = await supabase
        .from('stories')
        .select(`
          id, item_id, title, status, story_points, owner_id,
          feature:feature_id(id, item_id, title, 
            epic:epic_id(id, item_id, title,
              project:project_id(id, name)
            )
          ),
          release:release_id(version)
        `)
        .eq('owner_id', profileId);

      stories?.forEach((story: any) => {
        const isCompleted = story.status === 'Done' || story.status === 'Closed';
        items.push({
          id: story.id,
          item_id: story.item_id || `S-${story.id.slice(0, 4)}`,
          title: story.title,
          type: 'story',
          status: isCompleted ? 'completed' : 'current',
          level: 'project',
          story_points: story.story_points,
          release_version: story.release?.version,
          project: story.feature?.epic?.project,
          parent: story.feature ? {
            id: story.feature.id,
            item_id: story.feature.item_id,
            title: story.feature.title,
            type: 'feature'
          } : undefined,
        });
      });

      // Fetch features owned by user
      const { data: features } = await supabase
        .from('features')
        .select(`
          id, item_id, title, status, owner_id,
          epic:epic_id(id, item_id, title,
            project:project_id(id, name)
          ),
          release:release_id(version)
        `)
        .eq('owner_id', profileId);

      features?.forEach((feature: any) => {
        const isCompleted = feature.status === 'Done' || feature.status === 'Closed';
        items.push({
          id: feature.id,
          item_id: feature.item_id || `F-${feature.id.slice(0, 4)}`,
          title: feature.title,
          type: 'feature',
          status: isCompleted ? 'completed' : 'current',
          level: 'project',
          release_version: feature.release?.version,
          project: feature.epic?.project,
          parent: feature.epic ? {
            id: feature.epic.id,
            item_id: feature.epic.item_id,
            title: feature.epic.title,
            type: 'epic'
          } : undefined,
        });
      });

      // Fetch epics owned by user
      const { data: epics } = await supabase
        .from('epics')
        .select(`
          id, item_id, title, status, owner_id,
          project:project_id(id, name)
        `)
        .eq('owner_id', profileId);

      epics?.forEach((epic: any) => {
        const isCompleted = epic.status === 'Done' || epic.status === 'Closed';
        items.push({
          id: epic.id,
          item_id: epic.item_id || `E-${epic.id.slice(0, 4)}`,
          title: epic.title,
          type: 'epic',
          status: isCompleted ? 'completed' : 'current',
          level: 'program',
          project: epic.project,
        });
      });

      // Fetch defects assigned to user
      const { data: defects } = await supabase
        .from('defects')
        .select(`
          id, defect_id, title, workflow_status, assignee_id,
          project:project_id(id, name)
        `)
        .eq('assignee_id', profileId);

      defects?.forEach((defect: any) => {
        const isCompleted = defect.workflow_status === 'Closed' || defect.workflow_status === 'Resolved';
        items.push({
          id: defect.id,
          item_id: defect.defect_id || `D-${defect.id.slice(0, 4)}`,
          title: defect.title,
          type: 'defect',
          status: isCompleted ? 'completed' : 'current',
          level: 'project',
          project: defect.project,
        });
      });

      return items;
    },
    enabled: !!profileId,
  });

  // Build hierarchy tree from work items
  const hierarchyData = useMemo((): HierarchyNode[] => {
    if (!workItems.length) return [];

    // Group items by their root theme/epic
    const themeMap = new Map<string, HierarchyNode>();
    const epicMap = new Map<string, HierarchyNode>();
    const featureMap = new Map<string, HierarchyNode>();

    workItems.forEach(item => {
      if (item.type === 'epic') {
        if (!epicMap.has(item.id)) {
          epicMap.set(item.id, {
            id: item.id,
            item_id: item.item_id,
            title: item.title,
            type: 'epic',
            status: item.status === 'completed' ? 'completed' : 'current',
            level: 'program',
            project: item.project?.name,
            children: [],
          });
        }
      } else if (item.type === 'feature') {
        if (!featureMap.has(item.id)) {
          featureMap.set(item.id, {
            id: item.id,
            item_id: item.item_id,
            title: item.title,
            type: 'feature',
            status: item.status === 'completed' ? 'completed' : 'current',
            level: 'project',
            project: item.project?.name,
            release_version: item.release_version,
            children: [],
          });
        }
        // Link to parent epic
        if (item.parent?.type === 'epic' && item.parent.id) {
          if (!epicMap.has(item.parent.id)) {
            epicMap.set(item.parent.id, {
              id: item.parent.id,
              item_id: item.parent.item_id,
              title: item.parent.title,
              type: 'epic',
              status: 'current',
              level: 'program',
              project: item.project?.name,
              children: [],
            });
          }
        }
      } else if (item.type === 'story') {
        const storyNode: HierarchyNode = {
          id: item.id,
          item_id: item.item_id,
          title: item.title,
          type: 'story',
          status: item.status === 'completed' ? 'completed' : 'current',
          level: 'project',
          story_points: item.story_points,
          release_version: item.release_version,
        };

        // Link to parent feature
        if (item.parent?.type === 'feature' && item.parent.id) {
          if (!featureMap.has(item.parent.id)) {
            featureMap.set(item.parent.id, {
              id: item.parent.id,
              item_id: item.parent.item_id,
              title: item.parent.title,
              type: 'feature',
              status: 'current',
              level: 'project',
              project: item.project?.name,
              children: [],
            });
          }
          featureMap.get(item.parent.id)?.children?.push(storyNode);
        }
      }
    });

    // Link features to epics
    featureMap.forEach(feature => {
      const parentItem = workItems.find(w => w.type === 'feature' && w.id === feature.id);
      if (parentItem?.parent?.type === 'epic') {
        epicMap.get(parentItem.parent.id)?.children?.push(feature);
      }
    });

    // Return root nodes (epics and unparented items)
    const roots: HierarchyNode[] = [];
    epicMap.forEach(epic => roots.push(epic));

    // Add standalone features
    featureMap.forEach(feature => {
      const parentItem = workItems.find(w => w.type === 'feature' && w.id === feature.id);
      if (!parentItem?.parent) {
        roots.push(feature);
      }
    });

    return roots;
  }, [workItems]);

  // Build sunburst data from work items
  const sunburstData = useMemo((): { data: SunburstNode; metrics: SunburstMetrics } => {
    const metrics: SunburstMetrics = {
      totalItems: workItems.length,
      totalStoryPoints: workItems.reduce((sum, item) => sum + (item.story_points || 0), 0),
      itemsByType: {},
    };

    // Count items by type
    workItems.forEach(item => {
      metrics.itemsByType[item.type] = (metrics.itemsByType[item.type] || 0) + 1;
    });

    // Build sunburst hierarchy
    const typeColors: Record<string, string> = {
      theme: '#4d8b4d',
      epic: '#2563eb',
      feature: '#0d9488',
      story: '#8b7355',
      defect: '#dc2626',
      incident: '#d97706',
    };

    const children: SunburstNode[] = Object.entries(metrics.itemsByType).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      color: typeColors[type] || '#6b7280',
      type,
    }));

    return {
      data: {
        name: resource?.name || 'Resource',
        children,
      },
      metrics,
    };
  }, [workItems, resource]);

  // Real-time subscription (use profileId for work item subscriptions)
  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel(`resource-360-${resourceId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'stories', filter: `owner_id=eq.${profileId}` },
        () => queryClient.invalidateQueries({ queryKey: ['resource-360-work-items', resourceId, profileId] })
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'features', filter: `owner_id=eq.${profileId}` },
        () => queryClient.invalidateQueries({ queryKey: ['resource-360-work-items', resourceId, profileId] })
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'epics', filter: `owner_id=eq.${profileId}` },
        () => queryClient.invalidateQueries({ queryKey: ['resource-360-work-items', resourceId, profileId] })
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'defects', filter: `assignee_id=eq.${profileId}` },
        () => queryClient.invalidateQueries({ queryKey: ['resource-360-work-items', resourceId, profileId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resourceId, profileId, queryClient]);

  const currentItems = workItems.filter(w => w.status === 'current' || w.status === 'future');
  const pastItems = workItems.filter(w => w.status === 'completed' || w.status === 'cancelled');

  return {
    resource,
    workItems,
    currentItems,
    pastItems,
    hierarchyData,
    sunburstData: sunburstData.data,
    sunburstMetrics: sunburstData.metrics,
    isLoading: resourceLoading || workItemsLoading,
  };
}
