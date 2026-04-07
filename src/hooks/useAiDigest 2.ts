import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DigestItem {
  priority: "HIGH" | "MED" | "LOW";
  title: string;
  detail: string;
  hub: string;
}

export interface DigestResult {
  summary: string;
  items: DigestItem[];
}

interface AiDigestResponse {
  digest: DigestResult | null;
  cached: boolean;
  empty?: boolean;
  error?: string;
}

async function fetchAiDigest(): Promise<AiDigestResponse> {
  const { data, error } = await supabase.functions.invoke("ai-digest", {
    method: "POST",
    body: {},
  });
  if (error) throw error;
  return data as AiDigestResponse;
}

export function useAiDigest() {
  const { user } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ai-digest", user?.id],
    queryFn: fetchAiDigest,
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 60 * 4, // 4 hours
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

export default useAiDigest;
