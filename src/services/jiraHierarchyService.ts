import { supabase } from '@/integrations/supabase/client';
import type { WorkItem } from '@/types/hierarchy';

/**
 * Map Jira issue_type to hierarchy level
 */
function issueTypeToLevel(type: string): { level: number; name: string; color: string; colorText: string } {
  switch (type) {
    case 'Epic':
      return { level: 1, name: 'Epic', color: 'var(--ds-link, #2563eb)', colorText: 'var(--ds-link-pressed, #1d4ed8)' };
    case 'Story':
      return { level: 3, name: 'Story', color: 'var(--cp-success, #16A34A)', colorText: 'var(--ds-background-success-bold, #1F845A)' };
    case 'Sub-task':
      return { level: 4, name: 'Sub-task', color: 'var(--cp-ink-3, var(--cp-text-secondary, #64748B))', colorText: 'var(--ds-text-subtle, #44546F)' };
    case 'QA Bug':
      return { level: 3, name: 'QA Bug', color: 'var(--cp-danger, #DC2626)', colorText: 'var(--ds-text-danger, #AE2A19)' };
    case 'Frontend':
// TODO: ads-unmapped — #0E7490 context unclear
      return { level: 3, name: 'Frontend', color: 'var(--ds-link, #0C66E4)', colorText: '#0E7490' };
    case 'Backend':
      return { level: 3, name: 'Backend', color: 'var(--cp-purple-60, #7C3AED)', colorText: 'var(--ds-background-discovery-bold, #6d28d9)' };
    case 'Task':
      return { level: 3, name: 'Task', color: 'var(--cp-warning, #D97706)', colorText: 'var(--ds-background-warning-bold, #b45309)' };
    case 'Production Incident':
      return { level: 3, name: 'Incident', color: 'var(--cp-danger, #DC2626)', colorText: 'var(--ds-text-danger, #AE2A19)' };
    case 'Change Request':
      return { level: 3, name: 'Change Req', color: 'var(--ds-background-warning-bold, #E2B203)', colorText: 'var(--ds-text-danger, #AE2A19)' };
    case 'Business Gap':
      return { level: 1, name: 'Business Gap', color: 'var(--cp-teal-60, #0D9488)', colorText: 'var(--ds-chart-teal-bolder, #0f766e)' };
    default:
      return { level: 3, name: type, color: 'var(--cp-ink-3, var(--cp-text-secondary, #64748B))', colorText: 'var(--ds-text-subtle, #44546F)' };
  }
}

function statusCategoryToColors(category: string): { color: string; colorText: string; isTerminal: boolean } {
  switch (category) {
    case 'Done':
      return { color: 'var(--cp-success, #16A34A)', colorText: 'var(--ds-background-success-bold, #1F845A)', isTerminal: true };
    case 'In Progress':
      return { color: 'var(--ds-link, #2563eb)', colorText: 'var(--ds-link-pressed, #1d4ed8)', isTerminal: false };
    case 'To Do':
    default:
      return { color: 'var(--cp-ink-3, var(--cp-text-secondary, #64748B))', colorText: 'var(--ds-text-subtle, #44546F)', isTerminal: false };
  }
}

function priorityToObj(priority: string | null): WorkItem['priority'] | undefined {
  if (!priority) return undefined;
  return { name: priority, color: 'var(--cp-ink-3, var(--cp-text-secondary, #64748B))', colorText: 'var(--ds-text-subtle, #44546F)' };
}

function transformJiraIssue(row: any): WorkItem {
  const typeInfo = issueTypeToLevel(row.issue_type);
  const statusColors = statusCategoryToColors(row.status_category);

  let sprintRelease: WorkItem['sprintRelease'] | undefined;
  if (row.sprint_release && Array.isArray(row.sprint_release) && row.sprint_release.length > 0) {
    const v = row.sprint_release[0];
    sprintRelease = { id: v.id || v.name, name: v.name };
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
    sprintRelease,
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
      .select('issue_key, project_key, issue_type, summary, status, status_category, priority, assignee_account_id, assignee_display_name, parent_key, parent_summary, sprint_release, due_date, labels, jira_created_at, jira_updated_at')
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
