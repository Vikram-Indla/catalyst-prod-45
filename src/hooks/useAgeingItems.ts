/**
 * useAgeingItems — Shared hook for ageing/governance data.
 * Single source of truth for both AgeingTab and CleanupPage.
 * Queries ph_issues via jira_identity_map.
 * Fetches items where user is ASSIGNEE or REPORTER, tags my_role.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AgeingItem {
  id: string;
  jira_key: string;
  item_type: string;
  summary: string;
  status: string;
  status_category: string;
  days_open: number;
  issue_type_raw: string;
  assignee_account_id: string | null;
  assignee_display_name: string | null;
  reporter_account_id: string | null;
  reporter_display_name: string | null;
  parent_key: string | null;
  parent_issue_type: string | null;
  created_at: string;
  jira_updated_at: string | null;
  fixed_versions: string | null;
  reporter_name: string | null;
  project_key: string;
  priority: string;
  comment_count: number;
  child_issue_count: number;
  assignee_is_active: boolean;
  assignee_last_login: string | null;
  assignee_last_login_days: number;
  my_role: 'assignee' | 'reporter';
}

function mapIssueType(raw: string): string {
  const v = raw.toLowerCase();
  if (v.includes("incident")) return "Production Incident";
  if (v.includes("bug")) return "QA Bug";
  if (v.includes("sub")) return "Sub-task";
  if (v.includes("feature") || v.includes("new feature")) return "Feature";
  return "Story";
}

const SELECT_FIELDS = "id, issue_key, issue_type, summary, status, status_category, priority, jira_created_at, jira_updated_at, parent_key, reporter_account_id, reporter_display_name, assignee_account_id, assignee_display_name, comments, fix_versions, project_key";

export function useAgeingItems() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ageing-items", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data: identityRows } = await supabase
        .from("jira_identity_map")
        .select("jira_account_id")
        .eq("catalyst_user_id", user!.id)
        .limit(1);

      if (!identityRows?.length) return [];

      const myJiraId = identityRows[0].jira_account_id;

      // Run both queries in parallel
      const [assigneeResult, reporterResult] = await Promise.all([
        supabase
          .from("ph_issues")
          .select(SELECT_FIELDS)
          .eq("assignee_account_id", myJiraId)
          .neq("status_category", "done")
          .is("deleted_at", null)
          .order("jira_created_at", { ascending: false }),
        supabase
          .from("ph_issues")
          .select(SELECT_FIELDS)
          .eq("reporter_account_id", myJiraId)
          .neq("assignee_account_id", myJiraId)
          .neq("status_category", "done")
          .is("deleted_at", null)
          .order("jira_created_at", { ascending: false }),
      ]);

      const now = Date.now();

      // Tag and merge
      const tagged = [
        ...(assigneeResult.data ?? []).map(r => ({ ...r, _role: 'assignee' as const })),
        ...(reporterResult.data ?? []).map(r => ({ ...r, _role: 'reporter' as const })),
      ];

      // Deduplicate by id
      const seen = new Set<string>();
      const unique = tagged.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

      return unique
        .filter(row => {
          const sc = (row.status_category || "").toLowerCase().replace(/[\s_-]/g, "");
          return sc !== "done";
        })
        .map(row => {
          const createdAtMs = row.jira_created_at
            ? new Date(row.jira_created_at).getTime()
            : null;
          const daysOpen = createdAtMs
            ? Math.max(1, Math.floor((now - createdAtMs) / 86400_000))
            : 0;
          const issueKey = row.issue_key || "";
          const projectKey = row.project_key || (issueKey.includes("-") ? issueKey.split("-")[0] : "");

          const commentCount = Array.isArray(row.comments) ? row.comments.length : 0;

          const fixVer = Array.isArray(row.fix_versions) && row.fix_versions.length > 0
            ? (row.fix_versions as any[]).map((v: any) => typeof v === 'string' ? v : v?.name || '').filter(Boolean).join(', ')
            : null;

          return {
            id: row.id,
            jira_key: issueKey,
            item_type: mapIssueType(row.issue_type),
            summary: row.summary,
            status: row.status,
            status_category: row.status_category ?? "",
            days_open: daysOpen,
            issue_type_raw: row.issue_type,
            assignee_account_id: row.assignee_account_id,
            assignee_display_name: row.assignee_display_name ?? null,
            reporter_account_id: row.reporter_account_id,
            reporter_display_name: row.reporter_display_name,
            parent_key: row.parent_key,
            parent_issue_type: null,
            created_at: row.jira_created_at || "",
            jira_updated_at: row.jira_updated_at,
            fixed_versions: fixVer,
            reporter_name: row.reporter_display_name ?? null,
            project_key: projectKey,
            priority: row.priority ?? "medium",
            comment_count: commentCount,
            child_issue_count: 0,
            assignee_is_active: true, // no column in ph_issues — assume active
            assignee_last_login: null, // no column in ph_issues
            assignee_last_login_days: 0, // 0 = unknown = assume active
            my_role: row._role,
          } as AgeingItem;
        });
    },
  });
}
