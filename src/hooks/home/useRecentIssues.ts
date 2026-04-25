/**
 * useRecentIssues — "Recent" rail data source for HomeSidebar.
 *
 * What this replaces
 * ──────────────────
 * The previous Home rail used `useRecentRooms()`, which queries the
 * page/space-level `recent_activity` table. That gave the user rows like
 * "Product Room", "Core Banking", "Test Room" — pages, not the issues the
 * user actually cares about. Recent now surfaces *issues*.
 *
 * Strict type filter (Apr 2026 — Vikram directive, refined)
 * ──────────────────────────────────────────────────────────
 * The rail surfaces ONLY four operational types — Feature/Sub-task/Task/
 * Epic/Backend/Frontend/Improvement etc. are filtered out entirely.
 *
 *   "I don't want any subtask category. I need always to have:
 *      • Production defects
 *      • QA defects or bugs
 *      • Stories
 *      • Business requests
 *    These are the things which should be in recent, nothing else."
 *
 * Bucketing (within the filtered set)
 *   Bucket 0 (P0): 'Production Incident'   → orange ? circle
 *   Bucket 1 (P1): 'QA Bug' / 'Defect' / 'Bug' → red asterisk
 *   Bucket 2 (P2): 'Story'                 → green bookmark
 *   Bucket 3 (P3): 'Business Request'      → business_gap (orange) icon alias
 *
 * Within each bucket items are ordered by `jira_updated_at` desc — the
 * most recently touched item floats to the top of its bucket.
 *
 * Data source
 * ───────────
 * `ph_issues` joined to the current user's Jira identity through
 * `ph_user_mapping`:
 *
 *   1. authUser.id  →  ph_user_mapping.catalyst_profile_id
 *                  →  ph_user_mapping.jira_account_id (1:N)
 *   2. ph_issues where assignee_account_id ∈ jira_account_ids
 *                  OR    reporter_account_id ∈ jira_account_ids
 *   3. filter archived_at IS NULL AND deleted_at IS NULL
 *   4. order by jira_updated_at desc, overfetch 10x (was 5x — tightened
 *      filter discards more rows so we need a wider net to find `limit`
 *      matches; without this the rail under-filled when most recent
 *      activity was on Features/Sub-tasks/etc.)
 *   5. JS-side: filter to the 4 allowed types, then bucket-sort, then
 *      slice to `limit`
 *
 * Note: "Release" is NOT a ph_issues issue_type — release information is
 * stored in `fix_versions` JSONB on individual issues. Vikram's earlier
 * mention of "release numbers" was de-scoped here; releases need their
 * own rail or are out-of-scope for Recent.
 *
 * Click behaviour
 * ───────────────
 * Each row carries the data needed to call
 * `useGlobalSearchStore.openDetail({ id, projectKey, itemType })`. The
 * shared CatalystDetailRouter (mounted in CatalystShell) takes over from
 * there. No route navigation — the user stays on `/` and the detail
 * drawer slides in.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RecentIssue {
  /** ph_issues.id (UUID) — used as the detail-drawer itemId */
  id: string;
  /** Human-readable Jira key (e.g. BAU-5514) — rendered as the row title */
  issueKey: string;
  /** Issue summary (the natural-language title) — rendered under issueKey when expanded */
  summary: string;
  /** Raw ph_issues.issue_type string ('Production Incident', 'QA Bug', 'Story', …) */
  issueType: string;
  /** Project key (e.g. BAU, CEA) — passed to openDetail() */
  projectKey: string;
  /** ISO timestamp (jira_updated_at) — drives the right-side relative time */
  updatedAt: string;
  /** ph_issues.status — kept on the row for future tooltips/filters */
  status: string;
}

interface UseRecentIssuesOptions {
  /** Final number of rows to return after bucketing + sorting */
  limit?: number;
}

interface UseRecentIssuesResult {
  recentIssues: RecentIssue[];
  loading: boolean;
}

/**
 * Strict bucket map. Keys are normalized (lowercase, hyphens/spaces → '_')
 * to absorb common DB casing variants like "production incident" /
 * "Production Incident" / "PRODUCTION_INCENTITY". A miss returns -1
 * which we use as the "drop this row" sentinel.
 */
const PRIORITY_BUCKETS: Record<string, number> = {
  // Bucket 0 — Production defects / Production incidents
  production_incident: 0,
  prod_incident: 0,
  production_issue: 0,
  prod_issue: 0,
  incident: 0,
  // Bucket 1 — QA defects / Bugs
  qa_bug: 1,
  defect: 1,
  bug: 1,
  // Bucket 2 — Stories
  story: 2,
  user_story: 2,
  // Bucket 3 — Business Requests
  business_request: 3,
  brd_task: 3,
};

