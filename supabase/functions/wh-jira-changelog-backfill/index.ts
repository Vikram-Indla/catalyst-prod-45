/**
 * wh-jira-changelog-backfill
 *
 * Backfills public.catalyst_status_history from Jira's per-issue changelog.
 *
 * Reads credentials from public.ph_jira_connection (same row used by
 * wh-jira-bulk-sync). For each ph_issues row in the requested projects,
 * pages through /rest/api/3/issue/{issueKey}/changelog and inserts every
 * `status` field transition into catalyst_status_history.
 *
 * Idempotent — relies on the unique constraint
 *   (issue_key, changed_at, to_status, COALESCE(from_status, ''))
 * with ON CONFLICT DO NOTHING. Safe to re-run.
 *
 * Invocation:
 *   POST /functions/v1/wh-jira-changelog-backfill
 *   body: { projects?: string[], limit?: number, dry_run?: boolean }
 *
 * Default scope: all projects in ph_issues that have a row in
 * ph_jira_connection's tenant. Default limit per run: 500 issues
 * (paginated; pass `start_after_key` to resume).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { mapChangelogItem, type ChangelogContext } from './mapper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackfillRequest {
  projects?: string[];          // BAU, …  empty = all projects with ph_issues rows
  limit?: number;               // max issues to process this invocation, default 500
  start_after_key?: string;     // resume cursor — issue_key to start AFTER
  dry_run?: boolean;            // count what would insert, write nothing
}

interface JiraChangelogPage {
  startAt: number;
  maxResults: number;
  total: number;
  histories: Array<{
    id: string;
    created: string;
    author?: { displayName?: string; accountId?: string };
    items: Array<{
      field: string;
      fromString?: string | null;
      toString?: string | null;
      from?: string | null;
      to?: string | null;
    }>;
  }>;
}

const PAGE_SIZE = 100;
const REQUEST_DELAY_MS = 75; // gentle on Jira rate limits

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const body: BackfillRequest = await req.json().catch(() => ({}));
  const projectFilter = body.projects ?? null;
  const issueLimit = Math.max(1, Math.min(body.limit ?? 500, 5000));
  const startAfterKey = body.start_after_key ?? null;
  const dryRun = !!body.dry_run;

  // 1. Sync log entry
  const { data: logEntry } = await supabase
    .from('ph_sync_log')
    .insert({
      sync_type: 'jira_changelog_backfill',
      status: 'running',
      projects_synced: projectFilter ?? [],
    })
    .select()
    .single();
  const logId = logEntry?.id ?? null;

  const summary = {
    issues_processed: 0,
    issues_skipped_no_changelog: 0,
    transitions_inserted: 0,
    transitions_skipped_dupe: 0,
    // 2026-06-10 — also count work_item_changelogs writes. Powers TIS hover
    // card assignee history. See /preflight Phase 4 row 4b.
    changelogs_inserted: 0,
    changelogs_skipped_dupe: 0,
    errors: [] as Array<{ issue_key: string; message: string }>,
    last_issue_key_processed: null as string | null,
    has_more: false,
  };

  try {
    // 2. Connection credentials
    const { data: conn } = await supabase
      .from('ph_jira_connection')
      .select('site_url, auth_email, auth_token_encrypted, status')
      .single();
    if (!conn || conn.status !== 'connected') {
      throw new Error('Jira connection not configured or not connected.');
    }
    const base = conn.site_url.replace(/\/$/, '');
    const authHeader = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`);
    const headers = { Authorization: authHeader, Accept: 'application/json' };

    // 3. Pull ph_issues rows to backfill (2026+ only)
    // `id` is required to populate work_item_changelogs.work_item_id (FK).
    let q = supabase
      .from('ph_issues')
      .select('id, issue_key, project_key, jira_created_at, jira_updated_at')
      .order('issue_key', { ascending: true })
      .limit(issueLimit);
    if (projectFilter?.length) q = q.in('project_key', projectFilter);
    if (startAfterKey) q = q.gt('issue_key', startAfterKey);

    const { data: tickets, error: tErr } = await q;
    if (tErr) throw tErr;

    // 3a. SUPER STRICT GUARDRAIL — filter to 2026+ issues only
    const ticketsInWindow = (tickets || []).filter((tk: any) => {
      const createdYear = tk.jira_created_at ? new Date(tk.jira_created_at).getFullYear() : null;
      const updatedYear = tk.jira_updated_at ? new Date(tk.jira_updated_at).getFullYear() : null;
      return (createdYear !== null && createdYear >= 2026) || (updatedYear !== null && updatedYear >= 2026);
    });

    if (!ticketsInWindow.length) {
      summary.has_more = false;
      await supabase
        .from('ph_sync_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: summary,
        })
        .eq('id', logId);
      return new Response(
        JSON.stringify({ success: true, summary, message: 'No tickets to process (2026+ window).' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 4. Per-issue: page through changelog, collect status transitions
    for (const tk of ticketsInWindow) {
      summary.last_issue_key_processed = tk.issue_key;
      summary.issues_processed += 1;

      let startAt = 0;
      let totalForIssue = Infinity;
      // Buffers per issue — split inserts so a failure on one table
      // doesn't roll back the other.
      const transitionsForIssue: Array<Record<string, unknown>> = [];
      const changelogsForIssue: Array<Record<string, unknown>> = [];

      while (startAt < totalForIssue) {
        const url = `${base}/rest/api/3/issue/${encodeURIComponent(tk.issue_key)}/changelog?startAt=${startAt}&maxResults=${PAGE_SIZE}`;
        let res: Response;
        try {
          res = await fetch(url, { headers });
        } catch (e) {
          summary.errors.push({ issue_key: tk.issue_key, message: `fetch_failed: ${(e as Error).message}` });
          break;
        }

        if (res.status === 404) {
          summary.issues_skipped_no_changelog += 1;
          break;
        }
        if (!res.ok) {
          summary.errors.push({ issue_key: tk.issue_key, message: `http_${res.status}: ${(await res.text()).slice(0, 200)}` });
          break;
        }

        const page = (await res.json()) as JiraChangelogPage;
        totalForIssue = page.total ?? page.histories.length;

        for (const h of page.histories ?? []) {
          const ctx: ChangelogContext = {
            issue_key: tk.issue_key,
            project_key: tk.project_key,
            work_item_id: tk.id,
            jira_history_id: h.id,
            changed_at: h.created,
            actor_name: h.author?.displayName ?? null,
            actor_account_id: h.author?.accountId ?? null,
            actor_avatar_url: null, // Jira avatar URLs aren't returned in
            // /changelog; populate via /user lookup in a later row if
            // needed. Leaving null is safe — UI falls back to initials.
          };
          for (const item of h.items ?? []) {
            const rows = mapChangelogItem(item, ctx);
            if (rows.status_history) transitionsForIssue.push(rows.status_history);
            if (rows.changelog) changelogsForIssue.push(rows.changelog);
          }
        }

        startAt += page.maxResults || PAGE_SIZE;
        if ((page.histories?.length ?? 0) < (page.maxResults || PAGE_SIZE)) break;
        await sleep(REQUEST_DELAY_MS);
      }

      // 5. Insert (chunked, idempotent via unique index)
      if (!transitionsForIssue.length && !changelogsForIssue.length) continue;

      if (dryRun) {
        summary.transitions_inserted += transitionsForIssue.length;
        summary.changelogs_inserted += changelogsForIssue.length;
        continue;
      }

      // 5a. catalyst_status_history — status transitions only.
      // Idempotency key matches index added in
      // 20260610000100_tis_history_rls_and_idempotency.sql.
      for (let i = 0; i < transitionsForIssue.length; i += 200) {
        const chunk = transitionsForIssue.slice(i, i + 200);
        const { data: inserted, error: insErr } = await supabase
          .from('catalyst_status_history')
          .upsert(chunk, {
            onConflict: 'issue_key,changed_at,to_status,from_status',
            ignoreDuplicates: true,
          })
          .select('id');
        if (insErr) {
          summary.errors.push({ issue_key: tk.issue_key, message: `status_history_insert_failed: ${insErr.message}` });
          continue;
        }
        const insertedCount = inserted?.length ?? 0;
        summary.transitions_inserted += insertedCount;
        summary.transitions_skipped_dupe += chunk.length - insertedCount;
      }

      // 5b. work_item_changelogs — every changelog field. Unique key
      // (work_item_id, jira_changelog_id, field_name) is pre-existing on
      // the table. Powers TIS hover card assignee history.
      for (let i = 0; i < changelogsForIssue.length; i += 200) {
        const chunk = changelogsForIssue.slice(i, i + 200);
        const { data: inserted, error: insErr } = await supabase
          .from('work_item_changelogs')
          .upsert(chunk, {
            onConflict: 'work_item_id,jira_changelog_id,field_name',
            ignoreDuplicates: true,
          })
          .select('id');
        if (insErr) {
          summary.errors.push({ issue_key: tk.issue_key, message: `changelog_insert_failed: ${insErr.message}` });
          continue;
        }
        const insertedCount = inserted?.length ?? 0;
        summary.changelogs_inserted += insertedCount;
        summary.changelogs_skipped_dupe += chunk.length - insertedCount;
      }

      // Polite pacing between issues
      await sleep(REQUEST_DELAY_MS);
    }

    // 6. has_more flag for the caller to decide pagination
    summary.has_more = tickets.length === issueLimit;

    // 7. Final log update
    await supabase
      .from('ph_sync_log')
      .update({
        status: summary.errors.length ? 'completed_with_errors' : 'completed',
        completed_at: new Date().toISOString(),
        metadata: summary,
      })
      .eq('id', logId);

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    if (logId) {
      await supabase
        .from('ph_sync_log')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          metadata: { ...summary, fatal_error: message },
        })
        .eq('id', logId);
    }
    return new Response(
      JSON.stringify({ success: false, error: message, summary }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
