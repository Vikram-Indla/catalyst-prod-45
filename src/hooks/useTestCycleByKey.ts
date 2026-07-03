import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/lib/utils/assertUuid';

/** Resolves a cycleKey (e.g. "CY-001") or legacy UUID to a tm_test_cycles row. */
export function useTestCycleByKey(cycleKeyOrId: string | undefined | null, projectKey?: string) {
  return useQuery({
    queryKey: ['cycle-by-key', cycleKeyOrId, projectKey],
    enabled: !!cycleKeyOrId,
    queryFn: async () => {
      if (!cycleKeyOrId) return null;
      const isUuid = isValidUUID(cycleKeyOrId);
      let query = (supabase as any)
        .from('tm_test_cycles')
        .select('id, cycle_key, name, project_id');
      if (isUuid) {
        query = query.eq('id', cycleKeyOrId);
      } else {
        query = query.eq('cycle_key', cycleKeyOrId);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}
