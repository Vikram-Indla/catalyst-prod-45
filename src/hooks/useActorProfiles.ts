import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActorProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

const profileCache = new Map<string, ActorProfile>();

async function fetchProfiles(ids: string[]): Promise<Map<string, ActorProfile>> {
  const uncached = ids.filter(id => !profileCache.has(id));
  if (uncached.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", uncached);
    if (data) {
      for (const p of data) {
        profileCache.set(p.id, p as ActorProfile);
      }
    }
  }
  const result = new Map<string, ActorProfile>();
  for (const id of ids) {
    const p = profileCache.get(id);
    if (p) result.set(id, p);
  }
  return result;
}

export function useActorProfiles(actorIds: string[]) {
  const uniqueIds = [...new Set(actorIds.filter(Boolean))];
  const key = uniqueIds.sort().join(",");

  return useQuery({
    queryKey: ["actor-profiles", key],
    queryFn: () => fetchProfiles(uniqueIds),
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
