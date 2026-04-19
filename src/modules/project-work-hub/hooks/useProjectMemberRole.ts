/**
 * useProjectMemberRole — resolves the current authenticated user's role
 * inside a project via ph_project_members.
 *
 * Used by F3 (Archive) to gate UI affordances (Archive button, archived
 * filter chip) on `admin` / `owner`. RLS still enforces the rule
 * server-side via `archived_at_update_admin_owner`; this hook is FE
 * cosmetic-gate only.
 *
 * Returns:
 *   role:        'admin' | 'owner' | 'member' | 'viewer' | null
 *   isAdminOrOwner: convenience boolean
 *   isLoading:   query state
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ProjectMemberRole = 'admin' | 'owner' | 'member' | 'viewer' | null;

interface UseProjectMemberRoleResult {
  role: ProjectMemberRole;
  isAdminOrOwner: boolean;
  isLoading: boolean;
}

export function useProjectMemberRole(projectKey: string | undefined | null): UseProjectMemberRoleResult {
  const { user } = useAuth();

  const { data: role = null, isLoading } = useQuery<ProjectMemberRole>({
    queryKey: ['ph-project-member-role', projectKey, user?.id],
    enabled: !!projectKey && !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      // Resolve project_id from key, then look up the membership row.
      const { data: proj } = await supabase
        .from('ph_projects')
        .select('id')
        .eq('key', projectKey!)
        .maybeSingle();
      if (!proj?.id) return null;

      const { data: member } = await supabase
        .from('ph_project_members')
        .select('role')
        .eq('project_id', proj.id)
        .eq('user_id', user!.id)
        .maybeSingle();

      return ((member?.role ?? null) as ProjectMemberRole);
    },
  });

  return {
    role,
    isAdminOrOwner: role === 'admin' || role === 'owner',
    isLoading,
  };
}
