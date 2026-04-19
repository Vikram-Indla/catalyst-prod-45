/**
 * WorkHub Service — Complete data access layer for wh_ tables
 * Reads go to wh_ views/tables with ph_issues fallback; writes go to wh_work_items.
 * ZERO hardcoded data. All from Supabase.
 */
import { supabase } from '@/integrations/supabase/client';

// ════════════════════════════════════════════════════════════════
// READ OPERATIONS
// ════════════════════════════════════════════════════════════════

async function fetchAllWorkList(
  projectId?: string,
  filters?: {
    types?: string[];
    statuses?: string[];
    priorities?: string[];
    search?: string;
    assigneeIds?: string[];
  },
  pagination?: { page: number; pageSize: number },
  sort?: { field: string; dir: 'asc' | 'desc' },
) {
  const page = pagination?.page ?? 0;
  const pageSize = pagination?.pageSize ?? 25;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  // Try wh_all_work_list first
  const { data: probe } = await supabase.from('wh_all_work_list').select('id', { count: 'exact', head: true });
  const whHasData = (probe as any)?.length > 0 || false;

  if (whHasData) {
    let q = supabase
      .from('wh_all_work_list')
      .select('*', { count: 'exact' });

    if (projectId) q = q.eq('project_id', projectId);
    if (filters?.types?.length) q = q.in('work_type_name', filters.types);
    if (filters?.statuses?.length) q = q.in('status_name', filters.statuses);
    if (filters?.priorities?.length) q = q.in('priority', filters.priorities.map(p => p.toLowerCase()) as any);
    if (filters?.assigneeIds?.length) q = q.in('assignee_id', filters.assigneeIds);
    if (filters?.search) {
      q = q.or(`summary.ilike.%${filters.search}%,item_key.ilike.%${filters.search}%`);
    }

    const sortField = sort?.field || 'updated_at';
    q = q.order(sortField, { ascending: sort?.dir === 'asc' });
    q = q.range(from, to);

    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    return {
      items: data ?? [],
      totalCount: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  }

  // Fallback to ph_issues + catalyst_issues merged
  return fetchPhIssuesFallback(projectId, filters, pagination, sort);
}

/** Fetch Catalyst-native items from catalyst_issues */
async function fetchCatalystItems(
  projectId?: string,
  filters?: {
    types?: string[];
    statuses?: string[];
    priorities?: string[];
    search?: string;
  },
) {
  let q = supabase
    .from('catalyst_issues')
    .select('*')
    .order('created_at', { ascending: false });

  if (projectId) q = q.eq('project_id', projectId);
  if (filters?.types?.length) q = q.in('issue_type', filters.types);
  if (filters?.statuses?.length) q = q.in('status', filters.statuses);
  if (filters?.priorities?.length) q = q.in('priority', filters.priorities);
  if (filters?.search) {
    q = q.or(`title.ilike.%${filters.search}%,issue_key.ilike.%${filters.search}%`);
  }

  const { data } = await q;
  return (data ?? []).map(mapCatalystIssueToListRow);
}

/** Map catalyst_issues row to the wh_all_work_list shape */
function mapCatalystIssueToListRow(row: any) {
  return {
    id: row.id,
    project_id: row.project_id,
    item_key: row.issue_key,
    key_sequence: 0,
    summary: row.title,
    description: row.description,
    priority: row.priority,
    severity: null,
    rank: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    work_type_id: null,
    work_type_name: row.issue_type,
    icon_glyph: null,
    icon_color: null,
    is_subtask: false,
    status_id: null,
    status_name: row.status,
    status_category: row.status === 'Done' ? 'done' : row.status === 'To Do' ? 'new' : 'indeterminate',
    status_color: null,
    parent_id: row.parent_id,
    parent_key: null,
    parent_summary: null,
    fix_version_id: row.release_id,
    fix_version_name: null,
    assignee_id: row.assignee_id,
    assignee_name: null,
    assignee_avatar: null,
    reporter_id: row.reporter_id,
    reporter_name: null,
    comment_count: 0,
    attachment_count: 0,
    child_count: 0,
    labels: row.tags || [],
    _source: 'catalyst' as const,
    project_key: null,
    story_points: row.story_points,
    sprint_name: row.sprint_name,
    resolution: null,
    components: [],
    fix_versions: [],
    description_text: row.description,
    comments_data: [],
    changelog: [],
  };
}

/** Fallback: read from ph_issues + catalyst_issues merged */
async function fetchPhIssuesFallback(
  projectId?: string,
  filters?: {
    types?: string[];
    statuses?: string[];
    priorities?: string[];
    search?: string;
  },
  pagination?: { page: number; pageSize: number },
  sort?: { field: string; dir: 'asc' | 'desc' },
) {
  const page = pagination?.page ?? 0;
  const pageSize = pagination?.pageSize ?? 25;

  // Fetch catalyst_issues (Catalyst-native items) in parallel with ph_issues
  const [catItems, phResult] = await Promise.all([
    fetchCatalystItems(projectId, filters),
    (async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      let q = supabase
        .from('ph_issues')
        .select('*', { count: 'exact' })
        .is('archived_at', null)
        .order('jira_updated_at', { ascending: false })
        .range(from, to);

      if (filters?.types?.length) q = q.in('issue_type', filters.types);
      if (filters?.statuses?.length) q = q.in('status', filters.statuses);
      if (filters?.priorities?.length) q = q.in('priority', filters.priorities);
      if (filters?.search) {
        q = q.or(`summary.ilike.%${filters.search}%,issue_key.ilike.%${filters.search}%`);
      }

      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return { items: (data ?? []).map(mapPhIssueToListRow), count: count ?? 0 };
    })(),
  ]);

  // Merge: catalyst items first (newest), then ph_issues
  const merged = [...catItems, ...phResult.items];
  const totalCount = catItems.length + phResult.count;

  return {
    items: merged,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/** Map a ph_issues row to the wh_all_work_list shape used by UI */
function mapPhIssueToListRow(row: any) {
  return {
    id: row.issue_key,
    project_id: null,
    item_key: row.issue_key,
    key_sequence: 0,
    summary: row.summary,
    description: row.description_text,
    priority: row.priority,
    severity: null,
    rank: null,
    created_at: row.jira_created_at,
    updated_at: row.jira_updated_at,
    work_type_id: null,
    work_type_name: row.issue_type,
    icon_glyph: null,
    icon_color: null,
    is_subtask: (row.issue_type || '').toLowerCase().includes('sub-task'),
    status_id: null,
    status_name: row.status,
    status_category: row.status_category,
    status_color: null,
    parent_id: null,
    parent_key: row.parent_key,
    parent_summary: row.parent_summary,
    fix_version_id: null,
    fix_version_name: null,
    assignee_id: row.assignee_account_id,
    assignee_name: row.assignee_display_name,
    assignee_avatar: null,
    reporter_id: null,
    reporter_name: null,
    comment_count: (row.comments || []).length,
    attachment_count: 0,
    child_count: 0,
    labels: row.labels || [],
    _source: 'ph_issues' as const,
    project_key: row.project_key,
    story_points: row.story_points,
    sprint_name: row.sprint_name,
    resolution: row.resolution,
    components: row.components,
    fix_versions: row.fix_versions,
    description_text: row.description_text,
    comments_data: row.comments || [],
    changelog: row.changelog || [],
  };
}

async function fetchWorkItemDetail(id: string) {
  // Try wh_ detail view
  const { data, error } = await supabase
    .from('wh_work_item_detail')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data;

  // Fallback: try ph_issues by issue_key
  const { data: phData, error: phErr } = await supabase
    .from('ph_issues')
    .select('*')
    .eq('issue_key', id)
    .maybeSingle();
  if (phErr) throw new Error(phErr.message);
  if (phData) return mapPhIssueToListRow(phData);
  return null;
}

async function fetchStatuses(projectId?: string) {
  let q = supabase.from('wh_statuses').select('*').eq('is_active', true).order('sort_order');
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  if (data?.length) return data;

  // Fallback: distinct statuses from ph_issues
  const { data: ph, error: phErr } = await supabase
    .from('ph_issues')
    .select('status, status_category')
    .limit(5000);
  if (phErr) throw new Error(phErr.message);
  const unique = new Map<string, string>();
  (ph || []).forEach((r: any) => unique.set(r.status, r.status_category));
  return Array.from(unique.entries()).map(([name, category], i) => ({
    id: name,
    name,
    category,
    color_key: category === 'done' ? 'green' : category === 'indeterminate' ? 'blue' : 'gray',
    sort_order: i,
    is_default: false,
  }));
}

async function fetchValidTransitions(projectId: string, fromStatusId: string) {
  const { data, error } = await supabase
    .from('wh_valid_transitions')
    .select('*')
    .eq('project_id', projectId)
    .eq('from_status_id', fromStatusId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchWorkTypes(projectId?: string) {
  let q = supabase.from('wh_work_types').select('*').eq('is_active', true).order('sort_order');
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  if (data?.length) return data;

  // Fallback
  const { data: ph } = await supabase.from('ph_issues').select('issue_type').limit(5000);
  const types = [...new Set((ph || []).map((r: any) => r.issue_type))];
  return types.map((t, i) => ({
    id: t,
    name: t,
    icon_glyph: null,
    icon_color: null,
    is_subtask: t.toLowerCase().includes('sub-task'),
    sort_order: i,
  }));
}

async function fetchFixVersions(projectId?: string) {
  let q = supabase.from('wh_fix_versions').select('*').is('deleted_at', null).order('sort_order');
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchLabels(projectId?: string) {
  let q = supabase.from('wh_labels').select('*').is('deleted_at', null).order('name');
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchLinkTypes() {
  const { data, error } = await supabase.from('wh_link_types').select('*').order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchComments(workItemId: string) {
  // Try wh_comments first
  const { data, error } = await supabase
    .from('wh_comments')
    .select('*')
    .eq('work_item_id', workItemId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  if (data?.length) return data;

  // Fallback: extract from ph_issues.comments JSONB
  const { data: ph } = await supabase
    .from('ph_issues')
    .select('comments')
    .eq('issue_key', workItemId)
    .maybeSingle();
  if (ph?.comments && Array.isArray(ph.comments)) {
    return (ph.comments as any[]).map(c => ({
      id: c.id,
      work_item_id: workItemId,
      author_id: null,
      body: c.body || '',
      is_internal: false,
      created_at: c.created,
      updated_at: c.updated,
      deleted_at: null,
      _author_name: c.author,
      _author_avatar: c.authorAvatar,
    }));
  }
  return [];
}

async function fetchWorkLogs(workItemId: string) {
  const { data, error } = await supabase
    .from('wh_work_logs')
    .select('*')
    .eq('work_item_id', workItemId)
    .is('deleted_at', null)
    .order('work_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchHistory(workItemId: string) {
  const { data, error } = await supabase
    .from('wh_history')
    .select('*')
    .eq('work_item_id', workItemId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  if (data?.length) return data;

  // Fallback: extract from ph_issues.changelog JSONB
  const { data: ph } = await supabase
    .from('ph_issues')
    .select('changelog')
    .eq('issue_key', workItemId)
    .maybeSingle();
  if (ph?.changelog && Array.isArray(ph.changelog)) {
    return (ph.changelog as any[]).map((c, i) => ({
      id: `${workItemId}-h-${i}`,
      work_item_id: workItemId,
      author_id: null,
      field_name: c.field || 'unknown',
      old_value: c.fromString || c.from || null,
      new_value: c.toString || c.to || null,
      old_display: c.fromString || null,
      new_display: c.toString || null,
      created_at: c.created || new Date().toISOString(),
      _author_name: c.author || 'System',
    }));
  }
  return [];
}

async function fetchLinks(workItemId: string) {
  const { data, error } = await supabase
    .from('wh_work_item_links')
    .select('*')
    .or(`source_item_id.eq.${workItemId},target_item_id.eq.${workItemId}`);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchDashboardStats(projectId?: string) {
  let q = supabase.from('wh_dashboard_stats').select('*');
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data;

  // Fallback from ph_issues
  const { count: total } = await supabase.from('ph_issues').select('*', { count: 'exact', head: true });
  const { count: todoC } = await supabase.from('ph_issues').select('*', { count: 'exact', head: true }).eq('status_category', 'new');
  const { count: ipC } = await supabase.from('ph_issues').select('*', { count: 'exact', head: true }).eq('status_category', 'indeterminate');
  const { count: doneC } = await supabase.from('ph_issues').select('*', { count: 'exact', head: true }).eq('status_category', 'done');
  const { count: critC } = await supabase.from('ph_issues').select('*', { count: 'exact', head: true }).eq('priority', 'Highest').neq('status_category', 'done');
  return {
    total_items: total ?? 0,
    todo_count: todoC ?? 0,
    in_progress_count: ipC ?? 0,
    done_count: doneC ?? 0,
    critical_open: critC ?? 0,
    created_this_week: 0,
    updated_today: 0,
  };
}

async function fetchTeamMembers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, email')
    .order('full_name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ════════════════════════════════════════════════════════════════
// WRITE OPERATIONS
// ════════════════════════════════════════════════════════════════

async function createWorkItem(payload: {
  project_id: string;
  summary: string;
  work_type_id: string;
  status_id: string;
  item_key: string;
  key_sequence: number;
  priority?: string;
  assignee_id?: string | null;
  reporter_id?: string | null;
  description?: string | null;
  fix_version_id?: string | null;
  parent_id?: string | null;
}) {
  const { data, error } = await supabase
    .from('wh_work_items')
    .insert({
      project_id: payload.project_id,
      summary: payload.summary,
      work_type_id: payload.work_type_id,
      status_id: payload.status_id,
      item_key: payload.item_key,
      key_sequence: payload.key_sequence,
      priority: (payload.priority?.toLowerCase() || 'medium') as any,
      assignee_id: payload.assignee_id,
      reporter_id: payload.reporter_id,
      description: payload.description,
      fix_version_id: payload.fix_version_id,
      parent_id: payload.parent_id,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateWorkItem(id: string, updates: Record<string, any>) {
  // Lowercase priority if provided to match DB enum
  if (updates.priority && typeof updates.priority === 'string') {
    updates.priority = updates.priority.toLowerCase();
  }
  const { data, error } = await supabase
    .from('wh_work_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteWorkItem(id: string) {
  const { error } = await supabase
    .from('wh_work_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

async function bulkDelete(ids: string[]) {
  const { error } = await supabase
    .from('wh_work_items')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw new Error(error.message);
}

async function bulkUpdateStatus(ids: string[], statusId: string) {
  const { error } = await supabase
    .from('wh_work_items')
    .update({ status_id: statusId, updated_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw new Error(error.message);
}

async function createComment(workItemId: string, body: string, authorId: string) {
  const { data, error } = await supabase
    .from('wh_comments')
    .insert({ work_item_id: workItemId, author_id: authorId, body })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function logWork(
  workItemId: string,
  timeSpentMinutes: number,
  workDate: string,
  description: string | null,
  authorId: string,
) {
  const { data, error } = await supabase
    .from('wh_work_logs')
    .insert({
      work_item_id: workItemId,
      author_id: authorId,
      time_spent_minutes: timeSpentMinutes,
      work_date: workDate,
      description,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function addLink(
  linkTypeId: string,
  sourceItemId: string,
  targetItemId: string,
  comment: string | null,
  createdBy: string,
) {
  const { data, error } = await supabase
    .from('wh_work_item_links')
    .insert({
      link_type_id: linkTypeId,
      source_item_id: sourceItemId,
      target_item_id: targetItemId,
      comment,
      created_by: createdBy,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function addLabel(workItemId: string, labelId: string) {
  const { error } = await supabase
    .from('wh_work_item_labels')
    .insert({ work_item_id: workItemId, label_id: labelId });
  if (error) throw new Error(error.message);
}

async function removeLabel(workItemId: string, labelId: string) {
  const { error } = await supabase
    .from('wh_work_item_labels')
    .delete()
    .eq('work_item_id', workItemId)
    .eq('label_id', labelId);
  if (error) throw new Error(error.message);
}

async function cloneWorkItem(
  sourceId: string,
  cloneLinks: boolean,
  _cloneSubtasks: boolean,
  clonedBy: string,
) {
  const { data: source, error: fetchErr } = await supabase
    .from('wh_work_items')
    .select('*')
    .eq('id', sourceId)
    .single();
  if (fetchErr) throw new Error(fetchErr.message);

  // Get next key_sequence
  const { data: seqData } = await supabase
    .from('wh_work_items')
    .select('key_sequence')
    .eq('project_id', source.project_id)
    .order('key_sequence', { ascending: false })
    .limit(1)
    .single();
  const nextSeq = (seqData?.key_sequence || 0) + 1;

  const itemKey = `${source.item_key.split('-')[0]}-${nextSeq}`;

  const { data: clone, error: insertErr } = await supabase
    .from('wh_work_items')
    .insert({
      project_id: source.project_id,
      work_type_id: source.work_type_id,
      status_id: source.status_id,
      item_key: itemKey,
      key_sequence: nextSeq,
      parent_id: source.parent_id,
      fix_version_id: source.fix_version_id,
      summary: `CLONE - ${source.summary}`,
      description: source.description,
      assignee_id: source.assignee_id,
      reporter_id: clonedBy || source.reporter_id,
      priority: source.priority,
      severity: source.severity,
      environment: source.environment,
    })
    .select()
    .single();
  if (insertErr) throw new Error(insertErr.message);

  if (cloneLinks) {
    const { data: links } = await supabase
      .from('wh_work_item_links')
      .select('*')
      .or(`source_item_id.eq.${sourceId},target_item_id.eq.${sourceId}`);
    if (links?.length) {
      for (const l of links) {
        await supabase.from('wh_work_item_links').insert({
          link_type_id: l.link_type_id,
          source_item_id: l.source_item_id === sourceId ? clone.id : l.source_item_id,
          target_item_id: l.target_item_id === sourceId ? clone.id : l.target_item_id,
          created_by: clonedBy,
        });
      }
    }
  }
  return clone;
}

async function moveWorkItem(
  id: string,
  targetProjectId: string,
  targetWorkTypeId?: string,
  targetStatusId?: string,
) {
  const updates: Record<string, any> = { project_id: targetProjectId };
  if (targetWorkTypeId) updates.work_type_id = targetWorkTypeId;
  if (targetStatusId) updates.status_id = targetStatusId;
  return updateWorkItem(id, updates);
}

// ════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════

export const workhubService = {
  fetchAllWorkList,
  fetchWorkItemDetail,
  fetchStatuses,
  fetchValidTransitions,
  fetchWorkTypes,
  fetchFixVersions,
  fetchLabels,
  fetchLinkTypes,
  fetchComments,
  fetchWorkLogs,
  fetchHistory,
  fetchLinks,
  fetchDashboardStats,
  fetchTeamMembers,
  createWorkItem,
  updateWorkItem,
  deleteWorkItem,
  bulkDelete,
  bulkUpdateStatus,
  createComment,
  logWork,
  addLink,
  addLabel,
  removeLabel,
  cloneWorkItem,
  moveWorkItem,
};
