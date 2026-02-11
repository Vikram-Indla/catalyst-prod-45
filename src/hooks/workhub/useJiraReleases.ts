/**
 * useJiraReleases — Derives releases from wh_issues fix_versions (real Jira data)
 * Each unique fix version name becomes a "release" with aggregated stats
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface JiraRelease {
  versionName: string;
  releaseDate: string | null;
  totalItems: number;
  doneItems: number;
  inProgressItems: number;
  inReviewItems: number;
  blockedItems: number;
  todoItems: number;
  completionPercent: number;
  projects: string[];
  assignees: JiraReleaseAssignee[];
}

export interface JiraReleaseAssignee {
  accountId: string;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Fetches all unique fix versions from wh_issues and aggregates stats per version.
 * Uses paginated scan to avoid Supabase's 1000 row limit.
 */
export function useJiraReleases() {
  return useQuery({
    queryKey: ['workhub', 'jira-releases'],
    queryFn: async () => {
      // Step 1: Paginated scan of all issues with fix_versions
      const releaseMap = new Map<string, {
        releaseDate: string | null;
        total: number;
        done: number;
        inProgress: number;
        inReview: number;
        blocked: number;
        todo: number;
        projects: Set<string>;
        assigneeMap: Map<string, { accountId: string; displayName: string }>;
      }>();

      let page = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('wh_issues')
          .select('fix_versions, project_key, status, status_category, assignee_account_id, assignee_display_name')
          .not('fix_versions', 'eq', '[]')
          .range(page * batchSize, (page + 1) * batchSize - 1);

        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;

        data.forEach((row: any) => {
          if (!Array.isArray(row.fix_versions)) return;
          row.fix_versions.forEach((v: any) => {
            if (!v?.name) return;
            const name = v.name;
            if (!releaseMap.has(name)) {
              releaseMap.set(name, {
                releaseDate: v.releaseDate || null,
                total: 0, done: 0, inProgress: 0, inReview: 0, blocked: 0, todo: 0,
                projects: new Set(),
                assigneeMap: new Map(),
              });
            }
            const r = releaseMap.get(name)!;
            r.total++;
            r.projects.add(row.project_key);

            // Categorize status
            const status = (row.status || '').toLowerCase();
            const category = (row.status_category || '').toLowerCase();
            if (category === 'done') r.done++;
            else if (status === 'blocked') r.blocked++;
            else if (['in review', 'technical validation', 'ready for qa', 'ready for uat'].includes(status)) r.inReview++;
            else if (category === 'in progress' || ['in progress', 'in development', 'in beta'].includes(status)) r.inProgress++;
            else r.todo++;

            // Track assignees
            if (row.assignee_account_id && row.assignee_display_name) {
              if (!r.assigneeMap.has(row.assignee_account_id)) {
                r.assigneeMap.set(row.assignee_account_id, {
                  accountId: row.assignee_account_id,
                  displayName: row.assignee_display_name,
                });
              }
            }
          });
        });

        hasMore = data.length === batchSize;
        page++;
      }

      // Step 2: Fetch avatar URLs from wh_user_mapping
      const allAccountIds = new Set<string>();
      releaseMap.forEach(r => r.assigneeMap.forEach((_, id) => allAccountIds.add(id)));

      const avatarMap = new Map<string, string>();
      if (allAccountIds.size > 0) {
        const ids = Array.from(allAccountIds);
        // Batch fetch
        for (let i = 0; i < ids.length; i += 500) {
          const batch = ids.slice(i, i + 500);
          const { data: mappings } = await (supabase as any)
            .from('wh_user_mapping')
            .select('jira_account_id, jira_avatar_url, catalyst_profile_id')
            .in('jira_account_id', batch);

          const profileIds = (mappings ?? [])
            .filter((m: any) => m.catalyst_profile_id)
            .map((m: any) => m.catalyst_profile_id);

          let profileAvatars = new Map<string, string>();
          if (profileIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, avatar_url')
              .in('id', profileIds);
            (profiles ?? []).forEach((p: any) => {
              if (p.avatar_url) profileAvatars.set(p.id, p.avatar_url);
            });
          }

          (mappings ?? []).forEach((m: any) => {
            const profileAvatar = m.catalyst_profile_id ? profileAvatars.get(m.catalyst_profile_id) : null;
            const url = profileAvatar || m.jira_avatar_url;
            if (url) avatarMap.set(m.jira_account_id, url);
          });
        }
      }

      // Step 3: Build results
      const results: JiraRelease[] = [];
      releaseMap.forEach((r, name) => {
        const assignees: JiraReleaseAssignee[] = [];
        r.assigneeMap.forEach(a => {
          assignees.push({
            accountId: a.accountId,
            displayName: a.displayName,
            avatarUrl: avatarMap.get(a.accountId) || null,
          });
        });

        results.push({
          versionName: name,
          releaseDate: r.releaseDate,
          totalItems: r.total,
          doneItems: r.done,
          inProgressItems: r.inProgress,
          inReviewItems: r.inReview,
          blockedItems: r.blocked,
          todoItems: r.todo,
          completionPercent: r.total > 0 ? Math.round((r.done / r.total) * 100) : 0,
          projects: Array.from(r.projects).sort(),
          assignees: assignees.sort((a, b) => a.displayName.localeCompare(b.displayName)),
        });
      });

      // Sort by releaseDate desc, then name
      results.sort((a, b) => {
        if (a.releaseDate && b.releaseDate) return b.releaseDate.localeCompare(a.releaseDate);
        if (a.releaseDate) return -1;
        if (b.releaseDate) return 1;
        return a.versionName.localeCompare(b.versionName);
      });

      return results;
    },
    staleTime: 30_000,
  });
}

/** Single release by version name */
export function useJiraRelease(versionName: string) {
  const { data: allReleases, ...rest } = useJiraReleases();
  const release = allReleases?.find(r => r.versionName === versionName) ?? null;
  return { data: release, ...rest };
}
