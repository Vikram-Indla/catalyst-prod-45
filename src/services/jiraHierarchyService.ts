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

  let fixVersion: WorkItem['fixVersion'] | undefined;
  if (row.fix_versions && Array.isArray(row.fix_versions) && row.fix_versions.length > 0) {
    const v = row.fix_versions[0];
    fixVersion = { id: v.id || v.name, name: v.name };
  }

  return {
    id: row.issue_key,
    key: row.issue_key,
    title: row.summary,
    hierarchyLevel: typeInfo.level,
    hierarchyName: typeInfo.name,
    hierarchyColor: typeInfo.color,
    hierarchyColorText: typeInfo.colorText,
    parentId: row.parent_key || null,
    parentKey: row.parent_key || null,
    parentSummary: row.parent_summary || null,
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
    issueType: row.issue_type,
    source: 'jira',
  };
}

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

function buildJiraTree(items: WorkItem[]): WorkItem[] {
  const map = new Map<string, WorkItem>();
  const roots: WorkItem[] = [];
  items.forEach(item => { item.children = []; map.set(item.id, item); });
  items.forEach(item => {
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(item);
    } else if (!item.parentId) {
      roots.push(item);
    } else if (item.parentId && !map.has(item.parentId)) {
      roots.push(item);
    }
  });
  roots.forEach(computeStats);
  return roots;
}

/** Fetch overrides and apply them on top of Jira parent_key */
async function fetchOverrides(projectKey: string): Promise<Map<string, string | null>> {
  const { data, error } = await supabase
    .from('ph_hierarchy_overrides')
    .select('issue_key, new_parent_key')
    .eq('project_key', projectKey.toUpperCase());

  if (error) {
    console.warn('Failed to fetch hierarchy overrides:', error.message);
    return new Map();
  }

  const overrides = new Map<string, string | null>();
  for (const row of data || []) {
    overrides.set(row.issue_key, row.new_parent_key);
  }
  return overrides;
}

export async function fetchJiraHierarchyTree(projectKey: string): Promise<WorkItem[]> {
  // Fetch Jira issues and local overrides in parallel
  const [issuesResult, overrides] = await Promise.all([
    supabase
      .from('ph_issues')
      .select('issue_key, project_key, issue_type, summary, status, status_category, priority, assignee_account_id, assignee_display_name, parent_key, parent_summary, fix_versions, due_date, labels, jira_created_at, jira_updated_at')
      .eq('project_key', projectKey.toUpperCase())
      .is('jira_removed_at', null)
      .order('jira_created_at', { ascending: true })
      .limit(2000),
    fetchOverrides(projectKey),
  ]);

  if (issuesResult.error) throw issuesResult.error;

  const items = (issuesResult.data || []).map(transformJiraIssue);

  // Build a key→summary lookup to enrich parentSummary for overrides
  const summaryByKey = new Map<string, string>();
  for (const item of items) {
    summaryByKey.set(item.id, item.title);
  }

  // Apply overrides and update parentSummary if needed
  for (const item of items) {
    if (overrides.has(item.id)) {
      item.parentId = overrides.get(item.id) ?? null;
      item.parentKey = item.parentId;
      // Re-resolve parentSummary for overridden parents
      if (item.parentKey) {
        item.parentSummary = summaryByKey.get(item.parentKey) || item.parentSummary;
      }
    }
  }

  return buildJiraTree(items);
}

/** Save a hierarchy override (upsert) */
export async function saveHierarchyOverride(
  projectKey: string,
  issueKey: string,
  newParentKey: string | null,
  originalParentKey: string | null,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('ph_hierarchy_overrides')
    .upsert({
      project_key: projectKey.toUpperCase(),
      issue_key: issueKey,
      new_parent_key: newParentKey,
      original_parent_key: originalParentKey,
      moved_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_key,issue_key' });

  if (error) throw error;
}
