/**
 * Canonical hook — fetches comments for a work item with author profiles.
 * Used by CatalystActivitySection.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PhComment } from '../types';

export function useCatalystComments(itemId: string, isOpen: boolean) {
  return useQuery({
    queryKey: ['cv-comments', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_comments')
        .select('id, work_item_id, body, author_id, created_at, updated_at')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: true });
      if (!data?.length) return [] as PhComment[];
      const authorIds = [...new Set(data.map(c => c.author_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', authorIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(c => ({
        ...c,
        author: profileMap.get(c.author_id) ?? null,
      })) as unknown as PhComment[];
    },
  });
}
