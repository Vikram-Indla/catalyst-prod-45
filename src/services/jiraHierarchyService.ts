import { supabase } from '@/integrations/supabase/client';
import type { WorkItem } from '@/types/hierarchy';

/**
 * Map Jira issue_type to hierarchy level
 */
function issueTypeToLevel(type: string): { level: number; name: string; color: string; colorText: string } {
  switch (type) {
    case 'Epic':
      return { level: 1, name: 'Epic', color: '#2563EB', colorText: '#1D4ED8' };
    case 'Story':
      return { level: 3, name: 'Story', color: '#16A34A', colorText: '#15803D' };
    case 'Sub-task':
      return { level: 4, name: 'Sub-task', color: '#64748B', colorText: '#475569' };
    case 'QA Bug':
      return { level: 3, name: 'QA Bug', color: '#DC2626', colorText: '#B91C1C' };
    case 'Frontend':
      return { level: 3, name: 'Frontend', color: '#0891B2', colorText: '#0E7490' };
    case 'Backend':
      return { level: 3, name: 'Backend', color: '#7C3AED', colorText: '#6D28D9' };
    case 'Task':
      return { level: 3, name: 'Task', color: '#D97706', colorText: '#B45309' };
    case 'Production Incident':
      return { level: 3, name: 'Incident', color: '#DC2626', colorText: '#B91C1C' };
    case 'Change Request':
      return { level: 3, name: 'Change Req', color: '#EA580C', colorText: '#C2410C' };
    case 'Business Gap':
      return { level: 1, name: 'Business Gap', color: '#0D9488', colorText: '#0F766E' };
    default:
      return { level: 3, name: type, color: '#64748B', colorText: '#475569' };
  }
}

/**
 * Map Jira status_category to status colors
 */
function statusCategoryToColors(category: string): { color: string; colorText: string; isTerminal: boolean } {
  switch (category) {
    case 'Done':
      return { color: '#16A34A', colorText: '#15803D', isTerminal: true };
    case 'In Progress':
      return { color: '#2563EB', colorText: '#1D4ED8', isTerminal: false };
    case 'To Do':
    default:
      return { color: '#64748B', colorText: '#475569', isTerminal: false };
  }
}

function priorityToObj(priority: string | null): WorkItem['priority'] | undefined {
  if (!priority) return undefined;
  return { name: priority, color: '#64748B', colorText: '#475569' };
}

function transformJiraIssue(row: any): WorkItem {
  const typeInfo = issueTypeToLevel(row.issue_type);
  const statusColors = statusCategoryToColors(row.status_category);

  // Extract fix version from JSONB array
  let fixVersion: WorkItem['fixVersion'] | undefined;
  if (row.fix_versions && Array.isArray(row.fix_versions) && row.fix_versions.length > 0) {
    const v = row.fix_versions[0];
    fixVersion = { id: v.id || v.name, name: v.name };
  }

  return {
    id: row.issue_key, // Use issue_key as ID since ph_issues has no UUID id
    key: row.issue_key,
    title: row.summary,
    hierarchyLevel: typeInfo.level,
    hierarchyName: typeInfo.name,
    hierarchyColor: typeInfo.color,
    hierarchyColorText: typeInfo.colorText,
    parentId: row.parent_key || null,
    status: {
      id: row.status,
      name: row.status,
      color: statusColors.color,
      colorText: statusColors.colorText,
      isTerminal: statusColors.isTerminal,
    },
    assignee: row.assignee_display_name ? {
      id: row.assignee_account_id || row.assignee_display_name,
      displayName: row.assignee_display_name,
      email: '',
    } : undefined,
    priority: priorityToObj(row.priority),
    fixVersion,
    children: [],
    stats: { totalDescendants: 0, completedCount: 0 },
    dueDate: row.due_date || undefined,
    labels: Array.isArray(row.labels) ? row.labels : [],
    createdAt: row.jira_created_at,
    updatedAt: row.jira_updated_at,
  };
}

/** Compute stats recursively after tree is built */
function computeStats(item: WorkItem): { total: number; completed: number } {
  let total = 0;
  let completed = 0;
  for (const child of item.children) {
    total += 1;
    if (child.status.isTerminal) completed += 1;
    const childStats = computeStats(child);
    total += childStats.total;
    completed += childStats.completed;
  }
  item.stats = { totalDescendants: total, completedCount: completed };
  return { total, completed };
}

/** Build tree from flat list using parent_key → issue_key */
function buildJiraTree(items: WorkItem[]): WorkItem[] {
  const map = new Map<string, WorkItem>();
  const roots: WorkItem[] = [];
  items.forEach(item => { item.children = []; map.set(item.id, item); });
  items.forEach(item => {
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(item);
    } else if (!item.parentId) {
      roots.push(item);
    }
    // If parent_key exists but not in our data set, treat as root
    else if (item.parentId && !map.has(item.parentId)) {
      roots.push(item);
    }
  });
  // Compute stats after tree structure
  roots.forEach(computeStats);
  return roots;
}

export async function fetchJiraHierarchyTree(projectKey: string): Promise<WorkItem[]> {
  const { data, error } = await supabase
    .from('ph_issues')
    .select('issue_key, project_key, issue_type, summary, status, status_category, priority, assignee_account_id, assignee_display_name, parent_key, fix_versions, due_date, labels, jira_created_at, jira_updated_at')
    .eq('project_key', projectKey.toUpperCase())
    .is('jira_removed_at', null)
    .order('jira_created_at', { ascending: true })
    .limit(2000);

  if (error) throw error;
  const items = (data || []).map(transformJiraIssue);
  return buildJiraTree(items);
}
