// ============================================================
// IDEA STATUS HISTORY HOOK
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IdeaStatusHistory } from '@/types/improvement-ideas';

export function useIdeaStatusHistory(ideaId: string | undefined) {
  return useQuery({
    queryKey: ['idea-status-history', ideaId],
    queryFn: async (): Promise<IdeaStatusHistory[]> => {
      if (!ideaId) return [];

      // Query using raw SQL via RPC or direct table query
      const { data, error } = await supabase
        .rpc('get_idea_status_history', { p_idea_id: ideaId })
        .select('*');
      
      if (error) {
        // Fallback: return empty if table doesn't exist or RPC not available
        console.warn('Status history not available:', error.message);
        return [];
      }
      
      return (data || []) as IdeaStatusHistory[];
    },
    enabled: !!ideaId,
  });
}
