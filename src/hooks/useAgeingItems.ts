/**
 * useAgeingItems — Shared hook for ageing/governance data.
 * Single source of truth for both AgeingTab and CleanupPage.
 * Queries ph_issues via jira_identity_map.
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
  days_assigned: number;
  issue_type_raw: string;
  assignee_account_id: string | null;
  reporter_account_id: string | null;
  reporter_display_name: string | null;
  parent_key: string | null;
  created_at: string;
  jira_updated_at: string | null;
  fixed_versions: string | null;
  reporter_name: string | null;
  project_key: string;
}

function mapIssueType(raw: string): string {
  const v = raw.toLowerCase();
  if (v.includes("incident")) return "Production Incident";
  if (v.includes("bug")) return "QA Bug";
  if (v.includes("sub")) return "Sub-task";
  if (v.includes("feature") || v.includes("new feature")) return "Feature";
  return "Story";
}

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

      const jiraAccountId = identityRows[0].jira_account_id;

      const { data } = await supabase
        .from("ph_issues")
        .select("id, issue_key, issue_type, summary, status, status_category, jira_created_at, jira_updated_at, parent_key, reporter_account_id, reporter_display_name, assignee_account_id")
        .eq("assignee_account_id", jiraAccountId)
        .neq("status_category", "done")
        .is("deleted_at", null)
        .order("jira_created_at", { ascending: false });

      const now = Date.now();
      return (data ?? [])
        .filter(row => {
          const sc = (row.status_category || "").toLowerCase().replace(/[\s_-]/g, "");
          return sc !== "done";
        })
        .map(row => {
          const createdAt = row.jira_created_at ? new Date(row.jira_created_at).getTime() : now;
          const daysAssigned = Math.max(1, Math.floor((now - createdAt) / 86400_000));
          const issueKey = row.issue_key || "";
          const projectKey = issueKey.includes("-") ? issueKey.split("-")[0] : "";
          return {
            id: row.id,
            jira_key: issueKey,
            item_type: mapIssueType(row.issue_type),
            summary: row.summary,
            status: row.status,
            status_category: row.status_category ?? "",
            days_assigned: daysAssigned,
            issue_type_raw: row.issue_type,
            assignee_account_id: row.assignee_account_id,
            reporter_account_id: row.reporter_account_id,
            reporter_display_name: row.reporter_display_name,
            parent_key: row.parent_key,
            created_at: row.jira_created_at || "",
            jira_updated_at: row.jira_updated_at,
            fixed_versions: (row as any).fixed_versions ?? null,
            reporter_name: row.reporter_display_name ?? null,
            project_key: projectKey,
          } as AgeingItem;
        });
    },
  });
}
