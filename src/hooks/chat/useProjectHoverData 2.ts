/**
 * useProjectHoverData — fetches project full name + members for hover card.
 *
 * Reads ph_projects (name, color) and ph_project_members → profiles
 * (full_name, avatar_url). Cached per project key.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectHoverMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface ProjectHoverData {
  key: string;
  name: string;
  color: string | null;
  members: ProjectHoverMember[];
}

export function useProjectHoverData(projectKey: string | null | undefined, enabled: boolean) {
  return useQuery<ProjectHoverData | null>({
    queryKey: ['chat-sidebar-project-hover', projectKey],
    enabled: !!projectKey && enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!projectKey) return null;

      const { data: project, error: pErr } = await supabase
        .from('ph_projects')
        .select('id, key, name, color')
        .eq('key', projectKey)
        .maybeSingle();

      if (pErr || !project) return null;

      const { data: memberRows } = await supabase
        .from('ph_project_members')
        .select('user_id')
        .eq('project_id', (project as any).id)
        .limit(50);

      const userIds = ((memberRows ?? []) as any[]).map((r) => r.user_id as string);

      let members: ProjectHoverMember[] = [];
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        members = ((profiles ?? []) as any[]).map((p) => ({
          user_id: p.id,
          full_name: p.full_name ?? null,
          avatar_url: p.avatar_url ?? null,
        }));
      }

      return {
        key: (project as any).key,
        name: (project as any).name,
        color: (project as any).color ?? null,
        members,
      };
    },
  });
}
