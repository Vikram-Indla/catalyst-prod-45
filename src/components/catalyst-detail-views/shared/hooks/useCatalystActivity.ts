/**
 * Canonical hook — fetches activity log for a work item with actor profiles.
 * Used by CatalystActivitySection.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PhActivityLog } from '../types';

export function useCatalystActivity(itemId: string, isOpen: boolean) {
  return useQuery({
    queryKey: ['cv-activity', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_activity_log')
        .select('id, work_item_id, action, field_name, old_value, new_value, user_id, metadata, created_at')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: false });
      if (!data?.length) return [] as PhActivityLog[];
      const userIds = [...new Set(data.map(e => e.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(e => ({
        ...e,
        actor: profileMap.get(e.user_id) ?? null,
      })) as unknown as PhActivityLog[];
    },
  });
}
