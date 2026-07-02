/**
 * workItemRepo — Source-aware adapter for Story/Epic/Task detail mutations.
 *
 * Catalyst hosts work items in TWO physical tables:
 *   1) ph_issues          — Jira-synced (read-only-ish from app perspective; writes also write-back)
 *   2) catalyst_issues    — locally created (BAU-1, etc.)
 *
 * Every CRUD action in StoryDetailModal must target the correct table for the
 * loaded item. Without this adapter, a write against ph_issues for a catalyst
 * item silently updates 0 rows AND child writes (ph_comments / ph_attachments
 * / ph_activity_log) fail FK / RLS because no ph_issues row exists.
 *
 * Field-name mapping:
 *   summary             ↔ title           (catalyst)
 *   labels              ↔ tags            (catalyst)
 *   parent_key (text)   ↔ parent_id (uuid via catalyst_issues lookup)
 *   assignee_account_id ↔ assignee_id     (catalyst stores profiles.id directly)
 *   reporter_account_id ↔ reporter_id     (same)
 *   acceptance_criteria → not yet present in catalyst_issues (no-op for now,
 *     stored as JSON in description_adf_raw extension key 'acceptance_criteria')
 *
 * For a catalyst item, every per-field activity entry is inserted by the
 * tg_catalyst_issue_audit trigger automatically. App code does NOT need to
 * write to catalyst_activity_log — the DB trigger handles it.
 */

import { supabase } from '@/integrations/supabase/client';

export type WorkItemSource = 'jira' | 'catalyst';

export interface ResolvedSource {
  source: WorkItemSource;
  /** Always present for both sources */
  id: string;
  /** issue_key (e.g. "BAU-1"). Always present. */
  issueKey: string | null;
  projectKey: string | null;
}

/**
 * Resolve which source owns this id.
 *
 * F-iter9 unification: ph_issues now holds BOTH Jira-synced and Catalyst-
 * native rows, distinguished by the `source` column. Single query replaces
 * the previous two-table lookup.
 */
export async function resolveWorkItemSource(id: string): Promise<ResolvedSource | null> {
  // F-iter9 PK fix: ph_issues PK is `issue_key` (text). The `id` parameter
  // throughout this module is treated as the issue_key (BacklogItem.id is
  // populated from issue_key in useBacklogData).
  const { data } = await supabase
    .from('ph_issues')
    .select('issue_key, project_key, source')
    .eq('issue_key', id)
    .maybeSingle();
  if (!data) return null;
  const src = (data as any).source === 'catalyst' ? 'catalyst' : 'jira';
  return {
    source: src,
    id,
    issueKey: data.issue_key ?? null,
    projectKey: (data as any).project_key ?? null,
  };
}

// ─── Issue updates ───────────────────────────────────────────────
// F-iter9 unification + PK fix: BOTH Jira-synced and Catalyst-native rows
// live in ph_issues, keyed by issue_key.
export async function updateWorkItem(
  resolved: ResolvedSource,
  patch: Record<string, any>,
): Promise<void> {
  const { error } = await supabase.from('ph_issues').update(patch).eq('issue_key', resolved.id);
  if (error) throw error;
}

/**
 * Set parent.
 * F-iter9 unification + PK fix: both sources share `parent_key` (text);
 * lookup keyed by issue_key.
 */
export async function setParent(
  resolved: ResolvedSource,
  newParentKey: string | null,
): Promise<void> {
  const { error } = await supabase.from('ph_issues').update({ parent_key: newParentKey }).eq('issue_key', resolved.id);
  if (error) throw error;
}

