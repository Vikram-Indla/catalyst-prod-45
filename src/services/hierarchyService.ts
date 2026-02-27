import { supabase } from '@/integrations/supabase/client';
import type { WorkItem } from '@/types/hierarchy';

// NO hardcoded PROJECT_ID — always passed as parameter

// Transform snake_case DB → camelCase TS
function transformWorkItem(row: any): WorkItem {
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    hierarchyLevel: row.hierarchy_level,
    hierarchyName: row.hierarchy_name,
    hierarchyColor: row.hierarchy_color,
    hierarchyColorText: row.hierarchy_color_text,
    parentId: row.parent_id,
    status: {
      id: row.status_id,
      name: row.status_name,
      color: row.status_color,
      colorText: row.status_color_text,
      isTerminal: row.status_is_terminal,
    },
    assignee: row.assignee_id ? {
      id: row.assignee_id,
      displayName: row.assignee_display_name || row.assignee_email,
      email: row.assignee_email,
    } : undefined,
    priority: row.priority_name ? {
      name: row.priority_name,
      color: row.priority_color,
      colorText: row.priority_color_text,
    } : undefined,
    fixVersion: row.fix_version_name ? {
      id: row.fix_version_id,
      name: row.fix_version_name,
    } : undefined,
    children: [],
    stats: {
      totalDescendants: Number(row.total_descendants) || 0,
      completedCount: Number(row.completed_count) || 0,
    },
    dueDate: row.due_date,
    labels: row.labels || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Build tree from flat list
function buildTree(items: WorkItem[]): WorkItem[] {
  const map = new Map<string, WorkItem>();
  const roots: WorkItem[] = [];
  items.forEach(item => { item.children = []; map.set(item.id, item); });
  items.forEach(item => {
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(item);
    } else if (!item.parentId) {
      roots.push(item);
    }
  });
  return roots;
}

export async function fetchHierarchyTree(rootId: string): Promise<WorkItem[]> {
  const { data, error } = await (supabase.rpc as any)('hi_get_hierarchy_tree', { p_root_id: rootId });
  if (error) throw error;
  const items = (data || []).map(transformWorkItem);
  return buildTree(items);
}

export async function fetchProjectWorkItems(projectId: string, filters?: {
  hierarchyLevel?: number;
  statusId?: string;
}): Promise<WorkItem[]> {
  const { data, error } = await (supabase.rpc as any)('hi_get_project_work_items', {
    p_project_id: projectId,
    p_hierarchy_level: filters?.hierarchyLevel ?? null,
    p_status_id: filters?.statusId ?? null,
  });
  if (error) throw error;
  return (data || []).map(transformWorkItem);
}

export async function fetchRootEpics(projectId: string): Promise<WorkItem[]> {
  return fetchProjectWorkItems(projectId, { hierarchyLevel: 1 });
}

export async function fetchAllWorkItemsTree(projectId: string): Promise<WorkItem[]> {
  const { data, error } = await (supabase.rpc as any)('hi_get_project_work_items', {
    p_project_id: projectId,
    p_hierarchy_level: null,
    p_status_id: null,
  });
  if (error) throw error;
  const items = (data || []).map(transformWorkItem);
  return buildTree(items);
}
