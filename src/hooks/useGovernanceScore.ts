import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useGovernanceScore() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["governance-score", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Step 1: Resolve Jira identity (same as AgeingTab)
      const { data: identityRows } = await supabase
        .from("jira_identity_map")
        .select("jira_account_id")
        .eq("catalyst_user_id", user!.id)
        .limit(1);

      let stale = 0;

      if (identityRows?.length) {
        const jiraAccountId = identityRows[0].jira_account_id;

        // Step 2: EXACT same query as AgeingTab — ph_issues, non-done, not deleted
        const { count } = await supabase
          .from("ph_issues")
          .select("*", { count: "exact", head: true })
          .eq("assignee_account_id", jiraAccountId)
          .neq("status_category", "done")
          .is("deleted_at", null);

        stale = count ?? 0;
      }

      // Step 3: Get breach streak from yesterday's governance_score record
      const yesterday = new Date(Date.now() - 86400_000).toISOString().split("T")[0];
      const { data: prev } = await supabase
        .from("governance_score")
        .select("breach_streak_days")
        .eq("user_id", user!.id)
        .eq("scan_date", yesterday)
        .maybeSingle();

      const streakYesterday = prev?.breach_streak_days ?? 0;
      const breachStreak = stale > 0 ? streakYesterday + 1 : 0;

      // Step 4: RAG thresholds aligned to ageing count
      const ragStatus =
        stale === 0 ? "green"
        : stale <= 20 ? "amber"
        : "red";

      return {
        ragStatus: ragStatus as "green" | "amber" | "red",
        staleCount: stale,
        breachStreak,
        scorePct: Math.max(0, 100 - Math.min(stale * 2, 100)),
      };
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