// ─── Soft delete ─────────────────────────────────────────────────
// F-iter9 unification + PK fix: keyed by issue_key.
// Logs to ph_archive_log + sends immediate notification to assignee + reporter.
export async function softDelete(resolved: ResolvedSource, userId?: string): Promise<void> {
  const { data: issue } = await supabase
    .from('ph_issues')
    .select('issue_key, project_key, summary, issue_type, status, assignee_account_id, reporter_account_id')
    .eq('issue_key', resolved.id)
    .single();

  const { error } = await supabase
    .from('ph_issues')
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId || null } as any)
    .eq('issue_key', resolved.id);
  if (error) throw error;

  if (issue) {
    // Log to archive log
    await supabase.from('ph_archive_log').insert({
      issue_key: issue.issue_key,
      project_key: issue.project_key,
      summary: issue.summary,
      issue_type: issue.issue_type,
      status: issue.status,
      assignee_account_id: issue.assignee_account_id,
      reporter_account_id: issue.reporter_account_id,
      action: 'deleted',
      reason: 'user_delete',
      performed_by: userId || null,
    } as any);

    // Send immediate notification to assignee + reporter
    const jiraIds = [issue.assignee_account_id, issue.reporter_account_id].filter(Boolean);
    if (jiraIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, jira_account_id')
        .in('jira_account_id', jiraIds);

      for (const p of profiles || []) {
        await supabase.from('notifications').insert({
          user_id: p.id,
          type: 'deleted',
          title: `${issue.issue_key} has been deleted`,
          body: `Issue "${issue.summary || issue.issue_key}" was deleted.`,
          entity_type: 'issue',
          entity_key: issue.issue_key,
          entity_id: issue.issue_key,
          is_read: false,
        } as any);
      }
    }
  }
}

// ─── Comments ────────────────────────────────────────────────────
export async function addComment(resolved: ResolvedSource, body: string, authorId: string) {
  const table = resolved.source === 'jira' ? 'ph_comments' : 'catalyst_comments';
  const { error } = await supabase.from(table).insert({ work_item_id: resolved.id, body, author_id: authorId } as any);
  if (error) throw error;
}

export async function deleteComment(resolved: ResolvedSource, commentId: string) {
  const table = resolved.source === 'jira' ? 'ph_comments' : 'catalyst_comments';
  const { error } = await supabase.from(table).delete().eq('id', commentId);
  if (error) throw error;
}

export async function editComment(resolved: ResolvedSource, commentId: string, body: string) {
  const table = resolved.source === 'jira' ? 'ph_comments' : 'catalyst_comments';
  const { error } = await supabase.from(table).update({ body }).eq('id', commentId);
  if (error) throw error;
}

