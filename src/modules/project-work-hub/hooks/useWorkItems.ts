import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkItem, WorkItemType, WorkItemWithChildren, WorkHubFilters, StatusCategory, STATUS_CATEGORY_MAP } from '../types';

// Mock data for development - will be replaced with real queries
const generateMockWorkItems = (projectId: string): WorkItem[] => {
  const items: WorkItem[] = [];
  const now = new Date();
  
  // Generate Features
  for (let f = 1; f <= 3; f++) {
    const featureId = `feature-${f}`;
    items.push({
      id: featureId,
      key: `PRJ-${f}`,
      type: 'FEATURE',
      summary: `Feature ${f}: ${['User Authentication System', 'Payment Gateway Integration', 'Dashboard Analytics'][f-1]}`,
      status: ['in_progress', 'done', 'open'][f-1],
      statusCategory: ['IN_PROGRESS', 'DONE', 'TODO'][f-1] as StatusCategory,
      priority: ['HIGH', 'MEDIUM', 'LOW'][f-1] as any,
      assigneeName: ['Ahmed Yousry', 'Waleed El-Melegy', null][f-1] || undefined,
      assigneeAvatar: f < 3 ? `https://i.pravatar.cc/32?u=${f}` : undefined,
      createdAt: new Date(now.getTime() - f * 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - f * 2 * 24 * 60 * 60 * 1000).toISOString(),
      commentsCount: f * 2,
      quarterId: 'q1-2025',
      quarterName: 'Q1 2025',
      releaseVersionId: 'rel-1',
      releaseVersionName: 'Release 1.0',
      epicId: `epic-${f}`,
      epicKey: `EPIC-${f}`,
      epicName: `Epic ${f}`,
    });

    // Generate Stories for each Feature
    for (let s = 1; s <= 4; s++) {
      const storyId = `story-${f}-${s}`;
      const storyNum = (f - 1) * 4 + s + 3;
      items.push({
        id: storyId,
        key: `PRJ-${storyNum}`,
        type: 'STORY',
        summary: `Story ${s} for Feature ${f}: ${['Login flow', 'Password reset', 'User profile', 'Session management'][s-1]}`,
        status: ['open', 'in_development', 'in_qa', 'done'][s-1],
        statusCategory: ['TODO', 'IN_PROGRESS', 'IN_PROGRESS', 'DONE'][s-1] as StatusCategory,
        priority: ['HIGH', 'MEDIUM', 'LOW', 'MEDIUM'][s-1] as any,
        assigneeName: ['Ahmed Yousry', 'Waleed El-Melegy', 'Hasan Elsherbiny', null][s-1] || undefined,
        assigneeAvatar: s < 4 ? `https://i.pravatar.cc/32?u=${f}${s}` : undefined,
        createdAt: new Date(now.getTime() - (f * 7 + s) * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - s * 24 * 60 * 60 * 1000).toISOString(),
        commentsCount: s,
        quarterId: 'q1-2025',
        quarterName: 'Q1 2025',
        releaseVersionId: 'rel-1',
        releaseVersionName: 'Release 1.0',
        parentId: featureId,
        parentKey: `PRJ-${f}`,
        subtaskCount: 2,
        defectCount: s % 2,
        incidentCount: s === 1 ? 1 : 0,
      });

      // Generate Subtasks for each Story
      for (let t = 1; t <= 2; t++) {
        const subtaskNum = storyNum * 10 + t;
        items.push({
          id: `subtask-${f}-${s}-${t}`,
          key: `PRJ-${subtaskNum}`,
          type: 'SUBTASK',
          summary: `Subtask ${t}: ${['Implementation', 'Testing'][t-1]}`,
          status: ['in_progress', 'done'][t-1],
          statusCategory: ['IN_PROGRESS', 'DONE'][t-1] as StatusCategory,
          priority: 'MEDIUM',
          assigneeName: ['Ahmed Yousry', 'Waleed El-Melegy'][t-1],
          createdAt: new Date(now.getTime() - t * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: now.toISOString(),
          commentsCount: 0,
          parentId: storyId,
          parentKey: `PRJ-${storyNum}`,
        });
      }

      // Generate Defects for some Stories
      if (s % 2 === 1) {
        const defectNum = storyNum * 10 + 5;
        items.push({
          id: `defect-${f}-${s}`,
          key: `PRJ-${defectNum}`,
          type: 'DEFECT',
          summary: `Defect: ${['Login validation error', 'Session timeout issue'][s === 1 ? 0 : 1]}`,
          status: 'open',
          statusCategory: 'TODO',
          priority: 'HIGH',
          assigneeName: 'Ahmed Yousry',
          assigneeAvatar: 'https://i.pravatar.cc/32?u=defect',
          createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: now.toISOString(),
          commentsCount: 3,
          quarterId: 'q1-2025',
          quarterName: 'Q1 2025',
          releaseVersionId: 'rel-1',
          releaseVersionName: 'Release 1.0',
          parentId: storyId,
          parentKey: `PRJ-${storyNum}`,
        });
      }

      // Generate Incident for first Story
      if (s === 1) {
        const incidentNum = storyNum * 10 + 6;
        items.push({
          id: `incident-${f}-${s}`,
          key: `PRJ-${incidentNum}`,
          type: 'INCIDENT',
          summary: `Production Incident: Service degradation`,
          status: 'in_progress',
          statusCategory: 'IN_PROGRESS',
          priority: 'HIGHEST',
          assigneeName: 'Hasan Elsherbiny',
          assigneeAvatar: 'https://i.pravatar.cc/32?u=incident',
          createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: now.toISOString(),
          commentsCount: 5,
          quarterId: 'q1-2025',
          quarterName: 'Q1 2025',
          releaseVersionId: 'rel-1',
          releaseVersionName: 'Release 1.0',
          parentId: storyId,
          parentKey: `PRJ-${storyNum}`,
        });
      }
    }
  }

  return items;
};

export function useWorkItems(projectId: string, filters?: Partial<WorkHubFilters>) {
  return useQuery({
    queryKey: ['work-items', projectId, filters],
    queryFn: async () => {
      // For now, return mock data
      // TODO: Replace with actual Supabase queries when tables are created
      let items = generateMockWorkItems(projectId);
      
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
