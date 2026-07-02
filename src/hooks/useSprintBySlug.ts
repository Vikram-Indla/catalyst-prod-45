import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/lib/utils/assertUuid';

export function useSprintBySlug(projectKey: string | undefined, slugOrId: string | undefined | null) {
  return useQuery({
    queryKey: ['sprint-by-slug', projectKey, slugOrId],
    enabled: !!slugOrId && !!projectKey,
    queryFn: async () => {
      if (!slugOrId || !projectKey) return null;
      const isUuid = isValidUUID(slugOrId);

      const { data: project } = await (supabase as any)
        .from('ph_projects')
        .select('id')
        .eq('key', projectKey)
        .maybeSingle();
      if (!project) return null;

      let query = (supabase as any)
        .from('ph_jira_sprints')
        .select('id, slug, name, project_id, deleted_at, name_mode, length_weeks, approval_policy, end_date')
        .is('deleted_at', null)
        .eq('project_id', project.id);
      query = isUuid ? query.eq('id', slugOrId) : query.eq('slug', slugOrId);

      const { data } = await query.maybeSingle();
      return data ?? null;
    },
  });
}
