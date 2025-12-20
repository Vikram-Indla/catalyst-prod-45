import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkItem, WorkItemType, WorkItemWithChildren, WorkHubFilters, StatusCategory, STATUS_CATEGORY_MAP } from '../types';

// Map database status to status category
const getStatusCategory = (status: string): StatusCategory => {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower === 'done' || statusLower === 'completed' || statusLower === 'closed') {
    return 'DONE';
  }
  if (statusLower === 'in_progress' || statusLower === 'in progress' || statusLower === 'active' || statusLower === 'in_development' || statusLower === 'in_qa') {
    return 'IN_PROGRESS';
  }
  return 'TODO';
};

export function useWorkItems(projectId: string, filters?: Partial<WorkHubFilters>) {
  return useQuery({
    queryKey: ['work-items', projectId, filters],
    queryFn: async () => {
      // Fetch real features from the database
      const { data: features, error } = await supabase
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
          epics (
            id,
            epic_key,
            name
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null);

      if (error) {
        console.error('Error fetching features:', error);
        throw error;
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
        createdAt: feature.created_at,
        updatedAt: feature.updated_at,
        commentsCount: 0,
        epicId: feature.epic_id || undefined,
        epicKey: feature.epics?.epic_key || undefined,
        epicName: feature.epics?.name || undefined,
      }));

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
        roots.push(node);
      }
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
    mutationFn: async ({ itemId, newStatus }: { itemId: string; newStatus: string }) => {
      // TODO: Implement actual update
      console.log('Updating item', itemId, 'to status', newStatus);
      return { id: itemId, status: newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
    },
  });
}

export function useCreateWorkItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<WorkItem>) => {
      // TODO: Implement actual creation
      console.log('Creating work item', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
    },
  });
}
