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

      // Use raw query since table may not be in generated types yet
      const { data, error } = await supabase
        .from('idea_status_history' as 'acceptance_criteria')
        .select('*')
        .eq('idea_id' as 'story_id', ideaId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Status history not available:', error.message);
        return [];
      }
      
      // Cast the raw data
      const rows = data as unknown as Array<{
        id: string;
        idea_id: string;
        from_status: string | null;
        to_status: string;
        changed_by: string | null;
        change_reason: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>;

      return rows.map(row => ({
        id: row.id,
        idea_id: row.idea_id,
        from_status: row.from_status,
        to_status: row.to_status,
        changed_by: row.changed_by,
        change_reason: row.change_reason,
        metadata: row.metadata,
        created_at: row.created_at,
      })) as IdeaStatusHistory[];
    },
    enabled: !!ideaId,
  });
}
