/**
 * WorkHub Service Layer — DYNAMITE V2 Stage D (Sacred Gate)
 * CRUD operations against ph_issues via workhub_items_view
 * ZERO mock data. All real Supabase queries.
 */
import { supabase } from '@/integrations/supabase/client';
import type { FilterConfig, SortConfig, BulkOperation } from '@/types/workhub';

// ═══ Normalized WorkHub item from the view ═══
export interface WorkHubItem {
  id: string;
  issue_key: string;
  project_key: string;
  project_name: string | null;
  issue_type: string;
  summary: string;
  description_text: string | null;
  status: string;
  status_category: string;
  priority: string;
  assignee_account_id: string | null;
  assignee_display_name: string | null;
  reporter_account_id: string | null;
  reporter_display_name: string | null;
  parent_key: string | null;
  parent_summary: string | null;
  story_points: number | null;
  due_date: string | null;
  labels: any;
  components: any;
  sprint_name: string | null;
  fix_versions: any;
  resolution: string | null;
  source: string | null;
  sort_order: number | null;
  deleted_at: string | null;
  jira_created_at: string | null;
  jira_updated_at: string | null;
  synced_at: string | null;
  theme_id: string | null;
  type_icon_url: string | null;
  child_count: number;
  completed_child_count: number;
}

export interface WorkHubActivityEntry {
  id: string;
  issue_key: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  comment_text: string | null;
  created_at: string;
}

// ═══ STATUS → STATUS_CATEGORY MAP ═══
const STATUS_TO_CATEGORY: Record<string, string> = {
  'Backlog': 'To Do', 'In Requirements': 'To Do', 'To Do': 'To Do', 'Open': 'To Do',
  'In Progress': 'In Progress', 'In Review': 'In Progress', 'In Development': 'In Progress',
  'In Beta': 'In Progress', 'In UAT': 'In Progress', 'In QA': 'In Progress', 'Ready for QA': 'In Progress',
  'Done': 'Done', 'Closed': 'Done', 'In Production': 'Done', 'Released': 'Done',
};

export function deriveStatusCategory(status: string): string {
  return STATUS_TO_CATEGORY[status] || 'To Do';
}

// ═══ READ ═══
export async function fetchWorkItems(
  projectKey: string,
  filters?: FilterConfig,
  sort?: SortConfig
): Promise<WorkHubItem[]> {
  let query = supabase
    .from('workhub_items_view' as any)
    .select('*')
    .eq('project_key', projectKey);

  if (filters?.statuses?.length) {
    query = query.in('status', filters.statuses);
  }
  if (filters?.types?.length) {
    query = query.in('issue_type', filters.types);
  }
  if (filters?.priorities?.length) {
    query = query.in('priority', filters.priorities);
  }
  if (filters?.assignee_ids?.length) {
    query = query.in('assignee_account_id', filters.assignee_ids);
  }
  if (filters?.search_query) {
    query = query.or(
      `summary.ilike.%${filters.search_query}%,issue_key.ilike.%${filters.search_query}%`
    );
  }

  if (sort) {
    const colMap: Record<string, string> = {
      key: 'issue_key',
      type: 'issue_type',
      assignee_id: 'assignee_account_id',
      created_at: 'jira_created_at',
      updated_at: 'jira_updated_at',
      created: 'jira_created_at',
      updated: 'jira_updated_at',
      points: 'story_points',
    };
    const col = colMap[sort.column] || sort.column;
    query = query.order(col, { ascending: sort.direction === 'asc' });
  } else {
    query = query.order('sort_order', { ascending: true });
  }

  query = query.limit(2000);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as WorkHubItem[];
}

export async function fetchWorkItem(itemId: string): Promise<WorkHubItem> {
  const { data, error } = await supabase
    .from('workhub_items_view' as any)
    .select('*')
    .eq('id', itemId)
    .single();
  if (error) throw error;
  return data as unknown as WorkHubItem;
}

