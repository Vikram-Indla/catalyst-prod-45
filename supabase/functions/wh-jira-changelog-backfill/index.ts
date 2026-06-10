/**
 * wh-jira-changelog-backfill
 *
 * Backfills BOTH:
 *   - catalyst_status_history  (status transitions)
 *   - work_item_changelogs     (every field — assignee, priority, etc.)
 *
 * 2026-06-10 — Pivoted from GET /rest/api/3/issue/{key}/changelog (returned
 * empty histories on this Jira instance) to the proven POST /search/jql
 * with `expand: ['changelog']` body — same shape wh-jira-bulk-sync uses,
 * which is confirmed working in prod. Reuse-first per CLAUDE.md 2026-05-16.
 *
 * Per-issue loop is retained for granular reporting but the page size is
 * conservative (25) to stay under the 60s edge-fn budget when expand:
 * changelog inflates payload.
 *
 * Invocation:
 *   POST /functions/v1/wh-jira-changelog-backfill
 *   body: { projects?: string[], limit?: number, dry_run?: boolean }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { mapChangelogItem, type ChangelogContext } from './mapper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackfillRequest {
  projects?: string[];
  limit?: number;
  start_after_key?: string;
  dry_run?: boolean;
}

interface JiraIssue {
  id: string;
  key: string;
  changelog?: {
    histories?: Array<{
      id: string;
      created: string;
      author?: { displayName?: string; accountId?: string; avatarUrls?: Record<string, string> };
      items: Array<{
        field: string;
        fromString?: string | null;
        toString?: string | null;
        from?: string | null;
        to?: string | null;
      }>;
    }>;
  };
}

const PAGE_SIZE = 25;
const REQUEST_DELAY_MS = 75;
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

  // 1. Sync log entry — ph_sync_log has no metadata column, so we stash
  // the summary in `warnings` (jsonb) which IS present.
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
    issues_with_changelog: 0,
    transitions_inserted: 0,
    transitions_skipped_dupe: 0,
    changelogs_inserted: 0,
    changelogs_skipped_dupe: 0,
    errors: [] as Array<{ issue_key: string; message: string }>,
    last_issue_key_processed: null as string | null,
    has_more: false,
  };

  try {
    // 2. Connection
    const { data: conn } = await supabase
      .from('ph_jira_connection')
      .select('site_url, auth_email, auth_token_encrypted, status')
      .single();
    if (!conn || conn.status !== 'connected') {
      throw new Error('Jira connection not configured or not connected.');
    }
    const base = conn.site_url.replace(/\/$/, '');
    const authHeader = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`);
    const baseHeaders = { Authorization: authHeader, Accept: 'application/json' };
    const postHeaders = { ...baseHeaders, 'Content-Type': 'application/json' };

    // 3. Determine project scope. Default = all distinct project_keys in
    // ph_issues (matches the legacy default).
    let projectsToScan: string[] = projectFilter ?? [];
    if (!projectsToScan.length) {
      const { data: distinctProjects } = await supabase
        .from('ph_issues')
        .select('project_key')
        .not('project_key', 'is', null);
      projectsToScan = Array.from(new Set((distinctProjects ?? []).map((r: any) => r.project_key)));
    }

    // 4. Build a key→id (uuid) lookup for ph_issues so we can populate
    // work_item_changelogs.work_item_id without a per-issue SELECT.
    let phQuery = supabase
      .from('ph_issues')
      .select('id, issue_key, project_key, jira_created_at, jira_updated_at')
      .order('issue_key', { ascending: true })
      .limit(issueLimit);
    if (projectsToScan.length) phQuery = phQuery.in('project_key', projectsToScan);
    if (startAfterKey) phQuery = phQuery.gt('issue_key', startAfterKey);
    const { data: tickets, error: tErr } = await phQuery;
    if (tErr) throw tErr;

    // 2026+ guardrail
    const ticketsInWindow = (tickets ?? []).filter((tk: any) => {
      const c = tk.jira_created_at ? new Date(tk.jira_created_at).getFullYear() : null;
      const u = tk.jira_updated_at ? new Date(tk.jira_updated_at).getFullYear() : null;
      return (c !== null && c >= 2026) || (u !== null && u >= 2026);
    });

    if (!ticketsInWindow.length) {
      summary.has_more = false;
      if (logId) await supabase.from('ph_sync_log').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        warnings: summary as any,
      }).eq('id', logId);
      return new Response(JSON.stringify({ success: true, summary, message: 'No tickets to process (2026+ window).' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // key → { uuid, project_key } map for O(1) lookup post-fetch
    const ticketMap = new Map<string, { id: string; project_key: string }>();
    for (const t of ticketsInWindow) ticketMap.set(t.issue_key, { id: t.id, project_key: t.project_key });

    const searchUrl = `${base}/rest/api/3/search/jql`;

    // 5. Scan projects, page through search/jql with expand:changelog.
    //    Only process issues that ALSO appear in our 2026+ ph_issues set.
    const allKeysSet = new Set(ticketsInWindow.map((t: any) => t.issue_key));

    for (const projectKey of projectsToScan) {
      let nextPageToken: string | undefined;
      let projectIssueCount = 0;
      do {
        const reqBody: Record<string, unknown> = {
          jql: `project = "${projectKey}" AND (created >= "2026/01/01" OR updated >= "2026/01/01")`,
          fields: ['summary'], // minimum — we only need keys + embedded changelog
          expand: 'changelog',
          maxResults: PAGE_SIZE,
        };
        if (nextPageToken) reqBody.nextPageToken = nextPageToken;

        let res: Response;
        try {
          res = await fetch(searchUrl, { method: 'POST', headers: postHeaders, body: JSON.stringify(reqBody) });
        } catch (e) {
          summary.errors.push({ issue_key: `__${projectKey}__`, message: `search_fetch_failed: ${(e as Error).message}` });
          break;
        }
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          summary.errors.push({ issue_key: `__${projectKey}__`, message: `search_http_${res.status}: ${errText.slice(0, 200)}` });
          break;
        }
        const data = await res.json();
        const issues: JiraIssue[] = Array.isArray(data.issues) ? data.issues : [];

        // 6. Per-issue: collect rows, dual-upsert.
        for (const issue of issues) {
          if (!allKeysSet.has(issue.key)) continue;
          const meta = ticketMap.get(issue.key)!;
          summary.issues_processed += 1;
          summary.last_issue_key_processed = issue.key;
          const histories = issue.changelog?.histories ?? [];
          if (histories.length) summary.issues_with_changelog += 1;

          const transitionsForIssue: Array<Record<string, unknown>> = [];
          const changelogsForIssue: Array<Record<string, unknown>> = [];

          for (const h of histories) {
            const ctx: ChangelogContext = {
              issue_key: issue.key,
              project_key: meta.project_key,
              work_item_id: meta.id,
              jira_history_id: h.id,
              changed_at: h.created,
              actor_name: h.author?.displayName ?? null,
              actor_account_id: h.author?.accountId ?? null,
              actor_avatar_url: h.author?.avatarUrls?.['24x24'] ?? h.author?.avatarUrls?.['48x48'] ?? null,
            };
            for (const item of h.items ?? []) {
              const rows = mapChangelogItem(item, ctx);
              if (rows.status_history) transitionsForIssue.push(rows.status_history);
              if (rows.changelog) changelogsForIssue.push(rows.changelog);
            }
          }

          if (!transitionsForIssue.length && !changelogsForIssue.length) continue;
          if (dryRun) {
            summary.transitions_inserted += transitionsForIssue.length;
            summary.changelogs_inserted += changelogsForIssue.length;
            continue;
          }

          // 6a. catalyst_status_history
          for (let i = 0; i < transitionsForIssue.length; i += 200) {
            const chunk = transitionsForIssue.slice(i, i + 200);
            const { data: inserted, error: insErr } = await supabase
              .from('catalyst_status_history')
              .upsert(chunk, { onConflict: 'issue_key,changed_at,to_status,from_status', ignoreDuplicates: true })
              .select('id');
            if (insErr) {
              summary.errors.push({ issue_key: issue.key, message: `status_history_insert_failed: ${insErr.message}` });
              continue;
            }
            const insertedCount = inserted?.length ?? 0;
            summary.transitions_inserted += insertedCount;
            summary.transitions_skipped_dupe += chunk.length - insertedCount;
          }

          // 6b. work_item_changelogs
          for (let i = 0; i < changelogsForIssue.length; i += 200) {
            const chunk = changelogsForIssue.slice(i, i + 200);
            const { data: inserted, error: insErr } = await supabase
              .from('work_item_changelogs')
              .upsert(chunk, { onConflict: 'work_item_id,jira_changelog_id,field_name', ignoreDuplicates: true })
              .select('id');
            if (insErr) {
              summary.errors.push({ issue_key: issue.key, message: `changelog_insert_failed: ${insErr.message}` });
              continue;
            }
            const insertedCount = inserted?.length ?? 0;
            summary.changelogs_inserted += insertedCount;
            summary.changelogs_skipped_dupe += chunk.length - insertedCount;
          }
        }

        projectIssueCount += issues.length;
        nextPageToken = data.nextPageToken;
        await sleep(REQUEST_DELAY_MS);
      } while (nextPageToken && projectIssueCount < issueLimit);

      console.log(`[backfill] project=${projectKey} issues_scanned=${projectIssueCount}`);
    }

    summary.has_more = false; // search/jql exhausts pagination per-project

    if (logId) await supabase.from('ph_sync_log').update({
      status: summary.errors.length ? 'completed_with_errors' : 'completed',
      completed_at: new Date().toISOString(),
      warnings: summary as any,
    }).eq('id', logId);

    return new Response(JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    if (logId) await supabase.from('ph_sync_log').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      warnings: { ...summary, fatal_error: message } as any,
    }).eq('id', logId);
    return new Response(JSON.stringify({ success: false, error: message, summary }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