function normalizeTypeKey(raw: string | null | undefined): string {
  if (!raw) return '';
  return String(raw).trim().toLowerCase().replace(/[-\s]+/g, '_');
}

/**
 * Returns the bucket index (0–3) for an issue_type that should appear in
 * the rail, or -1 to indicate the row should be filtered out entirely.
 */
function bucketFor(issueType: string | null | undefined): number {
  const key = normalizeTypeKey(issueType);
  if (!key) return -1;
  return PRIORITY_BUCKETS[key] ?? -1;
}

export function useRecentIssues(
  options: UseRecentIssuesOptions = {},
): UseRecentIssuesResult {
  const { limit = 5 } = options;
  const [recentIssues, setRecentIssues] = useState<RecentIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1. Resolve current user
        const { data: authData } = await supabase.auth.getUser();
        const authUserId = authData?.user?.id;
        if (!authUserId) {
          if (!cancelled) {
            setRecentIssues([]);
            setLoading(false);
          }
          return;
        }

        // 2. Resolve user's Jira account ids via ph_user_mapping. Falls
        //    back to display-name matching like useForYouData does — keeps
        //    behaviour consistent across "you" surfaces.
        const { data: mappings } = await supabase
          .from('ph_user_mapping')
          .select('jira_account_id')
          .eq('catalyst_profile_id', authUserId)
          .eq('is_mapped', true);

        let jiraAccountIds = (mappings ?? [])
          .map((m: { jira_account_id: string | null }) => m.jira_account_id)
          .filter((id): id is string => !!id);

        if (jiraAccountIds.length === 0) {
          // Display-name fallback — read profile then probe by name.
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', authUserId)
            .maybeSingle();
          const fullName = (profile as { full_name?: string | null } | null)?.full_name;
          if (fullName) {
            const { data: nameMatches } = await supabase
              .from('ph_user_mapping')
              .select('jira_account_id')
              .ilike('jira_display_name', `%${fullName}%`)
              .eq('is_mapped', true);
            jiraAccountIds = (nameMatches ?? [])
              .map((m: { jira_account_id: string | null }) => m.jira_account_id)
              .filter((id): id is string => !!id);
          }
        }

        if (jiraAccountIds.length === 0) {
          if (!cancelled) {
            setRecentIssues([]);
            setLoading(false);
          }
          return;
        }

        // 3. Pull issues where the user is assignee OR reporter. We
        //    overfetch 10x because the strict type filter (incident /
        //    bug / story / business_request only) discards most rows;
        //    without a wide net the rail under-fills when most recent
        //    activity sits on Features/Sub-tasks/Tasks.
        const overfetchLimit = Math.max(limit * 10, 60);
        const accountList = jiraAccountIds
          .map((id) => `"${id.replace(/"/g, '\\"')}"`)
          .join(',');

        const { data, error } = await supabase
          .from('ph_issues')
          .select('id, issue_key, summary, issue_type, project_key, status, jira_updated_at')
          .or(
            `assignee_account_id.in.(${accountList}),reporter_account_id.in.(${accountList})`,
          )
          .is('archived_at', null)
          .is('deleted_at', null)
          .order('jira_updated_at', { ascending: false, nullsFirst: false })
          .limit(overfetchLimit);

        if (error) throw error;

        // 4. Filter strictly to the four allowed buckets, then bucket-sort.
        //    Within a bucket, items are already in jira_updated_at desc
        //    order from the DB, so the comparator only needs to handle
        //    cross-bucket ordering and tie-break by updated time.
        const sorted = (data ?? [])
          .map((row): RecentIssue => ({
            id: row.id,
            issueKey: row.issue_key,
            summary: row.summary,
            issueType: row.issue_type,
            projectKey: row.project_key,
            updatedAt: row.jira_updated_at ?? new Date(0).toISOString(),
            status: row.status,
          }))
          .filter((r) => bucketFor(r.issueType) >= 0)
          .sort((a, b) => {
            const ba = bucketFor(a.issueType);
            const bb = bucketFor(b.issueType);
            if (ba !== bb) return ba - bb;
            // Same bucket — newer first
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          })
          .slice(0, limit);

        if (!cancelled) {
          setRecentIssues(sorted);
          setLoading(false);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[useRecentIssues] failed to load recent issues', err);
        if (!cancelled) {
          setRecentIssues([]);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { recentIssues, loading };
}
