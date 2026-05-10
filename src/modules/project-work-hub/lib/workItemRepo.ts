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
export async function softDelete(resolved: ResolvedSource): Promise<void> {
  const { error } = await supabase
    .from('ph_issues')
    .update({ deleted_at: new Date().toISOString() })
    .eq('issue_key', resolved.id);
  if (error) throw error;
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
        position,
        reporter_account_id: reporterId,
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

// ─── Archive ─────────────────────────────────────────────────────────────────
//
// Soft-archives a ph_issues row by setting is_archived = true.
// The column already exists in the schema (types.ts confirmed 2026-05-10).
// No SQL migration required.
export async function archiveIssue(issueKey: string): Promise<void> {
  const { error } = await supabase
    .from('ph_issues')
    .update({ is_archived: true } as any)
    .eq('issue_key', issueKey);
  if (error) throw error;
}

// ─── Clone ───────────────────────────────────────────────────────────────────
//
// Duplicates a ph_issues row. The clone:
//   - Gets a new sequential issue_key in the same project.
//   - Summary is prefixed "Copy of <original summary>".
//   - Status resets to "To Do" / status_category "todo".
//   - is_archived is always false on the clone.
//   - parent_key is PRESERVED from the original ("with parent" directive 2026-05-10).
//   - source is set to 'catalyst' (the clone is always a Catalyst-native item).
//   - description_adf, issue_type, priority, project_key, project_id, reporter_account_id
//     and acceptance_criteria_adf are carried over from the original.
//
// Returns the new issue_key string.
export async function cloneIssue(issueKey: string): Promise<string> {
  // 1. Fetch the original
  const { data: original, error: fetchError } = await supabase
    .from('ph_issues')
    .select(
      'issue_key, summary, description_adf, issue_type, priority, parent_key, ' +
      'project_key, project_id, reporter_account_id, acceptance_criteria_adf, ' +
      'status, status_category',
    )
    .eq('issue_key', issueKey)
    .single();
  if (fetchError) throw fetchError;
  if (!original) throw new Error(`cloneIssue: issue ${issueKey} not found`);

  const orig = original as Record<string, any>;

  // 2. Generate a new key in the same project
  const newKey = await generateIssueKey(orig.project_key as string);

  // 3. Insert the clone
  const { data: inserted, error: insertError } = await supabase
    .from('ph_issues')
    .insert({
      issue_key: newKey,
      summary: `Copy of ${orig.summary ?? ''}`,
      description_adf: orig.description_adf ?? null,
      acceptance_criteria_adf: orig.acceptance_criteria_adf ?? null,
      issue_type: orig.issue_type ?? null,
      priority: orig.priority ?? 'Medium',
      parent_key: orig.parent_key ?? null,
      project_key: orig.project_key,
      project_id: orig.project_id ?? null,
      reporter_account_id: orig.reporter_account_id ?? null,
      status: 'To Do',
      status_category: 'todo',
      is_archived: false,
      source: 'catalyst',
    } as any)
    .select('issue_key')
    .single();
  if (insertError) throw insertError;

  return (inserted as any).issue_key as string;
}
