/**
 * issue-clone — Clone a ph_issues row.
 *
 * BATCH-B Feature 1.
 *
 * Behavior:
 *   - Auth verify (caller must be authenticated).
 *   - Resolve assignee_account_id / reporter_account_id → catalyst user_id
 *     via jira_identity_map. Reporter is required and must map; assignee is
 *     optional (null OK), but if provided must map.
 *   - Status: copy source.status verbatim (Decision C — ph_issues.status is
 *     free-text Jira-sourced; no enforced workflow lookup).
 *   - issue_key: next_issue_key(p_project_id) RPC (Decision E).
 *   - Optionally clone attachments (rows + storage), one-level subtasks
 *     (parent_key linkage, no recursion), and outbound links.
 *   - Enqueue jira_write_back_queue row (field_name='issue_clone',
 *     status='approved').
 *
 * Returns: { new_issue_id, new_issue_key } on success, { error } otherwise.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const BUCKET = 'attachments';

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Resolve a Jira accountId → catalyst user_id. Returns null if not mapped.
async function resolveUserId(admin: any, accountId: string | null): Promise<string | null | undefined> {
  if (!accountId) return null;
  const { data } = await admin
    .from('jira_identity_map')
    .select('catalyst_user_id')
    .eq('jira_account_id', accountId)
    .maybeSingle();
  return data?.catalyst_user_id ?? undefined; // undefined = not mapped
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);
    const actorId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const sourceIssueId = body?.source_issue_id;
    const summaryRaw = body?.summary;
    const assigneeAccountId: string | null = body?.assignee_account_id ?? null;
    const reporterAccountId: string | null = body?.reporter_account_id ?? null;
    const includeAttachments = !!body?.include_attachments;
    const includeSubtasks = !!body?.include_subtasks;
    const includeLinks = !!body?.include_links;

    if (!sourceIssueId || typeof sourceIssueId !== 'string') {
      return json({ error: 'source_issue_id required' }, 400);
    }
    const summary = typeof summaryRaw === 'string' ? summaryRaw.trim() : '';
    if (summary.length < 3 || summary.length > 255) {
      return json({ error: 'summary must be 3-255 characters' }, 400);
    }
    if (!reporterAccountId) {
      return json({ error: 'reporter_account_id required' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Resolve identity mappings.
    const reporterUserId = await resolveUserId(admin, reporterAccountId);
    if (reporterUserId === undefined) {
      return json({ error: 'reporter not mapped to Catalyst user' }, 422);
    }
    const assigneeUserIdRes = await resolveUserId(admin, assigneeAccountId);
    if (assigneeAccountId && assigneeUserIdRes === undefined) {
      return json({ error: 'assignee not mapped to Catalyst user' }, 422);
    }
    const assigneeUserId = assigneeUserIdRes ?? null;

    // 2. Read source issue.
    const { data: source, error: srcErr } = await admin
      .from('ph_issues')
      .select('*')
      .eq('id', sourceIssueId)
      .maybeSingle();
    if (srcErr || !source) return json({ error: 'Source issue not found' }, 404);

    // 3. Resolve project_id for issue_key generation.
    const { data: proj } = await admin
      .from('ph_projects')
      .select('id')
      .eq('key', source.project_key)
      .maybeSingle();
    if (!proj?.id) return json({ error: 'Source project not found' }, 404);

    // 4. Generate next issue_key via RPC.
    const { data: newKey, error: keyErr } = await admin.rpc('next_issue_key', {
      p_project_id: proj.id,
    });
    if (keyErr || !newKey) return json({ error: `next_issue_key failed: ${keyErr?.message}` }, 500);
    const newIssueKey = newKey as string;

    // 5. Build the new ph_issues row — copy domain fields, override identity + key.
    const insertRow: Record<string, unknown> = {
      issue_key: newIssueKey,
      project_key: source.project_key,
      issue_type: source.issue_type,
      summary,
      status: source.status,                        // Decision C: copy verbatim
      status_category: source.status_category,
      priority: source.priority,
      story_points: source.story_points,
      labels: source.labels,
      components: source.components,
      fix_versions: source.fix_versions,
      due_date: source.due_date,
      description_adf: source.description_adf,
      description_text: source.description_text,
      acceptance_criteria: source.acceptance_criteria,
      hierarchy_level: source.hierarchy_level,
      project_name: source.project_name,
      type_icon_url: source.type_icon_url,
      // identity overrides
      assignee_user_id: assigneeUserId,
      assignee_account_id: assigneeAccountId,
      reporter_user_id: reporterUserId,
      reporter_account_id: reporterAccountId,
      // bookkeeping
      source: 'catalyst',
      sync_status: 'pending',
      first_synced_at: null,
      last_synced_at: null,
      synced_at: null,
      jira_created_at: null,
      jira_updated_at: null,
      deleted_at: null,
      archived_at: null,
      archived_by: null,
    };

    const { data: created, error: insErr } = await admin
      .from('ph_issues')
      .insert(insertRow)
      .select('id, issue_key')
      .single();
    if (insErr || !created) {
      return json({ error: `Insert failed: ${insErr?.message}` }, 500);
    }
    const newIssueId = created.id as string;

    // 6. Optionally clone attachments (DB rows + storage objects).
    if (includeAttachments) {
      const { data: srcAttachments } = await admin
        .from('ph_attachments')
        .select('*')
        .eq('work_item_id', sourceIssueId);
      for (const att of (srcAttachments ?? [])) {
        const ext = (att.file_name ?? '').split('.').pop() ?? 'bin';
        const newPath = `attachments/${newIssueId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const { error: copyErr } = await admin.storage
          .from(BUCKET)
          .copy(att.storage_path, newPath);
        if (copyErr) {
          console.warn('[issue-clone] storage copy failed', { err: copyErr.message });
          continue;
        }
        await admin.from('ph_attachments').insert({
          work_item_id: newIssueId,
          uploaded_by: actorId,
          file_name: att.file_name,
          file_size: att.file_size,
          mime_type: att.mime_type,
          storage_path: newPath,
        });
      }
    }

    // 7. Optionally clone immediate children (one level only).
    if (includeSubtasks) {
      const { data: children } = await admin
        .from('ph_issues')
        .select('*')
        .eq('parent_key', source.issue_key);
      for (const child of (children ?? [])) {
        const { data: childKey } = await admin.rpc('next_issue_key', { p_project_id: proj.id });
        if (!childKey) continue;
        const childRow = {
          ...child,
          id: undefined,
          issue_key: childKey,
          parent_key: newIssueKey,
          parent_summary: summary,
          source: 'catalyst',
          sync_status: 'pending',
          first_synced_at: null,
          last_synced_at: null,
          synced_at: null,
          jira_created_at: null,
          jira_updated_at: null,
          deleted_at: null,
          archived_at: null,
          archived_by: null,
          reporter_user_id: actorId,
        };
        delete (childRow as any).id;
        await admin.from('ph_issues').insert(childRow);
      }
    }

    // 8. Optionally clone outbound links (source-side only).
    if (includeLinks) {
      const { data: links } = await admin
        .from('ph_issue_links')
        .select('source_id, target_id, link_type')
        .eq('source_id', source.issue_key);
      for (const lk of (links ?? [])) {
        await admin.from('ph_issue_links').insert({
          source_id: newIssueKey,
          target_id: lk.target_id,
          link_type: lk.link_type,
          created_by: actorId,
        });
      }
    }

    // 9. Enqueue write-back row.
    await admin.from('jira_write_back_queue').insert({
      ph_issue_id: newIssueId,
      field_name: 'issue_clone',
      new_value: JSON.stringify({
        source_issue_key: source.issue_key,
        target_issue_key: newIssueKey,
        include: {
          attachments: includeAttachments,
          subtasks: includeSubtasks,
          links: includeLinks,
        },
      }),
      status: 'approved',
      created_by: actorId,
    });

    return json({ new_issue_id: newIssueId, new_issue_key: newIssueKey }, 200);
  } catch (e) {
    console.error('[issue-clone] fatal', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
