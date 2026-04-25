/**
 * useRecentIssues — "Recent" rail data source for HomeSidebar.
 *
 * What this replaces
 * ──────────────────
 * The previous Home rail used `useRecentRooms()`, which queries the
 * page/space-level `recent_activity` table. That gave the user rows like
 * "Product Room", "Core Banking", "Test Room" — pages, not the issues the
 * user actually cares about. Vikram's directive (Apr 2026):
 *
 *   "under recent qa bug/defects, production incident, release numbers
 *    if they come up makes more sense including other issue types also
 *    but the priority is above"
 *
 * So Recent now surfaces *issues*, not rooms, with a priority order that
 * matches operational urgency.
 *
 * Data source
 * ───────────
 * `ph_issues` joined to the current user's Jira identity through
 * `ph_user_mapping` (same path useForYouData.ts walks):
 *
 *   1. authUser.id  →  ph_user_mapping.catalyst_profile_id
 *                  →  ph_user_mapping.jira_account_id (1:N — user can be
 *                                                       mapped to multiple
 *                                                       Jira accounts)
 *   2. ph_issues where assignee_account_id ∈ jira_account_ids
 *                  OR    reporter_account_id ∈ jira_account_ids
 *   3. filter archived_at IS NULL AND deleted_at IS NULL
 *   4. order by jira_updated_at desc, overfetch ~5x
 *   5. JS-side sort: priority bucket asc, then jira_updated_at desc
 *   6. take top `limit`
 *
 * Note: "Release" is NOT a ph_issues issue_type — release information is
 * stored in `fix_versions` JSONB on individual issues, and ReleaseHub
 * sources its own list separately. We deliberately do NOT fabricate a
 * Release bucket; if releases need their own line in the rail later, that
 * is a separate hook.
 *
 * Priority bucketing (matches Vikram's directive)
 * ───────────────────────────────────────────────
 *   Bucket 0 (P0): 'Production Incident'
 *   Bucket 1 (P1): 'QA Bug', 'Defect', 'Bug'
 *   Bucket 2 (P2): 'Story', 'Feature', 'New Feature'
 *   Bucket 3:      everything else (Task, Sub-task, Backend, Frontend,
 *                  Figma, Integration, Improvement, BRD Task, Epic, …)
 *
 * Within each bucket, items are ordered by `jira_updated_at` desc — the
 * most recently touched item floats to the top.
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

const PRIORITY_BUCKETS: Record<string, number> = {
  // Bucket 0 — operational P0
  'Production Incident': 0,
  // Bucket 1 — defect class
  'QA Bug': 1,
  Defect: 1,
  Bug: 1,
  // Bucket 2 — delivery-class (releases-adjacent work surfaces here)
  Story: 2,
  Feature: 2,
  'New Feature': 2,
};

function bucketFor(issueType: string | null | undefined): number {
  if (!issueType) return 3;
  return PRIORITY_BUCKETS[issueType] ?? 3;
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
        //    overfetch ~5x to give the bucket sort enough rows to reorder
        //    a P0 incident to the top even if it's a few days older than
        //    the last touched task.
        const overfetchLimit = Math.max(limit * 5, 25);
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

        // 4. Bucket sort. Stable order within bucket = jira_updated_at desc
        //    (already the DB sort), so we only need to compare buckets.
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
