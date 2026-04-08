import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { DigestItemV2, DigestResultV2, AiDigestResponseV2 } from "@/types/aiDigestV2";

export type { DigestItemV2 as DigestItem, DigestResultV2 as DigestResult };

async function fetchAiDigest(forceRefresh = false): Promise<AiDigestResponseV2> {
  const headers: Record<string, string> = {};
  if (forceRefresh) {
    headers['x-force-refresh'] = 'true';
  }
  const { data, error } = await supabase.functions.invoke("ai-digest", {
    method: "POST",
    body: {},
    headers,
  });
  if (error) throw error;
  return data as AiDigestResponseV2;
}

export function useAiDigest() {
  const { user } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ai-digest", user?.id],
    queryFn: () => fetchAiDigest(false),
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    digest: data?.digest ?? null,
    isEmpty: data?.empty ?? false,
    isLoading,
    isError: isError || !!data?.error,
    refetch,
  };
}

export function useForceRefreshDigest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const forceRefresh = async () => {
    const result = await fetchAiDigest(true);
    queryClient.setQueryData(["ai-digest", user?.id], result);
    return result;
  };

  return { forceRefresh };
}

export default useAiDigest;
