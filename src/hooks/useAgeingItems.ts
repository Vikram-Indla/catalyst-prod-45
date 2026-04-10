/**
 * useAgeingItems — Shared hook for ageing/governance data.
 * Two-step: resolve myJiraId from profiles, then fetch items.
 * 2 base queries (assignee + reporter) + 4 enrichment queries.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AgeingItem {
  id: string;
  issue_key: string;
  issue_type: string;
  summary: string;
  status: string;
  status_category: string;
  priority: string;
  jira_created_at: string;
  jira_updated_at: string;
  parent_key: string | null;
  parent_summary: string | null;
  parent_issue_type: string | null;
  project_key: string;
  project_name: string;
  reporter_account_id: string | null;
  reporter_display_name: string | null;
  assignee_account_id: string | null;
  assignee_display_name: string | null;
  fix_versions: string | null;
  comment_count: number;
  child_issue_count: number;
  assignee_status: string;
  assignee_last_login_at: string | null;
  assignee_last_login_days: number;
  assignee_is_inactive: boolean;
  my_role: 'assignee' | 'reporter';
  days_open: number;
  // Compat aliases
  jira_key: string;
  item_type: string;
  issue_type_raw: string;
  reporter_name: string | null;
  fixed_versions: string | null;
  created_at: string;
  assignee_is_active: boolean;
}

const BASE_SELECT = `id, issue_key, issue_type, summary, status, status_category, priority, jira_created_at, jira_updated_at, parent_key, parent_summary, project_key, project_name, reporter_account_id, reporter_display_name, assignee_account_id, assignee_display_name, fix_versions, hierarchy_level, labels, story_points, sprint_name, resolution, deleted_at`;

function mapIssueType(raw: string): string {
  const v = (raw || '').toLowerCase();
  if (v.includes("incident")) return "Production Incident";
  if (v.includes("bug")) return "QA Bug";
  if (v.includes("sub")) return "Sub-task";
  if (v.includes("feature") || v.includes("new feature")) return "Feature";
  return "Story";
}

export function useAgeingItems() {
  const { user } = useAuth();

  // Step A: resolve myJiraId from profiles table
  const { data: myJiraId } = useQuery({
    queryKey: ["my-jira-id", user?.id],
    enabled: !!user?.id,
    staleTime: 300_000,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("jira_account_id")
        .eq("id", user!.id)
        .single();
      const jiraId = profile?.jira_account_id ?? null;
      console.log('[useAgeingItems] myJiraId:', jiraId);
      if (!jiraId) {
        console.warn('[useAgeingItems] No jira_account_id on profile — aborting');
      }
      return jiraId;
    },
  });

  // Step B: fetch ageing items only when myJiraId is confirmed
  return useQuery({
    queryKey: ["ageing-items", user?.id, myJiraId],
    staleTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!user?.id && !!myJiraId,
    queryFn: async (): Promise<AgeingItem[]> => {
      if (!myJiraId) return [];

      // Q1 + Q2: base queries in parallel
      const [assigneeResult, reporterResult] = await Promise.all([
        supabase
          .from("ph_issues")
          .select(BASE_SELECT)
          .eq("assignee_account_id", myJiraId)
          .is("deleted_at", null),
        supabase
          .from("ph_issues")
          .select(BASE_SELECT)
          .eq("reporter_account_id", myJiraId)
          .neq("assignee_account_id", myJiraId)
          .is("deleted_at", null),
      ]);

      const q1Items = (assigneeResult.data ?? []).map(i => ({ ...i, my_role: 'assignee' as const }));
      const q2Items = (reporterResult.data ?? []).map(i => ({ ...i, my_role: 'reporter' as const }));

      console.log('[useAgeingItems] Q1 assignee items:', q1Items.length);
      console.log('[useAgeingItems] Q2 reporter items:', q2Items.length);

      // Dedup — assignee wins over reporter
      const seen = new Set<string>();
      const deduped = [...q1Items, ...q2Items].filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });

      console.log('[useAgeingItems] Total after dedup:', deduped.length);

      if (deduped.length === 0) return [];

      // Filter out done items
      const baseItems = deduped.filter(row => {
        const sc = (row.status_category || '').toLowerCase().replace(/[\s_-]/g, '');
        return sc !== 'done';
      });

      const issueIds = baseItems.map(i => i.id);
      const issueKeys = baseItems.map(i => i.issue_key);
      const assigneeJiraIds = [...new Set(
        baseItems.map(i => i.assignee_account_id).filter(Boolean)
      )] as string[];
      const parentKeys = [...new Set(
        baseItems.map(i => i.parent_key).filter(Boolean)
      )] as string[];

      // Q3–Q6: enrichment queries in parallel
      const [commentsResult, childrenResult, profilesResult, parentsResult] = await Promise.all([
        supabase.from("ph_comments").select("work_item_id").in("work_item_id", issueIds),
        supabase.from("ph_issues").select("parent_key").in("parent_key", issueKeys).is("deleted_at", null),
        assigneeJiraIds.length > 0
          ? supabase.from("profiles").select("jira_account_id, status, last_login_at").in("jira_account_id", assigneeJiraIds)
          : Promise.resolve({ data: [] as any[] }),
        parentKeys.length > 0
          ? supabase.from("ph_issues").select("issue_key, issue_type").in("issue_key", parentKeys)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      // Build lookup maps
      const commentMap: Record<string, number> = {};
      for (const row of (commentsResult.data ?? [])) {
        commentMap[row.work_item_id] = (commentMap[row.work_item_id] ?? 0) + 1;
      }

      const childMap: Record<string, number> = {};
      for (const row of (childrenResult.data ?? [])) {
        if (row.parent_key) childMap[row.parent_key] = (childMap[row.parent_key] ?? 0) + 1;
      }

      const profileMap: Record<string, { status: string; last_login_at: string | null }> = {};
      for (const row of (profilesResult.data ?? [])) {
        if (row.jira_account_id) {
          profileMap[row.jira_account_id] = {
            status: row.status ?? 'active',
            last_login_at: row.last_login_at ?? null,
          };
        }
      }

      const parentTypeMap: Record<string, string> = {};
      for (const row of (parentsResult.data ?? [])) {
        parentTypeMap[row.issue_key] = row.issue_type;
      }

      // Assemble final items
      const now = Date.now();

      return baseItems.map(item => {
        const profile = item.assignee_account_id ? profileMap[item.assignee_account_id] : undefined;
        const assignee_last_login_at = profile?.last_login_at ?? null;
        const assignee_last_login_days = assignee_last_login_at
          ? Math.floor((now - new Date(assignee_last_login_at).getTime()) / 86400000)
          : 0;
        const assignee_is_inactive =
          (profile?.status != null && profile.status.toLowerCase() !== 'active') ||
          (assignee_last_login_days > 0 && assignee_last_login_days > 60);

        const days_open = item.jira_created_at
          ? Math.max(1, Math.floor((now - new Date(item.jira_created_at).getTime()) / 86400000))
          : 0;

        const fixVer = Array.isArray(item.fix_versions) && item.fix_versions.length > 0
          ? (item.fix_versions as any[]).map((v: any) => typeof v === 'string' ? v : v?.name || '').filter(Boolean).join(', ')
          : (typeof item.fix_versions === 'string' ? item.fix_versions : null);

        const parentIssueType = item.parent_key ? (parentTypeMap[item.parent_key] ?? null) : null;

        return {
          id: item.id,
          issue_key: item.issue_key || '',
          issue_type: item.issue_type || 'Task',
          summary: item.summary || '',
          status: item.status || '',
          status_category: item.status_category || '',
          priority: item.priority || 'medium',
          jira_created_at: item.jira_created_at || '',
          jira_updated_at: item.jira_updated_at || '',
          parent_key: item.parent_key,
          parent_summary: item.parent_summary ?? null,
          parent_issue_type: parentIssueType,
          project_key: item.project_key || '',
          project_name: item.project_name || '',
          reporter_account_id: item.reporter_account_id,
          reporter_display_name: item.reporter_display_name ?? null,
          assignee_account_id: item.assignee_account_id,
          assignee_display_name: item.assignee_display_name ?? null,
          fix_versions: fixVer,
          comment_count: commentMap[item.id] ?? 0,
          child_issue_count: childMap[item.issue_key] ?? 0,
          assignee_status: profile?.status ?? 'active',
          assignee_last_login_at,
          assignee_last_login_days,
          assignee_is_inactive,
          my_role: item.my_role,
          days_open,
          // Compat aliases
          jira_key: item.issue_key || '',
          item_type: mapIssueType(item.issue_type || ''),
          issue_type_raw: item.issue_type || '',
          reporter_name: item.reporter_display_name ?? null,
          fixed_versions: fixVer,
          created_at: item.jira_created_at || '',
          assignee_is_active: !assignee_is_inactive,
        } as AgeingItem;
      });
    },
  });
}
