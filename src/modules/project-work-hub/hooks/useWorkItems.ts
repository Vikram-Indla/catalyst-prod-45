import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkItem, WorkItemType, WorkItemWithChildren, WorkHubFilters, StatusCategory } from '../types';
import { mapToFeatureStatus, mapToStoryStatus } from '../utils/statusMapping';
import { toast } from '@/components/ui/sonner';

// Map database status to status category
const getStatusCategory = (status: string): StatusCategory => {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower === 'done' || statusLower === 'completed' || statusLower === 'closed') {
    return 'DONE';
  }
  if (statusLower === 'in_progress' || statusLower === 'in progress' || statusLower === 'active' || statusLower === 'implementing' || statusLower === 'in_development' || statusLower === 'in_qa') {
    return 'IN_PROGRESS';
  }
  return 'TODO';
};

export function useWorkItems(projectId: string, filters?: Partial<WorkHubFilters>) {
  return useQuery({
    queryKey: ['work-items', projectId, filters],
    queryFn: async () => {
      // Fetch real features from the database for this project
      const { data: features, error: featuresError } = await supabase
        .from('features')
        .select(`
          id,
          display_id,
          name,
          status,
          created_at,
          updated_at,
          epic_id,
          estimate_points,
          owner_id,
          epics (
            id,
            epic_key,
            name
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null);

      if (featuresError) {
        console.error('Error fetching features:', featuresError);
        throw featuresError;
      }

      const featureIds = (features || []).map(f => f.id);
      
      // Fetch stories for these features
      let stories: any[] = [];
      if (featureIds.length > 0) {
        const { data: storyData, error: storiesError } = await supabase
          .from('stories')
          .select(`
            id,
            story_key,
            title,
            name,
            status,
            state,
            created_at,
            updated_at,
            feature_id,
            assignee_id,
            priority,
            story_points
          `)
          .in('feature_id', featureIds)
          .is('deleted_at', null);

        if (storiesError) {
          console.error('Error fetching stories:', storiesError);
        } else {
          stories = storyData || [];
        }
      }

      // Transform database features to WorkItem format
      let items: WorkItem[] = (features || []).map(feature => ({
        id: feature.id,
        key: feature.display_id || `F-${feature.id.slice(0, 4)}`,
        type: 'FEATURE' as WorkItemType,
        summary: feature.name || 'Untitled Feature',
        status: feature.status || 'open',
        statusCategory: getStatusCategory(feature.status || 'open'),
        priority: 'MEDIUM' as any,
        createdAt: feature.created_at || new Date().toISOString(),
        updatedAt: feature.updated_at || new Date().toISOString(),
        commentsCount: 0,
        epicId: feature.epic_id || undefined,
        epicKey: feature.epics?.epic_key || undefined,
        epicName: feature.epics?.name || undefined,
      }));

      // Transform stories to WorkItem format
      const storyItems: WorkItem[] = stories.map(story => ({
        id: story.id,
        key: story.story_key || `S-${story.id.slice(0, 4)}`,
        type: 'STORY' as WorkItemType,
        summary: story.title || story.name || 'Untitled Story',
        status: story.status || story.state || 'backlog',
        statusCategory: getStatusCategory(story.status || story.state || 'backlog'),
        priority: (story.priority || 'MEDIUM') as any,
        createdAt: story.created_at || new Date().toISOString(),
        updatedAt: story.updated_at || new Date().toISOString(),
        commentsCount: 0,
        parentId: story.feature_id,
        storyPoints: story.story_points,
      }));

      items = [...items, ...storyItems];

      // Apply filters
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        items = items.filter(item => 
          item.summary.toLowerCase().includes(search) ||
          item.key.toLowerCase().includes(search)
        );
      }
      
      if (filters?.types && filters.types.length > 0) {
        items = items.filter(item => filters.types!.includes(item.type));
      }
      
      if (filters?.statuses && filters.statuses.length > 0) {
        items = items.filter(item => filters.statuses!.includes(item.status));
      }
      
      if (filters?.priorities && filters.priorities.length > 0) {
        items = items.filter(item => filters.priorities!.includes(item.priority));
      }
      
      if (filters?.unassigned) {
        items = items.filter(item => !item.assigneeName);
      }
      
      return items;
    },
  });
}

export function useWorkItemsHierarchy(projectId: string) {
  const { data: items, ...rest } = useWorkItems(projectId);
  
  // Build hierarchy tree
  const buildTree = (items: WorkItem[]): WorkItemWithChildren[] => {
    const itemMap = new Map<string, WorkItemWithChildren>();
    const roots: WorkItemWithChildren[] = [];
    
    // First pass: create all nodes
    items.forEach(item => {
      itemMap.set(item.id, {
        ...item,
        children: [],
        hasChildren: false,
        level: 0,
      });
    });
    
    // Second pass: build relationships
    items.forEach(item => {
      const node = itemMap.get(item.id)!;
      if (item.parentId && itemMap.has(item.parentId)) {
        const parent = itemMap.get(item.parentId)!;
        parent.children.push(node);
        parent.hasChildren = true;
        node.level = parent.level + 1;
      } else if (item.type === 'FEATURE') {
        // Features are root items
        roots.push(node);
      }
      // Stories without a valid parent feature are orphaned - skip them
    });
    
    return roots;
  };
  
  return {
    ...rest,
    data: items ? buildTree(items) : [],
    flat: items || [],
  };
}

export function useWorkItemsByStatus(projectId: string) {
  const { data: items, ...rest } = useWorkItems(projectId, { types: ['STORY'] });
  
  const grouped = items?.reduce((acc, item) => {
    const status = item.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(item);
    return acc;
  }, {} as Record<string, WorkItem[]>) || {};
  
  return { ...rest, data: grouped };
}

export function useWorkItemsByAssignee(projectId: string) {
  const { data: items, ...rest } = useWorkItems(projectId, { types: ['STORY'] });
  
  const grouped = items?.reduce((acc, item) => {
    const assignee = item.assigneeName || 'Unassigned';
    if (!acc[assignee]) {
      acc[assignee] = {
        name: assignee,
        avatar: item.assigneeAvatar,
        items: [],
      };
    }
    acc[assignee].items.push(item);
    return acc;
  }, {} as Record<string, { name: string; avatar?: string; items: WorkItem[] }>) || {};
  
  // Sort to put Unassigned at the end
  const sorted = Object.values(grouped).sort((a, b) => {
    if (a.name === 'Unassigned') return 1;
    if (b.name === 'Unassigned') return -1;
    return a.name.localeCompare(b.name);
  });
  
  return { ...rest, data: sorted };
}

export function useUpdateWorkItemStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, newStatus, itemType }: { itemId: string; newStatus: string; itemType?: 'FEATURE' | 'STORY' }) => {
      let updated = false;
      
      // Map status to valid enum value based on item type
      if (itemType === 'FEATURE') {
        const mappedStatus = mapToFeatureStatus(newStatus);
        const { data: featureData, error: featureError } = await supabase
          .from('features')
          .update({ status: mappedStatus, updated_at: new Date().toISOString() })
          .eq('id', itemId)
          .select('id')
          .single();
        
        if (featureData && !featureError) {
          updated = true;
        } else if (featureError) {
          throw new Error(`Failed to update feature status: ${featureError.message}`);
        }
      } else if (itemType === 'STORY') {
        const mappedStatus = mapToStoryStatus(newStatus);
        const { data: storyData, error: storyError } = await supabase
          .from('stories')
          .update({ status: mappedStatus, updated_at: new Date().toISOString() })
          .eq('id', itemId)
          .select('id')
          .single();
        
        if (storyData && !storyError) {
          updated = true;
        } else if (storyError) {
          throw new Error(`Failed to update story status: ${storyError.message}`);
        }
      } else {
        // If type is unknown, try features first, then stories
        const featureMappedStatus = mapToFeatureStatus(newStatus);
        const { data: featureData, error: featureError } = await supabase
          .from('features')
          .update({ status: featureMappedStatus, updated_at: new Date().toISOString() })
          .eq('id', itemId)
          .select('id')
          .single();
        
        if (featureData && !featureError) {
          updated = true;
        } else {
          // Try stories
          const storyMappedStatus = mapToStoryStatus(newStatus);
          const { data: storyData, error: storyError } = await supabase
            .from('stories')
            .update({ status: storyMappedStatus, updated_at: new Date().toISOString() })
            .eq('id', itemId)
            .select('id')
            .single();
          
          if (storyData && !storyError) {
            updated = true;
          } else if (storyError) {
            throw new Error(`Failed to update status: ${storyError.message}`);
          }
        }
      }
      
      if (!updated) {
        throw new Error('Work item not found');
      }
      
      return { id: itemId, status: newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

export function useCreateWorkItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<WorkItem>) => {
      // This is a legacy fallback - Feature and Story have their own dialogs with mutations
      throw new Error('Use specific create dialogs for features/stories');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
    },
  });
}