export async function listComments(resolved: ResolvedSource) {
  const table = resolved.source === 'jira' ? 'ph_comments' : 'catalyst_comments';
  const { data, error } = await supabase
    .from(table)
    .select('id, work_item_id, body, author_id, created_at, updated_at')
    .eq('work_item_id', resolved.id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ─── Activity log ────────────────────────────────────────────────
export async function listActivity(resolved: ResolvedSource) {
  const table = resolved.source === 'jira' ? 'ph_activity_log' : 'catalyst_activity_log';
  const select = resolved.source === 'jira'
    ? 'id, work_item_id, action, field_name, old_value, new_value, user_id, metadata, created_at'
    : 'id, work_item_id, action, field_name, old_value, new_value, user_id, metadata, created_at';
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('work_item_id', resolved.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Attachments ─────────────────────────────────────────────────
export const ATTACHMENT_BUCKET = (source: WorkItemSource) =>
  source === 'jira' ? 'attachments' : 'catalyst-attachments';

export async function listAttachments(resolved: ResolvedSource) {
  const table = resolved.source === 'jira' ? 'ph_attachments' : 'catalyst_attachments';
  const { data, error } = await supabase
    .from(table)
    .select('id, work_item_id, file_name, file_size, mime_type, storage_path, uploaded_by, created_at')
    .eq('work_item_id', resolved.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertAttachmentRow(
  resolved: ResolvedSource,
  row: { file_name: string; file_size: number; mime_type: string; storage_path: string; uploaded_by: string },
) {
  const table = resolved.source === 'jira' ? 'ph_attachments' : 'catalyst_attachments';
  const { error } = await supabase.from(table).insert({ work_item_id: resolved.id, ...row } as any);
  if (error) throw error;
}

export async function deleteAttachmentRow(resolved: ResolvedSource, attachmentId: string) {
  const table = resolved.source === 'jira' ? 'ph_attachments' : 'catalyst_attachments';
  const { error } = await supabase.from(table).delete().eq('id', attachmentId);
  if (error) throw error;
}

// ─── Child item creation (Phase 5) ──────────────────────────────────
//
// Children of a Catalyst-native parent (catalyst_issues row) are created in
// catalyst_issues with parent_key set. Children of a Jira-synced parent
// (ph_issues row) continue to be created in ph_issues for back-compat with
// the existing Jira write-back pipeline.
//
// Caller passes the parent's ResolvedSource. The helper picks the table,
// allocates a sequential issue_key via generateIssueKey (queries BOTH
// tables → no Jira collisions), and inserts the row with sensible defaults.

import { generateIssueKey } from './generateIssueKey';

export interface CreateChildInput {
  parent: ResolvedSource;
  /** Required: human summary / title */
  summary: string;
  /** e.g. 'Sub-task' | 'Bug' | 'QA Bug' | 'Defect' | 'Production Incident' */
  issueType: string;
  /** Project key (e.g. 'BAU') for sequential key generation */
  projectKey: string;
  /** Catalyst inserts require project_id (uuid). Pass parent's project_id. */
  projectId?: string | null;
  /** Reporter — auth.user id (or Atlassian account_id for Jira children) */
  reporterId?: string | null;
  /** Assignee — profile id (maps to assignee_account_id on ph_issues) */
  assigneeId?: string | null;
  priority?: string;
  status?: string;
  statusCategory?: 'todo' | 'in_progress' | 'done';
  /** Optional ordering hint (used by ph_issues only) */
  position?: number | null;
}

export interface CreatedChild {
  id: string;
  issue_key: string;
  source: WorkItemSource;
}

export async function createChildIssue(input: CreateChildInput): Promise<CreatedChild> {
  const {
    parent,
    summary,
    issueType,
    projectKey,
    projectId,
    reporterId,
    assigneeId = null,
    priority = 'Medium',
    status = 'To Do',
    statusCategory = 'todo',
    position = null,
  } = input;

  if (!summary?.trim()) throw new Error('createChildIssue: summary is required');
  if (!projectKey) throw new Error('createChildIssue: projectKey is required');
  if (!parent.issueKey) throw new Error('createChildIssue: parent.issueKey is required');

  const issueKey = await generateIssueKey(projectKey);

  if (parent.source === 'jira') {
    // Jira-parent children stay in ph_issues (Phase 5 Q2 contract).
    // 2026-07-02: `position` column does not exist on ph_issues (real
    // column is `sort_order`). Passing an undefined field triggers a
    // PostgREST 400. Remap to sort_order when a value is provided,
    // otherwise omit it.
    const { data, error } = await supabase
      .from('ph_issues')
      .insert({
        issue_key: issueKey,
        summary: summary.trim(),
        issue_type: issueType,
        parent_key: parent.issueKey,
        project_key: projectKey,
        status,
        status_category: statusCategory,
        priority,
        ...(position != null ? { sort_order: position } : {}),
        reporter_account_id: reporterId,
        ...(assigneeId ? { assignee_account_id: assigneeId } : {}),
        source: 'catalyst',
      } as any)
      .select('issue_key')
      .single();
    if (error) throw error;
    // F-iter9 PK fix: id <- issue_key
    return { id: data!.issue_key as string, issue_key: data!.issue_key as string, source: 'jira' };
  }

  // F-iter9 unification: Catalyst-parent children also land in ph_issues
  // with source='catalyst'. Field map: title→summary, project_id→project_key,
  // reporter_id→reporter_account_id. last_modified_by_system / sync_enabled
  // dropped (no equivalent on ph_issues).
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('ph_issues')
    .insert({
      project_key: projectKey,
      issue_key: issueKey,
      summary: summary.trim(),
      issue_type: issueType,
      status,
      status_category: statusCategory,
      priority,
      reporter_account_id: reporterId,
      ...(assigneeId ? { assignee_account_id: assigneeId } : {}),
      parent_key: parent.issueKey,
      source: 'catalyst',
      jira_created_at: nowIso,
      jira_updated_at: nowIso,
    } as any)
    .select('id, issue_key')
    .single();
  if (error) throw error;
  // F-iter9 PK fix: id <- issue_key
  return { id: data!.issue_key as string, issue_key: data!.issue_key as string, source: 'catalyst' };
}

// ─── Move ────────────────────────────────────────────────────────────────────
//
// Moves an issue to a different project by updating project_key + project_id.
// The issue_key is NOT changed (Jira doesn't renumber on move either).
// Caller is responsible for showing a project picker and passing the values.
export async function moveIssue(
  issueKey: string,
  targetProjectKey: string,
  targetProjectId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('ph_issues')
    .update({ project_key: targetProjectKey, project_id: targetProjectId } as any)
    .eq('issue_key', issueKey);
  if (error) throw error;
}

// ─── Archive ─────────────────────────────────────────────────────────────────
//
// Soft-archives a ph_issues row by setting archived_at to the current timestamp.
// ph_issues has no is_archived boolean — archiving is tracked via archived_at (nullable timestamp).
// A non-null archived_at means the issue is archived.
export async function archiveIssue(issueKey: string, userId?: string): Promise<void> {
  const { data: issue } = await supabase
    .from('ph_issues')
    .select('issue_key, project_key, summary, issue_type, status, assignee_account_id, reporter_account_id')
    .eq('issue_key', issueKey)
    .single();

  const { error } = await supabase
    .from('ph_issues')
    .update({ archived_at: new Date().toISOString(), archived_by: userId || null } as any)
    .eq('issue_key', issueKey);
  if (error) throw error;

  if (issue) {
    await supabase.from('ph_archive_log').insert({
      issue_key: issueKey,
      project_key: issue.project_key,
      summary: issue.summary,
      issue_type: issue.issue_type,
      status: issue.status,
      assignee_account_id: issue.assignee_account_id,
      reporter_account_id: issue.reporter_account_id,
      action: 'archived',
      reason: 'manual',
      performed_by: userId || null,
    } as any);
  }
}

export async function unarchiveIssue(issueKey: string, userId: string): Promise<void> {
  const { data, error: rpcError } = await supabase.rpc('unarchive_issue', {
    p_issue_key: issueKey,
    p_user_id: userId,
  });
  if (rpcError) throw rpcError;
}

export async function getArchivedIssues(filters?: {
  projectKey?: string;
  issueType?: string;
  search?: string;
  typeFilter?: 'all' | 'archived' | 'deleted';
  jiraAccountId?: string;
  isAdmin?: boolean;
}): Promise<any[]> {
  const SELECT_FIELDS = 'issue_key, project_key, summary, issue_type, status, status_category, priority, assignee_display_name, reporter_display_name, jira_created_at, archived_at, archived_by, deleted_at, deleted_by, assignee_account_id, reporter_account_id';
  const cutoff = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const typeFilter = filters?.typeFilter || 'all';
  const jiraId = filters?.jiraAccountId;

  // Fetch archived items (by age or by archived_at)
  let archivedItems: any[] = [];
  if (typeFilter === 'all' || typeFilter === 'archived') {
    let q = supabase.from('ph_issues').select(SELECT_FIELDS)
      .is('deleted_at', null)
      .neq('status_category', 'done')
      .or(`archived_at.not.is.null,jira_created_at.lt.${cutoff}`)
      .order('jira_created_at', { ascending: true })
      .limit(200);
    // Always scope to current user's items (assignee OR reporter).
    // Admin privilege controls unarchive ability, not visibility.
    if (jiraId) {
      q = q.or(`assignee_account_id.eq.${jiraId},reporter_account_id.eq.${jiraId}`);
    }
    if (filters?.projectKey) q = q.eq('project_key', filters.projectKey);
    if (filters?.search) q = q.or(`issue_key.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`);
    const { data } = await q;
    archivedItems = (data || []).map((r: any) => ({ ...r, _type: 'archived' as const }));
  }

  // Fetch deleted items
  let deletedItems: any[] = [];
  if (typeFilter === 'all' || typeFilter === 'deleted') {
    let q = supabase.from('ph_issues').select(SELECT_FIELDS)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(200);
    if (jiraId) {
      q = q.or(`assignee_account_id.eq.${jiraId},reporter_account_id.eq.${jiraId}`);
    }
    if (filters?.projectKey) q = q.eq('project_key', filters.projectKey);
    if (filters?.search) q = q.or(`issue_key.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`);
    const { data } = await q;
    deletedItems = (data || []).map((r: any) => ({ ...r, _type: 'deleted' as const }));
  }

  return [...archivedItems, ...deletedItems];
}

// ─── Clone ───────────────────────────────────────────────────────────────────
//
// Duplicates a ph_issues row. The clone:
//   - Gets a new sequential issue_key in the same project.
//   - Summary is prefixed "Copy of <original summary>".
//   - Status resets to "To Do" / status_category "todo".
//   - archived_at is null on the clone (not archived).
//   - parent_key is PRESERVED from the original ("with parent" directive 2026-05-10).
//   - source is set to 'catalyst' (the clone is always a Catalyst-native item).
//   - description_adf, issue_type, priority, project_key, reporter_account_id
//     and acceptance_criteria (plain text, not ADF) are carried over from the original.
//   NOTE: ph_issues has no project_id column — projects link via project_key (text) only.
//
// Returns the new issue_key string.
export async function cloneIssue(issueKey: string): Promise<string> {
  // 1. Fetch the original — use actual column names from ph_issues schema.
  //    acceptance_criteria is plain text (no ADF variant exists in this table).
  //    project_id does NOT exist in ph_issues; projects link via project_key.
  const { data: original, error: fetchError } = await supabase
    .from('ph_issues')
    .select(
      'issue_key, summary, description_adf, issue_type, priority, parent_key, ' +
      'project_key, reporter_account_id, acceptance_criteria, ' +
      'status, status_category',
    )
    .eq('issue_key', issueKey)
    .single();
  if (fetchError) throw fetchError;
  if (!original) throw new Error(`cloneIssue: issue ${issueKey} not found`);

  const orig = original as Record<string, any>;

  // 2. Generate a new key in the same project
  const newKey = await generateIssueKey(orig.project_key as string);

  const nowIso = new Date().toISOString();

  // 3. Insert the clone — only columns that exist on ph_issues.
  // Removed: acceptance_criteria_adf, project_id, is_archived (non-existent columns).
  // acceptance_criteria (plain text) is preserved.
  // archived_at null = not archived.
  const { data: inserted, error: insertError } = await supabase
    .from('ph_issues')
    .insert({
      issue_key: newKey,
      summary: `Copy of ${orig.summary ?? ''}`,
      description_adf: orig.description_adf ?? null,
      acceptance_criteria: orig.acceptance_criteria ?? null,
      issue_type: orig.issue_type ?? null,
      priority: orig.priority ?? 'Medium',
      parent_key: orig.parent_key ?? null,
      project_key: orig.project_key,
      reporter_account_id: orig.reporter_account_id ?? null,
      status: 'To Do',
      status_category: 'todo',
      archived_at: null,
      source: 'catalyst',
      jira_created_at: nowIso,
      jira_updated_at: nowIso,
    } as any)
    .select('issue_key')
    .single();
  if (insertError) throw insertError;

  return (inserted as any).issue_key as string;
}
