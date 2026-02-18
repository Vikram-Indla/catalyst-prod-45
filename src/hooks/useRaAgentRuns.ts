import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RaAgentRun } from '@/types/requirement-assist';

export function useRaAgentRuns(documentId: string | undefined) {
  return useQuery({
    queryKey: ['ra-agent-runs', documentId],
    queryFn: async () => {
      if (!documentId) return [];
      const { data, error } = await (supabase as any)
        .from('ra_agent_runs')
        .select('*')
        .eq('document_id', documentId)
        .order('agent_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data as RaAgentRun[];
    },
    enabled: !!documentId,
  });
}
