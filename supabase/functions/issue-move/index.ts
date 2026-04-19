/**
 * issue-move — Move a ph_issues row to a different project.
 *
 * BATCH-B Feature 2.
 *
 * Behavior:
 *   - Auth verify.
 *   - Caller must be a member of the destination project (RLS-style guard).
 *   - Generate next issue_key via next_issue_key(p_project_id) for destination.
 *   - UPDATE ph_issues SET project_key, issue_key.
 *   - Sweep parent_key references on children (Decision B).
 *   - ph_issue_links UUID-FK preserved automatically (Decision A — no link sweep).
 *   - Enqueue write-back row (field_name='project_move').
 *
 * Status edge case: skipped per Decision F.
 *
 * TODO (post-Jira-sunset): Decision F (skip status-mismatch warn) is correct
 * while ph_issues.status is Jira-sourced free-text. Once Catalyst becomes the
 * authoritative workflow owner (Jira sunset), re-evaluate: validate destination
 * project's workflow scheme accepts source.status, surface a warning or remap
 * to the destination's initial status. No action this batch.
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

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
    const issueId = body?.issue_id;
    const destKey = body?.destination_project_key;
    if (!issueId || typeof issueId !== 'string') {
      return json({ error: 'issue_id required' }, 400);
    }
    if (!destKey || typeof destKey !== 'string') {
      return json({ error: 'destination_project_key required' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Read source issue.
    const { data: source, error: srcErr } = await admin
      .from('ph_issues')
      .select('id, issue_key, project_key')
      .eq('id', issueId)
      .maybeSingle();
    if (srcErr || !source) return json({ error: 'Issue not found' }, 404);
    if (source.project_key === destKey) {
      return json({ error: 'Already in destination project' }, 400);
    }

    // Resolve destination project_id.
    const { data: destProj } = await admin
      .from('ph_projects')
      .select('id')
      .eq('key', destKey)
      .maybeSingle();
    if (!destProj?.id) return json({ error: 'Destination project not found' }, 404);

    // Membership guard: caller must belong to destination.
    const { data: member } = await admin
      .from('ph_project_members')
      .select('role')
      .eq('project_id', destProj.id)
      .eq('user_id', actorId)
      .maybeSingle();
    if (!member) return json({ error: 'Not a member of destination project' }, 403);

    // Generate new issue_key.
    const { data: newKey, error: keyErr } = await admin.rpc('next_issue_key', {
      p_project_id: destProj.id,
    });
    if (keyErr || !newKey) return json({ error: `next_issue_key failed: ${keyErr?.message}` }, 500);
    const newIssueKey = newKey as string;

    const oldIssueKey = source.issue_key as string;
    const oldProjectKey = source.project_key as string;

    // Update the issue itself.
    const { error: updErr } = await admin
      .from('ph_issues')
      .update({ project_key: destKey, issue_key: newIssueKey })
      .eq('id', issueId);
    if (updErr) return json({ error: `Update failed: ${updErr.message}` }, 500);

    // Sweep child parent_key references (Decision B).
    const { error: childErr } = await admin
      .from('ph_issues')
      .update({ parent_key: newIssueKey })
      .eq('parent_key', oldIssueKey);
    if (childErr) {
      console.warn('[issue-move] parent_key sweep failed', { err: childErr.message });
    }

    // Enqueue write-back.
    await admin.from('jira_write_back_queue').insert({
      ph_issue_id: issueId,
      field_name: 'project_move',
      new_value: JSON.stringify({
        from_key: oldProjectKey,
        to_key: destKey,
        new_issue_key: newIssueKey,
        original_issue_key: oldIssueKey,
      }),
      status: 'approved',
      created_by: actorId,
    });

    return json({ new_issue_key: newIssueKey, new_issue_id: issueId }, 200);
  } catch (e) {
    console.error('[issue-move] fatal', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