// ═══ CREATE ═══
export async function createWorkItem(payload: {
  summary: string;
  issue_type: string;
  status: string;
  status_category: string;
  priority: string;
  project_key: string;
  project_id: string;
  assignee_display_name?: string | null;
  assignee_account_id?: string | null;
  description_text?: string | null;
  due_date?: string | null;
  story_points?: number | null;
  parent_id?: string | null;
}): Promise<WorkHubItem> {
  // Generate next issue_key
  const { data: maxKeyRow } = await supabase
    .from('ph_issues')
    .select('issue_key')
    .eq('project_key', payload.project_key)
    .order('issue_key', { ascending: false })
    .limit(1)
    .single();

  let nextNum = 1;
  if (maxKeyRow?.issue_key) {
    const match = maxKeyRow.issue_key.match(/-(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  const issue_key = `${payload.project_key}-${nextNum}`;

  // Get max sort_order
  const { data: maxSortRow } = await supabase
    .from('ph_issues')
    .select('sort_order')
    .eq('project_key', payload.project_key)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();
  const sort_order = ((maxSortRow as any)?.sort_order ?? 0) + 1;

  const insertPayload = {
    issue_key,
    summary: payload.summary,
    issue_type: payload.issue_type,
    status: payload.status,
    status_category: payload.status_category,
    priority: payload.priority,
    project_key: payload.project_key,
    project_id: payload.project_id,
    assignee_display_name: payload.assignee_display_name || null,
    assignee_account_id: payload.assignee_account_id || null,
    description_text: payload.description_text || null,
    due_date: payload.due_date || null,
    story_points: payload.story_points ?? null,
    sort_order,
    source: 'manual',
    jira_created_at: new Date().toISOString(),
    jira_updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('ph_issues')
    .insert(insertPayload as any)
    .select()
    .single();
  if (error) throw error;

  // Log activity
  await supabase.from('workhub_activity').insert({
    issue_key,
    actor_name: 'Current User',
    action: 'created',
  });

  return data as unknown as WorkHubItem;
}

// ═══ UPDATE ═══
export async function updateWorkItem(
  itemId: string,
  updates: Record<string, any>
): Promise<void> {
  // Fetch old values for activity logging
  const { data: oldItem } = await supabase
    .from('ph_issues')
    .select('status, priority, assignee_account_id, assignee_display_name, story_points, summary, issue_key, status_category')
    .eq('id', itemId)
    .single();

  // Auto-calculate status_category when status changes
  if (updates.status && !updates.status_category) {
    updates.status_category = deriveStatusCategory(updates.status);
  }

  const { error } = await supabase
    .from('ph_issues')
    .update(updates)
    .eq('id', itemId);
  if (error) throw error;

  // Log field-level activity
  if (oldItem) {
    const trackedFields = ['status', 'assignee_display_name', 'priority', 'story_points', 'summary'];
    for (const field of trackedFields) {
      if (updates[field] !== undefined && oldItem[field] !== updates[field]) {
        await supabase.from('workhub_activity').insert({
          issue_key: oldItem.issue_key,
          actor_name: 'Current User',
          action: field === 'status' ? 'status_changed' : field === 'assignee_display_name' ? 'assigned' : 'updated',
          field_changed: field,
          old_value: String(oldItem[field] ?? ''),
          new_value: String(updates[field] ?? ''),
        });
      }
    }
  }
}

// ═══ DELETE (soft) ═══
export async function deleteWorkItem(itemId: string): Promise<void> {
  const { data: item } = await supabase
    .from('ph_issues')
    .select('issue_key')
    .eq('id', itemId)
    .single();

  const { error } = await supabase
    .from('ph_issues')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', itemId);
  if (error) throw error;

  if (item) {
    await supabase.from('workhub_activity').insert({
      issue_key: item.issue_key,
      actor_name: 'Current User',
      action: 'deleted',
    });
  }
}

// ═══ UNDO DELETE ═══
export async function undoDeleteWorkItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('ph_issues')
    .update({ deleted_at: null })
    .eq('id', itemId);
  if (error) throw error;
}

// ═══ BULK OPERATIONS ═══
export async function bulkUpdateWorkItems(operation: BulkOperation): Promise<void> {
  if (operation.type === 'delete') {
    const { error } = await supabase
      .from('ph_issues')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', operation.item_ids);
    if (error) throw error;
    return;
  }

  const fieldMap: Record<string, string> = {
    status_change: 'status',
    assignee_change: 'assignee_display_name',
    priority_change: 'priority',
  };
  const field = fieldMap[operation.type];
  if (!field || !operation.value) return;

  const updatePayload: Record<string, any> = { [field]: operation.value };

  // Auto-calc status_category on bulk status change
  if (operation.type === 'status_change') {
    updatePayload.status_category = deriveStatusCategory(operation.value);
  }

  const { error } = await supabase
    .from('ph_issues')
    .update(updatePayload)
    .in('id', operation.item_ids);
  if (error) throw error;
}

// ═══ REORDER ═══
export async function reorderWorkItem(itemId: string, newSortOrder: number): Promise<void> {
  const { error } = await supabase
    .from('ph_issues')
    .update({ sort_order: newSortOrder })
    .eq('id', itemId);
  if (error) throw error;
}

// ═══ ACTIVITY ═══
export async function fetchActivity(issueKey: string): Promise<WorkHubActivityEntry[]> {
  const { data, error } = await supabase
    .from('workhub_activity')
    .select('*')
    .eq('issue_key', issueKey)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as WorkHubActivityEntry[];
}

export async function addComment(issueKey: string, commentText: string): Promise<WorkHubActivityEntry> {
  const { data, error } = await supabase
    .from('workhub_activity')
    .insert({
      issue_key: issueKey,
      actor_name: 'Current User',
      action: 'commented',
      comment_text: commentText,
    })
    .select()
    .single();
  if (error) throw error;
  return data as WorkHubActivityEntry;
}

// ═══ SAVED VIEWS ═══
export async function fetchSavedViews(projectKey: string) {
  const { data, error } = await supabase
    .from('workhub_saved_views')
    .select('*')
    .eq('project_key', projectKey)
    .order('name');
  if (error) throw error;
  return data;
}

export async function saveSavedView(view: Record<string, any>) {
  const { data, error } = await supabase
    .from('workhub_saved_views')
    .upsert(view as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ═══ STATUS TRANSITIONS ═══
export async function fetchTransitions(workItemId: string) {
  const { data, error } = await supabase
    .from('work_item_transitions' as any)
    .select('*')
    .eq('work_item_id', workItemId)
    .order('transitioned_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as any[];
}

// ═══ COMMENTS (new table) ═══
export async function fetchWorkItemComments(workItemId: string) {
  const { data, error } = await supabase
    .from('work_item_comments' as any)
    .select('*')
    .eq('work_item_id', workItemId)
    .order('comment_created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function addWorkItemComment(workItemId: string, bodyText: string) {
  const { data, error } = await supabase
    .from('work_item_comments' as any)
    .insert({
      work_item_id: workItemId,
      author_name: 'Current User',
      body_text: bodyText,
      comment_created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as any;
}

// ═══ CHANGELOGS ═══
export async function fetchChangelogs(workItemId: string) {
  const { data, error } = await supabase
    .from('work_item_changelogs' as any)
    .select('*')
    .eq('work_item_id', workItemId)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as any[];
}

// ═══ CYCLE TIME ═══
export async function fetchCycleTime(workItemId: string) {
  const { data, error } = await supabase
    .from('work_item_cycle_time_view' as any)
    .select('*')
    .eq('work_item_id', workItemId)
    .order('entered_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function fetchCycleSummary(workItemId: string) {
  const { data, error } = await supabase
    .from('work_item_cycle_summary_view' as any)
    .select('*')
    .eq('work_item_id', workItemId);
  if (error) throw error;
  return (data ?? []) as any[];
}
