import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useWatching(issueId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["watching", issueId, user?.id],
    enabled: !!issueId && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("issue_watchers")
        .select("id")
        .eq("issue_id", issueId)
        .eq("user_id", user!.id)
        .maybeSingle();
      const { count } = await supabase
        .from("issue_watchers")
        .select("*", { count: "exact", head: true })
        .eq("issue_id", issueId);
      return { isWatching: !!data, watcherCount: count ?? 0 };
    },
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      if (data?.isWatching) {
        await supabase.from("issue_watchers")
          .delete().eq("issue_id", issueId).eq("user_id", user.id);
      } else {
        await supabase.from("issue_watchers")
          .insert({ issue_id: issueId, user_id: user.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watching", issueId] });
      qc.invalidateQueries({ queryKey: ["watching-tab"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    isWatching: data?.isWatching ?? false,
    watcherCount: data?.watcherCount ?? 0,
    toggleWatch: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
