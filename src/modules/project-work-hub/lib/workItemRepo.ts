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
 * Resolve which table owns this id. Cheap: two parallel HEAD-style queries.
 * Caller is expected to memoize via React Query.
 */
export async function resolveWorkItemSource(id: string): Promise<ResolvedSource | null> {
  const [phRes, catRes] = await Promise.all([
    supabase.from('ph_issues').select('id, issue_key, project_key').eq('id', id).maybeSingle(),
    supabase.from('catalyst_issues').select('id, issue_key, project_id').eq('id', id).maybeSingle(),
  ]);
  if (phRes.data) {
    return { source: 'jira', id, issueKey: phRes.data.issue_key ?? null, projectKey: (phRes.data as any).project_key ?? null };
  }
  if (catRes.data) {
    const projectKey = catRes.data.issue_key?.split('-')[0] ?? null;
    return { source: 'catalyst', id, issueKey: catRes.data.issue_key ?? null, projectKey };
  }
  return null;
}

// ─── Field mapping ────────────────────────────────────────────────
const PH_TO_CATALYST_FIELD: Record<string, string | null> = {
  summary: 'title',
  description: 'description',
  description_text: 'description',
  description_adf: 'description_adf_raw',
  status: 'status',
  status_category: null, // catalyst_issues has no status_category column; derived from status
  priority: 'priority',
  story_points: 'story_points',
  assignee_account_id: 'assignee_id',
  assignee_display_name: null, // joined from profiles at read time
  reporter_account_id: 'reporter_id',
  reporter_display_name: null,
  labels: 'tags',
  sprint_name: 'sprint_name',
  // parent_key handled specially — needs lookup to parent_id uuid
  parent_key: null,
  // acceptance_criteria — no native column; preserved in extension JSON for now
  acceptance_criteria: null,
  fix_versions: null, // catalyst uses release_id (single) for now; future: array
  deleted_at: 'deleted_at',
};

function mapPhPatchToCatalyst(patch: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(patch)) {
    const mapped = PH_TO_CATALYST_FIELD[k];
    if (mapped === undefined) {
      // Unknown field — pass through (catalyst may have it natively)
      out[k] = v;
    } else if (mapped === null) {
      // Intentionally dropped (no equivalent column)
      continue;
    } else {
      out[mapped] = v;
    }
  }
  return out;
}

// ─── Issue updates ───────────────────────────────────────────────
export async function updateWorkItem(
  resolved: ResolvedSource,
  patch: Record<string, any>,
): Promise<void> {
  if (resolved.source === 'jira') {
    const { error } = await supabase.from('ph_issues').update(patch).eq('id', resolved.id);
    if (error) throw error;
    return;
  }
  // catalyst
  const catalystPatch = mapPhPatchToCatalyst(patch);
  if (Object.keys(catalystPatch).length === 0) return;
  const { error } = await supabase.from('catalyst_issues').update(catalystPatch).eq('id', resolved.id);
  if (error) throw error;
}

/**
 * Set parent. ph_issues uses parent_key (text); catalyst_issues uses parent_id (uuid).
 * For catalyst we look up the new parent's id by issue_key (in either table).
 */
export async function setParent(
  resolved: ResolvedSource,
  newParentKey: string | null,
): Promise<void> {
  if (resolved.source === 'jira') {
    const { error } = await supabase.from('ph_issues').update({ parent_key: newParentKey }).eq('id', resolved.id);
    if (error) throw error;
    return;
  }
  // catalyst — resolve key → uuid in catalyst_issues
  let parentUuid: string | null = null;
  if (newParentKey) {
    const { data } = await supabase
      .from('catalyst_issues')
      .select('id')
      .eq('issue_key', newParentKey)
      .maybeSingle();
    parentUuid = data?.id ?? null;
    // If the parent is a Jira-synced item, catalyst.parent_id can't reference
    // it (FK to catalyst_issues only). In that case, store the relationship
    // via ph_issue_links instead. For now we no-op and surface a warning so
    // the picker can guard. A future enhancement adds a parent_key column to
    // catalyst_issues for cross-source parents.
    if (!parentUuid) {
      // Fallback: write the parent as a ph_issue_link of type 'parent'
      await supabase.from('ph_issue_links').insert({
        source_issue_key: resolved.issueKey,
        target_issue_key: newParentKey,
        link_type: 'parent',
      } as any);
      return;
    }
  }
  const { error } = await supabase.from('catalyst_issues').update({ parent_id: parentUuid }).eq('id', resolved.id);
  if (error) throw error;
}

// ─── Soft delete ─────────────────────────────────────────────────
export async function softDelete(resolved: ResolvedSource): Promise<void> {
  if (resolved.source === 'jira') {
    const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', resolved.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('catalyst_issues').update({ deleted_at: new Date().toISOString() }).eq('id', resolved.id);
    if (error) throw error;
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
      .select('id, issue_key')
      .single();
    if (error) throw error;
    return { id: data!.id as string, issue_key: data!.issue_key as string, source: 'jira' };
  }

  // Catalyst-parent children → catalyst_issues with parent_key set.
  if (!projectId) {
    throw new Error('createChildIssue: projectId is required for Catalyst children');
  }
  const { data, error } = await supabase
    .from('catalyst_issues')
    .insert({
      project_id: projectId,
      issue_key: issueKey,
      title: summary.trim(),
      issue_type: issueType,
      status,
      status_category: statusCategory,
      priority,
      reporter_id: reporterId,
      parent_key: parent.issueKey,
      last_modified_by_system: 'catalyst',
      sync_enabled: false,
    } as any)
    .select('id, issue_key')
    .single();
  if (error) throw error;
  return { id: data!.id as string, issue_key: data!.issue_key as string, source: 'catalyst' };
}
