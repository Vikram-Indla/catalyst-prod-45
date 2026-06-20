/**
 * wh-jira-changelog-backfill
 *
 * Backfills BOTH:
 *   - catalyst_status_history  (status transitions)
 *   - work_item_changelogs     (every field — assignee, priority, etc.)
 *   - work_item_transitions    (Catalyst Replay canonical source)
 *
 * Invocation:
 *   POST /functions/v1/wh-jira-changelog-backfill
 *   body: { projects?: string[], limit?: number, dry_run?: boolean }
 *
 * `limit` caps the number of Jira issues scanned per project (not the
 * ph_issues preload). All 2026+ ph_issues with real Jira keys are loaded
 * into memory so the Jira-result intersection check works regardless of
 * alphabetical ordering.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  mapChangelogItem,
  resolveStatusCategoryLabel,
  type ChangelogContext,
  type TransitionRow,
} from './mapper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackfillRequest {
  projects?: string[];
  limit?: number;
  start_after_key?: string;
  dry_run?: boolean;
  // JQL date window — use to split large projects across multiple calls.
  // Format: "2026/01/01" (Jira JQL date format).
  date_from?: string;
  date_to?: string;
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

// Real Jira keys are PROJECT-NUMBER. Synthetic keys (LOCAL-*, timestamp-*)
// never appear in Jira API results and can be skipped.
const JIRA_KEY_RE = /^[A-Z]+-\d+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const body: BackfillRequest = await req.json().catch(() => ({}));
  const projectFilter = body.projects ?? null;
  const jiraScanLimit = Math.max(1, Math.min(body.limit ?? 500, 5000));
  const dryRun = !!body.dry_run;
  const dateFrom = body.date_from ?? '2026/01/01';
  const dateTo = body.date_to ?? null;

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
    replay_transitions_inserted: 0,
    replay_transitions_skipped_dupe: 0,
    changelogs_inserted: 0,
    changelogs_skipped_dupe: 0,
    errors: [] as Array<{ issue_key: string; message: string }>,
    last_issue_key_processed: null as string | null,
    has_more: false,
  };

  try {
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

    let statusMappingLookup: Record<string, 'todo' | 'progress' | 'done'> = {};
    try {
      const { data: cfg } = await supabase
        .from('wh_config')
        .select('value')
        .eq('key', 'status_mapping')
        .single();
      const raw = cfg?.value;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === 'object') {
        for (const [statusName, bucket] of Object.entries(parsed)) {
          const b = String(bucket).toLowerCase();
          const norm = b === 'done' || b === 'complete'
            ? 'done'
            : b === 'progress' || b === 'in progress' || b === 'in_progress' || b === 'indeterminate'
            ? 'progress'
            : 'todo';
          statusMappingLookup[statusName.toLowerCase().trim()] = norm as 'todo' | 'progress' | 'done';
        }
      }
    } catch {
      // status_mapping absent — heuristics handle it.
    }

    let projectsToScan: string[] = projectFilter ?? [];
    if (!projectsToScan.length) {
      const { data: distinctProjects } = await supabase
        .from('ph_issues')
        .select('project_key')
        .not('project_key', 'is', null);
      projectsToScan = Array.from(new Set((distinctProjects ?? []).map((r: any) => r.project_key)));
    }

    // Load ALL 2026+ ph_issues with real Jira keys into memory.
    // `jiraScanLimit` only caps the Jira API scan, not this preload.
    let phQuery = supabase
      .from('ph_issues')
      .select('id, issue_key, project_key')
      .or('jira_created_at.gte.2026-01-01,jira_updated_at.gte.2026-01-01')
      .limit(10000);
    if (projectsToScan.length) phQuery = phQuery.in('project_key', projectsToScan);
    const { data: tickets, error: tErr } = await phQuery;
    if (tErr) throw tErr;

    // Filter to real Jira keys only (PROJECT-NUMBER pattern).
    const ticketsInWindow = (tickets ?? []).filter((t: any) => JIRA_KEY_RE.test(t.issue_key));

    if (!ticketsInWindow.length) {
      if (logId) await supabase.from('ph_sync_log').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        warnings: summary as any,
      }).eq('id', logId);
      return new Response(
        JSON.stringify({ success: true, summary, message: 'No real Jira keys found in 2026+ window.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const ticketMap = new Map<string, { id: string; project_key: string }>();
    for (const t of ticketsInWindow) ticketMap.set(t.issue_key, { id: t.id, project_key: t.project_key });
    const allKeysSet = new Set(ticketMap.keys());

    console.log(`[backfill] loaded ${allKeysSet.size} real Jira keys from ph_issues`);

    const searchUrl = `${base}/rest/api/3/search/jql`;

    for (const projectKey of projectsToScan) {
      let nextPageToken: string | undefined;
      let projectIssueCount = 0;
      do {
        const reqBody: Record<string, unknown> = {
          jql: `project = "${projectKey}" AND (created >= "${dateFrom}" OR updated >= "${dateFrom}")${dateTo ? ` AND (created < "${dateTo}" OR updated < "${dateTo}")` : ''}`,
          fields: ['summary'],
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

        for (const issue of issues) {
          if (!allKeysSet.has(issue.key)) continue;
          const meta = ticketMap.get(issue.key)!;
          summary.issues_processed += 1;
          summary.last_issue_key_processed = issue.key;
          const histories = issue.changelog?.histories ?? [];
          if (histories.length) summary.issues_with_changelog += 1;

          const transitionsForIssue: Array<Record<string, unknown>> = [];
          const changelogsForIssue: Array<Record<string, unknown>> = [];
          const statusEvents: Array<{
            jira_history_id: string;
            created: string;
            from_status: string | null;
            to_status: string;
            author: string | null;
            avatar: string | null;
          }> = [];

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
              if (item.field === 'status' && (item.toString ?? null)) {
                statusEvents.push({
                  jira_history_id: h.id,
                  created: h.created,
                  from_status: item.fromString ?? null,
                  to_status: item.toString as string,
                  author: h.author?.displayName ?? null,
                  avatar: h.author?.avatarUrls?.['48x48'] ?? h.author?.avatarUrls?.['24x24'] ?? null,
                });
              }
            }
          }

          statusEvents.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
          const replayRows: TransitionRow[] = [];
          for (let si = 0; si < statusEvents.length; si++) {
            const ev = statusEvents[si];
            const prev = si > 0 ? statusEvents[si - 1] : null;
            const timeInFromMs = prev
              ? new Date(ev.created).getTime() - new Date(prev.created).getTime()
              : null;
            const toCat = resolveStatusCategoryLabel(ev.to_status, statusMappingLookup);
            replayRows.push({
              work_item_id: meta.id,
              from_status: ev.from_status,
              to_status: ev.to_status,
              from_status_category: resolveStatusCategoryLabel(ev.from_status, statusMappingLookup),
              to_status_category: toCat ?? 'In Progress',
              transitioned_by: ev.author ?? 'Unknown',
              transitioned_by_avatar: ev.avatar,
              transitioned_at: ev.created,
              time_in_from_status_ms: timeInFromMs,
              jira_changelog_id: ev.jira_history_id,
            });
          }

          if (!transitionsForIssue.length && !changelogsForIssue.length && !replayRows.length) continue;
          if (dryRun) {
            summary.transitions_inserted += transitionsForIssue.length;
            summary.changelogs_inserted += changelogsForIssue.length;
            summary.replay_transitions_inserted += replayRows.length;
            continue;
          }

          // work_item_transitions (Replay)
          for (let i = 0; i < replayRows.length; i += 200) {
            const chunk = replayRows.slice(i, i + 200);
            const { data: inserted, error: insErr } = await supabase
              .from('work_item_transitions')
              .upsert(chunk, { onConflict: 'work_item_id,jira_changelog_id', ignoreDuplicates: true })
              .select('id');
            if (insErr) {
              summary.errors.push({ issue_key: issue.key, message: `replay_transition_insert_failed: ${insErr.message}` });
            } else {
              const insertedCount = inserted?.length ?? 0;
              summary.replay_transitions_inserted += insertedCount;
              summary.replay_transitions_skipped_dupe += chunk.length - insertedCount;
            }
          }

          // catalyst_status_history
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

          // work_item_changelogs
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
      } while (nextPageToken && projectIssueCount < jiraScanLimit);

      console.log(`[backfill] project=${projectKey} jira_scanned=${projectIssueCount} processed=${summary.issues_processed}`);
    }

    summary.has_more = false;

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
