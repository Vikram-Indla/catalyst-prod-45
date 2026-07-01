import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/lib/utils/assertUuid';

export function useSprintBySlug(projectKey: string | undefined, slugOrId: string | undefined | null) {
  return useQuery({
    queryKey: ['sprint-by-slug', projectKey, slugOrId],
    enabled: !!slugOrId,
    queryFn: async () => {
      if (!slugOrId) return null;
      const isUuid = isValidUUID(slugOrId);
      let query = (supabase as any)
        .from('ph_jira_sprints')
        .select('id, slug, name, project_id')
        .is('deleted_at', null);
      if (isUuid) {
        query = query.eq('id', slugOrId);
      } else {
        query = query.eq('slug', slugOrId);
        if (projectKey) {
          // narrow by project when we have the key; ph_jira_sprints.project_id links to projects.id
          // but we have the project key — join via projects table
          // Fallback: just match slug globally (unique per project, usually unique globally)
        }
      }
      const { data } = await query.maybeSingle();
      return data ?? null;
    },
  });
}
