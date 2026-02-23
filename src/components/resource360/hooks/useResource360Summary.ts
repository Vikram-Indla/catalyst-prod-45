import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Resource360Summary } from '@/types/resource360';

/**
 * Fetches aggregated summary stats for a resource.
 * resourceId here is the short `rid` (e.g. "038") from the URL.
 * Falls back to resource_inventory if no Jira data exists.
 */
export function useResource360Summary(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['resource360-summary', resourceId],
    queryFn: async (): Promise<Resource360Summary | null> => {
      if (!resourceId) return null;

      // Try the aggregated view first (has Jira data)
      const { data, error } = await supabase
        .from('vw_wh_resource_360_summary' as any)
        .select('*')
        .eq('resource_id', resourceId)
        .maybeSingle();

      if (error) {
        console.error('[Resource360] Failed to fetch summary:', error.message);
        // Don't throw — fall through to fallback
      }

      if (data) return data as unknown as Resource360Summary;

      // Fallback: fetch basic info from resource_inventory directly
      const { data: ri, error: riErr } = await supabase
        .from('resource_inventory')
        .select('rid, name, role_name, department_name, profile_id')
        .eq('rid', resourceId)
        .maybeSingle();

      if (riErr || !ri) return null;

      // Fetch avatar from profiles if available
      let avatar_url: string | null = null;
      if ((ri as any).profile_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', (ri as any).profile_id)
          .maybeSingle();
        avatar_url = (profile as any)?.avatar_url ?? null;
      }

      return {
        resource_id: (ri as any).rid,
        name: (ri as any).name,
        email: '',
        role: (ri as any).role_name ?? '',
        department: (ri as any).department_name ?? '',
        avatar_url,
        total_items: 0,
        todo_count: 0,
        progress_count: 0,
        done_count: 0,
        hub_count: 0,
        project_count: 0,
      } as Resource360Summary;
    },
    enabled: !!resourceId,
    staleTime: 60_000,
  });
}
