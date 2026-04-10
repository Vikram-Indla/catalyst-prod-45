import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useGovernanceScore() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["governance-score", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("governance_score")
        .select("rag_status,stale_count,breach_streak_days,score_pct")
        .eq("user_id", user!.id)
        .eq("scan_date", today)
        .maybeSingle();
      if (!data) {
        const { count } = await supabase
          .from("catalyst_issues")
          .select("*", { count: "exact", head: true })
          .eq("assignee_id", user!.id)
          .neq("status", "done")
          .lt("updated_at", new Date(Date.now() - 30 * 86400_000).toISOString());
        const stale = count ?? 0;
        return {
          ragStatus: stale === 0 ? "green" as const : stale <= 30 ? "amber" as const : "red" as const,
          staleCount: stale,
          breachStreak: 0,
          scorePct: Math.max(0, 100 - Math.min(stale, 100)),
        };
      }
      return {
        ragStatus: data.rag_status as "green" | "amber" | "red",
        staleCount: data.stale_count,
        breachStreak: data.breach_streak_days,
        scorePct: data.score_pct,
      };
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
