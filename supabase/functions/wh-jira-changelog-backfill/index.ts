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

    // 3. Pull ph_issues rows to backfill
    let q = supabase
      .from('ph_issues')
      .select('issue_key, project_key')
      .order('issue_key', { ascending: true })
      .limit(issueLimit);
    if (projectFilter?.length) q = q.in('project_key', projectFilter);
    if (startAfterKey) q = q.gt('issue_key', startAfterKey);

    const { data: tickets, error: tErr } = await q;
    if (tErr) throw tErr;
    if (!tickets || !tickets.length) {
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
        JSON.stringify({ success: true, summary, message: 'No tickets to process.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 4. Per-issue: page through changelog, collect status transitions
    for (const tk of tickets) {
      summary.last_issue_key_processed = tk.issue_key;
      summary.issues_processed += 1;

      let startAt = 0;
      let totalForIssue = Infinity;
      const transitionsForIssue: Array<{
        source: string;
        issue_key: string;
        project_key: string;
        from_status: string | null;
        to_status: string;
        changed_at: string;
        metadata: Record<string, unknown>;
      }> = [];

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
          for (const item of h.items ?? []) {
            if (item.field !== 'status') continue;
            const toStatus = item.toString ?? item.to ?? '';
            if (!toStatus) continue;
            const actorName = h.author?.displayName ?? null;
            const actorAccountId = h.author?.accountId ?? null;
            transitionsForIssue.push({
              source: 'jira',
              issue_key: tk.issue_key,
              project_key: tk.project_key,
              from_status: item.fromString ?? item.from ?? null,
              to_status: toStatus,
              changed_at: h.created,
              // First-class actor columns (Apr 26, 2026) — the Recent
              // Activity widget reads these directly. Metadata copy kept
              // for backwards-compat with anything that still parses JSON.
              actor_name: actorName,
              actor_account_id: actorAccountId,
              metadata: {
                backfilled: true,
                jira_history_id: h.id,
                jira_actor: actorName,
                jira_actor_account_id: actorAccountId,
              },
            });
          }
        }

        startAt += page.maxResults || PAGE_SIZE;
        if ((page.histories?.length ?? 0) < (page.maxResults || PAGE_SIZE)) break;
        await sleep(REQUEST_DELAY_MS);
      }

      // 5. Insert (chunked, idempotent via unique index)
      if (!transitionsForIssue.length) continue;

      if (dryRun) {
        summary.transitions_inserted += transitionsForIssue.length;
        continue;
      }

      // Chunk inserts of 200 to keep payload modest
      for (let i = 0; i < transitionsForIssue.length; i += 200) {
        const chunk = transitionsForIssue.slice(i, i + 200);
        const { data: inserted, error: insErr, count } = await supabase
          .from('catalyst_status_history')
          .upsert(chunk, {
            onConflict: 'issue_key,changed_at,to_status,from_status',
            ignoreDuplicates: true,
          })
          .select('id', { count: 'exact', head: false });

        if (insErr) {
          summary.errors.push({ issue_key: tk.issue_key, message: `insert_failed: ${insErr.message}` });
          continue;
        }
        const insertedCount = inserted?.length ?? 0;
        summary.transitions_inserted += insertedCount;
        summary.transitions_skipped_dupe += chunk.length - insertedCount;
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
